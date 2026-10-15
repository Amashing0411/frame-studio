#!/usr/bin/env node
// Capture exact reference frames from the film canvas, in headless Chrome, for several stories.
// Saves the canvas pixels (not a page screenshot), so frames can be compared byte for byte between builds.
//
//   node tools/capture-frames.mjs <url-or-html-file> [outDir] [--compare reference/frames/manifest.json] [--stories market,outbreak] [--safe off|youtube|tiktok|both]
// examples:
//   node tools/capture-frames.mjs http://localhost:4173/ qa/captures/frames --compare reference/frames/manifest.json
//   node tools/capture-frames.mjs reference/workshop-original.html qa/captures/original --stories market
// env: CHROME=<path to chrome.exe>
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { launch, sleep, seek, canvasPng, STUDIO_READY } from './lib/chrome.mjs';

// How to load each story. Market uses fixed times (the original Step 0 frames); the others use the middle of
// four spread-out shots so no frame sits on a cut.
const STORIES = {
  market: { load: `loadMarketDemo(true)`, times: [0, 9.5, 21, 30] },
  earthquake: { load: `document.getElementById('bq').click()`, validate: true },
  outbreak: { load: `document.getElementById('bz').click()`, validate: true },
  coast: { load: `(()=>{const s=document.getElementById('worldDemo');s.value='coast';document.getElementById('loadWorldDemo').click()})()`, validate: true },
};

const args = process.argv.slice(2);
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const manifestPath = opt('--compare');
const only = opt('--stories');
const safe = opt('--safe'); // off | youtube | tiktok | both (default: the app's default)
const [target, outArg] = args;
if (!target) { console.error('usage: node tools/capture-frames.mjs <url-or-html-file> [outDir] [--compare manifest.json] [--stories a,b]'); process.exit(1); }
const outDir = resolve(outArg || 'qa/captures/frames');
const names = only ? only.split(',') : Object.keys(STORIES);

const chrome = await launch();
await chrome.open(target);
await chrome.waitFor(STUDIO_READY);
await sleep(1500);
if (safe) await chrome.evaluate(`UI.safeZone=${JSON.stringify(safe)}`);
const gpu = await chrome.evaluate(`(()=>{const gl=renderer.getContext(),d=gl.getExtension('WEBGL_debug_renderer_info');return d?gl.getParameter(d.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})()`);
console.log('gpu:', gpu);
mkdirSync(outDir, { recursive: true });

const frames = [], stories = {};
for (const name of names) {
  const story = STORIES[name];
  if (!story) throw new Error(`unknown story ${name}`);
  // Load explicitly so the result never depends on autosaved state.
  await chrome.evaluate(story.load);
  await sleep(500);
  if (story.validate) { await chrome.evaluate(`document.getElementById('bv').click()`); await sleep(500); }
  await chrome.waitFor('!seeking', 120000);
  const info = await chrome.evaluate(`({title:SC?.meta?.title,end:END,shots:shots.map(s=>[s.t0,s.t1]),
    canvas:[document.getElementById('output').width,document.getElementById('output').height]})`);
  const n = info.shots.length;
  const times = story.times || (n >= 4
    ? [0, Math.floor(n / 3), Math.floor(2 * n / 3), n - 1].map(i => Math.round(info.shots[i][0] + info.shots[i][1]) / 2)
    : [0.12, 0.37, 0.62, 0.87].map(f => Math.round(f * info.end * 2) / 2));
  stories[name] = { title: info.title, end: info.end, shots: info.shots.length, canvas: info.canvas, times };
  console.log(`${name}: "${info.title}" ${info.end}s, frames at ${times.join(', ')}s`);
  for (const t of times) {
    await seek(chrome, t);
    await sleep(300);
    const png = await canvasPng(chrome);
    const file = `${name}-${String(Math.round(t * 100)).padStart(4, '0')}.png`;
    writeFileSync(join(outDir, file), png);
    const timecode = await chrome.evaluate(`document.getElementById('timeRead').textContent`);
    const sha256 = createHash('sha256').update(png).digest('hex');
    frames.push({ story: name, file, time: t, timecode, sha256 });
    console.log(`  saved ${file} at ${timecode}  sha256 ${sha256.slice(0, 16)}`);
  }
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ page: target.split(/[\\/]/).pop() || target, gpu, chrome: chrome.version, stories, frames }, null, 2) + '\n');
console.log(chrome.errors.length ? `page errors (${chrome.errors.length}):\n  ${chrome.errors.slice(0, 8).join('\n  ')}` : 'page errors: none');

let failed = chrome.errors.length > 0;
if (manifestPath) {
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8')).frames.filter(e => names.includes(e.story || 'market'));
  // The film target is multisampled: now and then a couple of edge pixels resolve one level apart between identical
  // runs. A frame whose hash differs still matches if at most 20 pixels differ, by at most 2 levels.
  const near = async (a, b) => chrome.evaluate(`(async()=>{const load=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=u});
    const [x,y]=await Promise.all([load(${JSON.stringify('data:image/png;base64,' + a.toString('base64'))}),load(${JSON.stringify('data:image/png;base64,' + b.toString('base64'))})]);
    if(x.width!==y.width||x.height!==y.height)return{px:-1,max:255};const px=im=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);return g.getImageData(0,0,c.width,c.height).data};
    const p=px(x),q=px(y);let n=0,m=0;for(let i=0;i<p.length;i+=4){const d=Math.max(Math.abs(p[i]-q[i]),Math.abs(p[i+1]-q[i+1]),Math.abs(p[i+2]-q[i+2]));if(d){n++;if(d>m)m=d}}return{px:n,max:m}})()`);
  let same = 0;
  for (const e of expected) {
    const got = frames.find(f => f.file === e.file);
    let ok = got?.sha256 === e.sha256, tag = ok ? 'MATCH    ' : got ? 'DIFFERENT' : 'MISSING  ', note = '';
    if (got && !ok) {
      const d = await near(readFileSync(join(outDir, got.file)), readFileSync(join(dirname(resolve(manifestPath)), e.file)));
      note = ` (${d.px} pixels differ, by up to ${d.max})`;
      if (d.px >= 0 && d.px <= 20 && d.max <= 2) { ok = true; tag = 'NEAR     '; }
    }
    if (ok) same++; else failed = true;
    console.log(`${tag} ${e.file}${note}`);
  }
  console.log(`${same}/${expected.length} frames match ${manifestPath}`);
}
chrome.close();
process.exit(failed ? 1 : 0);
