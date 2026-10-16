#!/usr/bin/env node
// Frame cost probe: for each story, at a few moments, draws the film frame repeatedly and reports draw calls and
// triangles (whole frame and shadow pass), plus GPU-synced milliseconds per frame (median of 40) and per simulation step.
//   node tools/perf-probe.mjs [url] [--only market,earthquake] [--json out.json]
import { writeFileSync } from 'node:fs';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null };
const jsonOut = flag('--json'), only = flag('--only'), url = args[0] || 'http://localhost:5173/';
const STORIES = {
  market: [`loadMarketDemo(true)`, false], earthquake: [`document.getElementById('bq').click()`, true],
  outbreak: [`document.getElementById('bz').click()`, true],
  coast: [`(()=>{const s=document.getElementById('worldDemo');s.value='coast';document.getElementById('loadWorldDemo').click()})()`, true],
};
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1000);
const out = {};
for (const name of only ? only.split(',') : Object.keys(STORIES)) {
  const [load, validate] = STORIES[name];
  await c.evaluate(load); await sleep(800); await c.waitFor('!seeking', 120000);
  if (validate) { await c.evaluate(`document.getElementById('bv').click()`); await sleep(800); await c.waitFor('!seeking', 120000); }
  const end = await c.evaluate('END'), rows = [];
  for (const f of [.2, .5, .8]) {
    await seek(c, +(end * f).toFixed(2));
    rows.push(await c.evaluate(`(()=>{const gl=renderer.getContext(),px=new Uint8Array(4),sync=()=>gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);
      const measure=()=>{renderer.info.autoReset=false;renderer.info.reset();renderFilm();const r={calls:renderer.info.render.calls,tris:renderer.info.render.triangles};renderer.info.autoReset=true;
        sync();const d=[];for(let i=0;i<40;i++){const t0=performance.now();renderFilm();sync();d.push(performance.now()-t0)}d.sort((a,b)=>a-b);r.ms=+d[20].toFixed(2);return r};
      const all=measure(),was=sun.castShadow;sun.castShadow=false;renderer.shadowMap.needsUpdate=true;const noShadow=measure();sun.castShadow=was;renderer.shadowMap.needsUpdate=true;
      let simMs=0;{const t0=performance.now();simulating=true;for(let i=0;i<30;i++){stepCount++;step(1/60,stepCount/60)}simulating=false;simMs=+((performance.now()-t0)/30).toFixed(2)}
      let people=0,bodyMeshes=0;scene.traverse(o=>{if(o.userData?.castBody)people++;if(o.isSkinnedMesh&&o.visible)bodyMeshes++});
      return {t:T,calls:all.calls,shadowCalls:all.calls-noShadow.calls,tris:all.tris,shadowTris:all.tris-noShadow.tris,ms:all.ms,msNoShadow:noShadow.ms,simMs,skinnedVisible:bodyMeshes}})()`));
  }
  out[name] = rows;
  console.log(`\n== ${name}`); for (const r of rows) console.log(`  t=${r.t.toFixed(1)}s  calls ${r.calls} (shadow ${r.shadowCalls})  tris ${(r.tris / 1000).toFixed(0)}k (shadow ${(r.shadowTris / 1000).toFixed(0)}k)  draw ${r.ms} ms (no shadow ${r.msNoShadow} ms)  step ${r.simMs} ms  skinned meshes ${r.skinnedVisible}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 1));
if (c.errors.length) console.log('page errors:', c.errors.slice(0, 3).join(' | '));
c.close(); process.exit(0);
