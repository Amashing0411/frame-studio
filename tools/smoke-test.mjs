#!/usr/bin/env node
// Real-browser smoke test of the studio: boot, playback, navigation, every built-in story and world simulated to the
// end, a short frame-by-frame video export (WebM and MP4), project save and PNG snapshot. Fails on any page error.
//
//   node tools/smoke-test.mjs <url-or-html-file> [results.json]
// Run it against two builds and compare the JSON files: deterministic fields (end-frame hashes, durations,
// counts) must match. Downloads are intercepted in the page, so nothing is written to your Downloads folder.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { launch, sleep, seek, canvasPng, STUDIO_READY } from './lib/chrome.mjs';

const [target, outFile] = process.argv.slice(2);
if (!target) { console.error('usage: node tools/smoke-test.mjs <url-or-html-file> [results.json]'); process.exit(1); }
const sha = buf => createHash('sha256').update(buf).digest('hex').slice(0, 16);
const results = { target, checks: [], stories: [], exports: [] };
let failed = 0;
const check = (name, ok, detail = '') => { results.checks.push({ name, ok, detail }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };

const chrome = await launch();
const { evaluate, waitFor } = chrome;
await chrome.open(target);
await waitFor(STUDIO_READY);
await sleep(1500);
results.chrome = chrome.version;

// Test harness only: capture downloads in the page instead of saving files.
await evaluate(`(()=>{window.__downloads=[];const blobs=new Map(),mk=URL.createObjectURL.bind(URL);
  URL.createObjectURL=b=>{const u=mk(b);blobs.set(u,b);return u};
  HTMLAnchorElement.prototype.click=function(){if(this.download){window.__downloads.push({name:this.download,blob:blobs.get(this.href)||null});return}};
  return true})()`);
const lastDownload = () => evaluate(`(()=>{const d=__downloads.at(-1);return d?{name:d.name,type:d.blob?.type||'',size:d.blob?.size||0}:null})()`);

// 1. Boot
const boot = await evaluate(`({status:document.getElementById('status').textContent,title:SC?.meta?.title,end:END,shots:shots?.length,
  assets:document.getElementById('assetCount').textContent,docTitle:document.title})`);
results.boot = boot;
check('boots with the market story loaded', boot.title === 'The eight-armed customer' && boot.end === 44 && boot.shots === 10, JSON.stringify(boot));
check('asset catalog populated', +boot.assets > 0, `assets ${boot.assets}`);
// the people cast (assets/manifest.json) loaded: without it people silently fall back to procedural bodies
const cast = await evaluate(`({ready: typeof CAST !== 'undefined' && CAST.ready, models: typeof CAST !== 'undefined' ? CAST.src.size : 0, clipSets: typeof CAST !== 'undefined' ? Object.keys(CAST.clips).length : 0})`);
check('people cast assets loaded', cast.ready && cast.models > 0 && cast.clipSets > 0, JSON.stringify(cast));

// 2. Playback
await seek(chrome, 0);
const before = sha(await canvasPng(chrome));
await evaluate(`document.getElementById('bp').click()`);
await sleep(2500);
await evaluate(`document.getElementById('bp').click()`);
await sleep(300);
const played = await evaluate('T');
const after = sha(await canvasPng(chrome));
check('Play advances the film and the picture', played > 0.5 && before !== after, `T=${played.toFixed(2)}s`);

// 3. Shot navigation
const shot1 = await evaluate(`document.getElementById('shotName').textContent`);
await evaluate(`document.getElementById('nextShot').click()`);
await sleep(600);
const shot2 = await evaluate(`document.getElementById('shotName').textContent`);
check('Next shot changes the selected shot', shot1 !== shot2, `"${shot1}" -> "${shot2}"`);

// 4. Tabs and views
// the four side tabs, then every inspector the code opens by name (tabInspector / tabLeft route into Shot and More)
const tabs = await evaluate(`(()=>{const r=[],shown=el=>!!el&&el.getClientRects().length>0;
  for(const b of document.querySelectorAll('.paneltabs [data-panel]')){b.click();r.push([b.dataset.panel,document.getElementById('panel-'+b.dataset.panel).classList.contains('active')&&b.classList.contains('on')])}
  for(const k of ['shot','model','audio','look','export']){tabInspector(k);r.push(['inspector-'+k,shown(document.getElementById('inspector-'+k))])}
  for(const k of ['scenario','library']){tabLeft(k);r.push(['left-'+k,shown(document.getElementById('left-'+k))])}
  return r})()`);
check('every side tab and every inspector opens', tabs.length === 11 && tabs.every(t => t[1]), tabs.map(t => `${t[0]}:${t[1] ? 'ok' : 'NO'}`).join(' '));
const guide = await evaluate(`(()=>{showPanel('guide');const g=document.getElementById('guide');return {sections:g.querySelectorAll('.guide-sec').length,items:g.querySelectorAll('.guide-sec button').length,people:g.querySelector('.guide-counts b')?.textContent}})()`);
check('Guide lists what the engine offers', guide.sections >= 6 && guide.items > 30 && guide.people === '21', JSON.stringify(guide));
// the free What if… writer: a sentence becomes a checked, playable film (no AI, no network)
const whatif = await evaluate(`(async()=>{$('whatifPrompt').value='What if a typhoon flooded Pasig at night?';await makeWhatIfFilm(false);return {ok:validatedSource===$('ta').value,hazard:SC.hazard.type,shots:shots.length,errors:(validation.e||[]).length,title:SC.meta.title}})()`);
await waitFor('!seeking', 120000);
check('the free What if writer makes a valid film from a sentence', whatif.ok && whatif.hazard === 'flood' && whatif.shots >= 8 && !whatif.errors, JSON.stringify(whatif));
await evaluate(`tabLeft('library');document.querySelector('#left-library .asset-item')?.click();
  document.querySelector('[data-view=asset]').click()`);
await sleep(1500);
// The asset canvas does not keep its drawing buffer, and a frame ends with a 2-triangle composite pass,
// so record the largest draw the asset renderer makes over one second (test harness wrapper, removed afterwards).
const assetView = await evaluate(`new Promise(ok=>{const r=assetRenderer,orig=r.render;let calls=0,triangles=0;
  r.render=function(s,c){orig.call(this,s,c);calls++;triangles=Math.max(triangles,this.info.render.triangles)};
  setTimeout(()=>{r.render=orig;ok({active:document.getElementById('assetView').classList.contains('active'),selected:document.getElementById('selectedName').textContent,calls,maxTriangles:triangles})},1000)})`);
check('Asset studio view renders', assetView.active && assetView.calls > 0 && assetView.maxTriangles > 100, JSON.stringify(assetView));
await evaluate(`document.querySelector('[data-view=film]').click()`);
await sleep(300);

// 4b. Safe zones: every mode switches the guides, and the guides never change the exported picture
await evaluate(`loadMarketDemo(true)`); await sleep(500); await waitFor('!seeking', 120000); await seek(chrome, 9.5);
// guides start hidden (UI.zoneGuides); turn them on with the film's eye button
await evaluate(`(()=>{if(!document.getElementById('showSafe').checked)document.getElementById('guidesToggle').click()})()`);
const zones = [];
for (const mode of ['off', 'youtube', 'tiktok', 'both']) {
  await evaluate(`(()=>{const s=document.getElementById('safeZone');s.value='${mode}';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await waitFor('!seeking', 120000); await seek(chrome, 9.5);
  const guides = await evaluate(`!document.getElementById('safeCanvas').hidden`);
  await evaluate(`document.getElementById('showSafe').click()`); await sleep(150); const filmA = sha(await canvasPng(chrome));
  await evaluate(`document.getElementById('showSafe').click()`); await sleep(150); const filmB = sha(await canvasPng(chrome));
  zones.push({ mode, guides, sameFilm: filmA === filmB });
}
check('safe-zone selector shows guides for every platform and none for Off', zones.every(z => z.guides === (z.mode !== 'off')), JSON.stringify(zones.map(z => z.mode + ':' + z.guides)));
check('safe-zone guides never change the exported film frame', zones.every(z => z.sameFilm), JSON.stringify(zones.map(z => z.mode + ':' + z.sameFilm)));
await evaluate(`(()=>{const s=document.getElementById('safeZone');s.value='both';s.dispatchEvent(new Event('change',{bubbles:true}))})()`); await waitFor('!seeking', 120000);

// 5. Every built-in story and world, simulated to its last frame
const stories = [
  ['market (creature)', `loadMarketDemo(true)`],
  ['market (plain)', `loadMarketDemo(false)`],
  ['earthquake', `document.getElementById('bq').click()`],
  ['outbreak', `document.getElementById('bz').click()`],
  ...['coast', 'city', 'jungle', 'ocean', 'sky', 'custom'].map(w =>
    [`world: ${w}`, `(()=>{const s=document.getElementById('worldDemo');s.value='${w}';s.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('loadWorldDemo').click()})()`]),
];
for (const [name, load] of stories) {
  const errs = chrome.errors.length;
  await evaluate(load);
  await sleep(800);
  await waitFor('!seeking', 120000);
  // Samples and worlds fill the JSON box; Validate compiles it (the market demo validates itself).
  if (!name.startsWith('market')) { await evaluate(`document.getElementById('bv').click()`); await sleep(800); await waitFor('!seeking', 120000); }
  const end = await evaluate('END');
  const t0 = Date.now();
  await seek(chrome, end);
  const r = await evaluate(`({title:SC?.meta?.title||'',end:END,shots:shots?.length||0,t:T,status:document.getElementById('status').textContent})`);
  const row = { name, ...r, endFrame: sha(await canvasPng(chrome)), simulateMs: Date.now() - t0, newErrors: chrome.errors.length - errs };
  results.stories.push(row);
  check(`${name}: simulates to the end`, r.shots > 0 && Math.abs(r.t - end) < 1e-6 && row.newErrors === 0,
    `"${r.title}" ${r.shots} shots, ${end}s, end frame ${row.endFrame}`);
}

// 6. Short frame-by-frame export (2-second scenario cut from the earthquake sample)
await evaluate(`(()=>{const j=JSON.parse(JSON.stringify(SQ));j.meta.title='Smoke test clip';j.meta.length_s=2;
  const c=j.chapters[0];c.shots=[{...c.shots[0],t0:0,t1:2}];j.chapters=[c];document.getElementById('ta').value=JSON.stringify(j,null,2);
  document.getElementById('bv').click()})()`);
await sleep(800);
const clipEnd = await evaluate('END');
for (const format of ['webm', 'mp4']) {
  await evaluate(`(()=>{const v=(id,x)=>{const e=document.getElementById(id);e.value=x;e.dispatchEvent(new Event('change',{bubbles:true}))};
    v('exportMethod','frames');v('exportRes','540');v('exportFps','24');v('exportFormat','${format}');__downloads.length=0;
    document.getElementById('exportVideo').click()})()`);
  try { await waitFor(`__downloads.length>0||/unavailable|unsupported|failed/i.test(document.getElementById('exportStatus').textContent)`, 180000); } catch {}
  await waitFor('!recording', 60000).catch(() => {});
  const d = await lastDownload();
  const status = await evaluate(`document.getElementById('exportStatus').textContent`);
  let meta = null;
  if (d) meta = await evaluate(`new Promise(ok=>{const b=__downloads.at(-1).blob,v=document.createElement('video');v.muted=true;v.preload='metadata';
    v.onloadedmetadata=()=>ok({duration:+v.duration.toFixed(3),w:v.videoWidth,h:v.videoHeight});v.onerror=()=>ok({error:v.error?.message||'decode error'});
    v.src=URL.createObjectURL(b);setTimeout(()=>ok({error:'metadata timeout'}),15000)})`);
  const row = { format, file: d?.name || null, type: d?.type || null, size: d?.size || 0, ...meta, status };
  results.exports.push(row);
  if (!d && /unavailable|unsupported/i.test(status)) { console.log(`SKIP  ${format} export: not supported by this browser ("${status}")`); continue; }
  check(`${format} export produces a playable ${clipEnd}s video`, !!d && row.size > 1000 && Math.abs((meta?.duration ?? 0) - clipEnd) < 0.05,
    `${row.file} ${row.size} bytes, ${meta?.duration}s, ${meta?.w}x${meta?.h}`);
}

// 7. Save project and PNG snapshot
await evaluate(`__downloads.length=0;document.getElementById('saveProject').click()`);
await sleep(1500);
const save = await lastDownload();
check('Save project downloads a project file', !!save && save.size > 100, JSON.stringify(save));
await evaluate(`__downloads.length=0;document.getElementById('snapshot').click()`);
await sleep(1500);
const png = await lastDownload();
check('PNG button saves the current frame', !!png && png.type === 'image/png' && png.size > 1000, JSON.stringify(png));

// 8. Console
results.errors = chrome.errors;
results.warnings = chrome.warnings.length;
check('no page errors', chrome.errors.length === 0, chrome.errors.slice(0, 5).join(' | '));
if (outFile) { mkdirSync(dirname(outFile), { recursive: true }); writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n'); }
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
chrome.close();
process.exit(failed ? 1 : 0);
