#!/usr/bin/env node
// Loads every file listed in public/assets/manifest.json with the engine's own GLTFLoader (three r128) in the studio
// page, and fails if any does not load or lacks what the engine needs (skeleton bones, clips, face morph targets).
//   node tools/check-assets.mjs [url]
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/'] = process.argv.slice(2);
const c = await launch();
await c.open(url); await c.waitFor(STUDIO_READY); await sleep(500);
const r = await c.evaluate(`(async () => {
  const m = await (await fetch('assets/manifest.json')).json(), out = [];
  const load = u => new Promise((ok, fail) => new THREE.GLTFLoader().load('assets/' + u, ok, undefined, fail));
  for (const [f, d] of Object.entries(m.people.families)) {
    try { const g = await load(d.anim); const names = g.animations.map(a => a.name), missing = d.clips.filter(n => !names.includes(n)); out.push({ file: d.anim, ok: !missing.length, detail: missing.length ? 'missing clips ' + missing.join(',') : g.animations.length + ' clips' }); }
    catch (e) { out.push({ file: d.anim, ok: false, detail: String(e.message || e) }); }
  }
  for (const [id, d] of Object.entries(m.people.models)) {
    try {
      const g = await load(d.file); let bones = 0, morphs = 0; g.scene.traverse(o => { if (o.isBone) bones++; if (o.morphTargetDictionary) morphs++; });
      const need = ['Body', 'Hips', 'Head', 'FootL', 'FootR'].filter(n => !g.scene.getObjectByName(n));
      const ok = !need.length && (!d.face || morphs > 0);
      out.push({ file: d.file, ok, detail: need.length ? 'missing bones ' + need.join(',') : bones + ' bones, ' + morphs + ' morph meshes' });
    } catch (e) { out.push({ file: d.file, ok: false, detail: String(e.message || e) }); }
  }
  for (const [id, d] of Object.entries(m.psx || {})) {
    try { const g = await load(d.file); let meshes = 0; g.scene.traverse(o => { if (o.isMesh) meshes++; }); out.push({ file: d.file, ok: meshes > 0, detail: meshes + ' meshes' }); }
    catch (e) { out.push({ file: d.file, ok: false, detail: String(e.message || e) }); }
  }
  return out;
})()`);
let failed = 0;
for (const x of r) { if (!x.ok) failed++; console.log(`${x.ok ? 'OK  ' : 'FAIL'} ${x.file.padEnd(28)} ${x.detail}`); }
console.log(failed ? `${failed} asset(s) FAILED` : `all ${r.length} assets load`);
c.close(); process.exit(failed ? 1 : 0);
