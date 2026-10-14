#!/usr/bin/env node
// Capture exact reference frames of the market story from the film canvas, in headless Chrome.
// Saves the canvas pixels (not a page screenshot), so frames can be compared byte for byte between builds.
//
//   node tools/capture-frames.mjs [page.html] [outDir]
// defaults: film-studio-workshop.html → reference/frames
// env: TIMES="0,9.5,21,30"  CHROME=<path to chrome.exe>  STORY=creature|plain
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const page = resolve(process.argv[2] || 'film-studio-workshop.html');
const outDir = resolve(process.argv[3] || 'reference/frames');
const times = (process.env.TIMES || '0,9.5,21,30').split(',').map(Number);
const creature = (process.env.STORY || 'creature') !== 'plain';

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  for (const p of ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'])
    if (existsSync(p)) return p;
  throw new Error('No Chrome found: set CHROME=<path>');
}

const port = 9300 + Math.floor(Math.random() * 600), profile = join(tmpdir(), `frames-${process.pid}-${port}`);
const chrome = spawn(findChrome(), ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit',
  '--allow-file-access-from-files', `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, '--window-size=1600,900', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
const cleanup = () => { try { chrome.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);

let version;
for (let i = 0; i < 150 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await sleep(100); } }
if (!version) { console.error('Chrome did not start'); process.exit(1); }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let seq = 0; const pending = new Map(), errors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result); }
  else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
};
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => { const id = ++seq; pending.set(id, { ok, fail }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const cdp = (m, p) => send(m, p, sessionId);
await cdp('Page.enable'); await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const evaluate = async expr => {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};

await cdp('Page.navigate', { url: pathToFileURL(page).href });
let ready = false;
for (let i = 0; i < 300 && !ready; i++) { await sleep(200); ready = await evaluate(`(()=>{try{return document.readyState==='complete'&&typeof seekFilm==='function'&&typeof loadMarketDemo==='function'&&!seeking}catch{return false}})()`); }
if (!ready) { console.error('Studio never became ready'); process.exit(1); }
await sleep(1500);
// Load the story explicitly so the result never depends on autosaved state.
await evaluate(`loadMarketDemo(${creature})`);
await sleep(500);
const info = await evaluate(`(()=>{const gl=renderer.getContext(),d=gl.getExtension('WEBGL_debug_renderer_info');
  return {title:SC?.meta?.title||document.getElementById('sequenceName').textContent,end:END,shots:SC?.shots?.length,
  canvas:[document.getElementById('output').width,document.getElementById('output').height],
  gpu:d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}})()`);
console.log('story:', JSON.stringify(info));

mkdirSync(outDir, { recursive: true });
const frames = [];
for (const t of times) {
  await evaluate(`seekFilm(${t})`);
  for (let i = 0; i < 100 && await evaluate('seeking'); i++) await sleep(100);
  await sleep(300);
  const png = Buffer.from((await evaluate(`document.getElementById('output').toDataURL('image/png')`)).split(',')[1], 'base64');
  const name = `market-${String(Math.round(t * 100)).padStart(4, '0')}.png`;
  writeFileSync(join(outDir, name), png);
  const shot = await evaluate(`document.getElementById('timeRead').textContent`);
  const sha256 = createHash('sha256').update(png).digest('hex');
  frames.push({ file: name, time: t, timecode: shot, sha256 });
  console.log(`saved ${name} at ${shot}  sha256 ${sha256.slice(0, 16)}`);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ page: page.split(/[\\/]/).pop(), story: info, chrome: version.Browser, frames }, null, 2) + '\n');
if (errors.length) console.log(`page errors (${errors.length}):\n  ` + errors.slice(0, 8).join('\n  '));
else console.log('page errors: none');
ws.close(); cleanup(); process.exit(0);
