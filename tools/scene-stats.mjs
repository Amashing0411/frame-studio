#!/usr/bin/env node
// Scene and render statistics at every reference frame: meshes (visible / hidden), unique materials and geometries,
// GPU memory counts and the real draw calls + triangles of one rendered frame (all passes summed).
//
//   node tools/scene-stats.mjs <url-or-html-file> [out.json] [--budget perf/budgets.json]
// With --budget it fails when any story exceeds its budget. Uses the stories and times of reference/frames/manifest.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2);
const bi = args.indexOf('--budget');
const budgetPath = bi >= 0 ? args.splice(bi, 2)[1] : null;
const [target, outFile] = args;
if (!target) { console.error('usage: node tools/scene-stats.mjs <url-or-html-file> [out.json] [--budget perf/budgets.json]'); process.exit(1); }

const LOAD = {
  market: `loadMarketDemo(true)`,
  earthquake: `document.getElementById('bq').click()`,
  outbreak: `document.getElementById('bz').click()`,
  coast: `(()=>{const s=document.getElementById('worldDemo');s.value='coast';document.getElementById('loadWorldDemo').click()})()`,
};
const manifest = JSON.parse(readFileSync('reference/frames/manifest.json', 'utf8'));

// Runs in the page. Counts what is in the scene and what one renderCurrent() actually draws.
const MEASURE = `(()=>{let meshes=0,visible=0,hidden=0;const mats=new Set(),geos=new Set();
  scene.traverse(o=>{if(!o.isMesh&&!o.isPoints&&!o.isLine&&!o.isSprite)return;meshes++;
    let v=true;for(let p=o;p;p=p.parent)if(!p.visible){v=false;break}v?visible++:hidden++;
    (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m&&mats.add(m));if(o.geometry)geos.add(o.geometry)});
  // Count real WebGL draw commands during one frame (the film's post-processing renders several passes).
  const r=renderer,gl=r.getContext(),fns=['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced'],saved={};let calls=0,triangles=0;
  for(const n of fns){if(!gl[n])continue;saved[n]=gl[n];gl[n]=function(...a){calls++;
    const inst=n==='drawArraysInstanced'?a[3]:n==='drawElementsInstanced'?a[4]:1;if(a[0]===gl.TRIANGLES)triangles+=a[n.startsWith('drawArrays')?2:1]/3*inst;
    return saved[n].apply(this,a)}}
  try{renderCurrent()}finally{for(const n in saved)gl[n]=saved[n]}
  return {objects:meshes,visible,hidden,materials:mats.size,geometries:geos.size,gpuGeometries:r.info.memory.geometries,
    textures:r.info.memory.textures,programs:r.info.programs?.length||0,drawCalls:calls,triangles:Math.round(triangles)}})()`;

const chrome = await launch();
await chrome.open(target);
await chrome.waitFor(STUDIO_READY);
await sleep(1500);
const result = { target, stories: {} };
for (const [story, info] of Object.entries(manifest.stories)) {
  await chrome.evaluate(LOAD[story]);
  await sleep(500);
  if (story !== 'market') { await chrome.evaluate(`document.getElementById('bv').click()`); await sleep(500); }
  await chrome.waitFor('!seeking', 120000);
  const frames = [];
  for (const t of info.times) { await seek(chrome, t); frames.push({ t, ...(await chrome.evaluate(MEASURE)) }); }
  const max = k => Math.max(...frames.map(f => f[k]));
  result.stories[story] = { max: Object.fromEntries(Object.keys(frames[0]).filter(k => k !== 't').map(k => [k, max(k)])), frames };
  const m = result.stories[story].max;
  console.log(`${story.padEnd(10)} objects ${m.objects} (visible ${m.visible}, hidden ${m.hidden})  materials ${m.materials}  geometries ${m.geometries}  draw calls ${m.drawCalls}  triangles ${m.triangles.toLocaleString()}  textures ${m.textures}  programs ${m.programs}`);
}
result.errors = chrome.errors;
if (outFile) { mkdirSync(dirname(outFile), { recursive: true }); writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n'); }
let failed = chrome.errors.length > 0;
if (budgetPath) {
  const budgets = JSON.parse(readFileSync(budgetPath, 'utf8')).stories;
  for (const [story, limits] of Object.entries(budgets)) for (const [k, limit] of Object.entries(limits)) {
    const v = result.stories[story]?.max[k];
    const ok = v !== undefined && v <= limit;
    if (!ok) failed = true;
    if (!ok || process.env.VERBOSE) console.log(`${ok ? 'OK  ' : 'OVER'}  ${story} ${k}: ${v} / budget ${limit}`);
  }
  console.log(failed ? 'budget check FAILED' : 'all stories within budget');
}
console.log(chrome.errors.length ? `page errors: ${chrome.errors.slice(0, 5).join(' | ')}` : 'page errors: none');
chrome.close();
process.exit(failed ? 1 : 0);
