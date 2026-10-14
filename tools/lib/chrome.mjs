// Minimal headless Chrome over the DevTools Protocol (no dependencies; Node 22+ has fetch and WebSocket).
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export { sleep };

export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'])
    if (existsSync(p)) return p;
  throw new Error('No Chrome found: set CHROME=<path>');
}

// A URL stays as is; anything else is treated as a local file path.
export const toUrl = target => /^(https?|file):/.test(target) ? target : pathToFileURL(resolve(target)).href;

export async function launch({ width = 1600, height = 900 } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600), profile = join(tmpdir(), `fs-chrome-${process.pid}-${port}`);
  const chrome = spawn(findChrome(), ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit',
    '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', `--remote-debugging-port=${port}`,
    '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const close = () => { try { chrome.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  process.on('exit', close);

  let version;
  for (let i = 0; i < 150 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(100); } }
  if (!version) throw new Error('Chrome did not start');
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let seq = 0; const pending = new Map(), errors = [], warnings = [], listeners = new Map();
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method && listeners.has(m.method)) for (const cb of listeners.get(m.method)) cb(m.params);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); }
    else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'warning') warnings.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`.trim());
  };
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, { ok, fail }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (m, p) => send(m, p, sessionId);
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const evaluate = async expr => {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result?.value;
  };
  const waitFor = async (expr, timeoutMs = 60000) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) { if (await evaluate(`(()=>{try{return !!(${expr})}catch{return false}})()`)) return true; await sleep(100); }
    throw new Error(`timed out waiting for: ${expr}`);
  };
  const open = async target => {
    await cdp('Page.navigate', { url: toUrl(target) });
    await waitFor(`document.readyState==='complete'`);
  };
  const screenshot = async () => Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  const on = (method, cb) => listeners.set(method, [...(listeners.get(method) || []), cb]);
  return { cdp, evaluate, waitFor, open, screenshot, on, errors, warnings, version: version.Browser, close: () => { ws.close(); close(); } };
}

// Studio helpers shared by the tools.
export const STUDIO_READY = `typeof seekFilm==='function'&&typeof loadMarketDemo==='function'&&!seeking`;
export async function seek(chrome, t) {
  await chrome.evaluate(`seekFilm(${t})`);
  await chrome.waitFor('!seeking', 120000);
}
export const canvasPng = async chrome =>
  Buffer.from((await chrome.evaluate(`document.getElementById('output').toDataURL('image/png')`)).split(',')[1], 'base64');
