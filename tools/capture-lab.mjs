#!/usr/bin/env node
// Model Lab capture: loads the studio, injects lab/model-lab.js and renders every candidate's turntable views to PNG,
// plus a stats file (triangles, draw calls, materials).
//   node tools/capture-lab.mjs [url] [outDir] [candidate,candidate...]
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/', outArg = 'qa/captures/lab', only] = process.argv.slice(2);
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const root = resolve(import.meta.dirname, '..');
const names = only ? only.split(',') : ['vendor-A', 'vendor-B', 'vendor-C', 'vendor-C2', 'octopus-A', 'octopus-B', 'octopus-C'];

const c = await launch();
await c.open(url); await c.waitFor(STUDIO_READY); await sleep(1500);
console.log(await c.evaluate(readFileSync(join(root, 'lab/model-lab.js'), 'utf8')));
const tokens = JSON.parse(readFileSync(join(root, 'design/design-tokens.json'), 'utf8'));
await c.evaluate(`ModelLab.setup(${JSON.stringify(tokens)})`);
// a partial run updates its candidates and keeps the others
const statsFile = join(out, 'stats.json'), stats = existsSync(statsFile) ? JSON.parse(readFileSync(statsFile, 'utf8')) : {};
for (const n of names) {
  const r = await c.evaluate(`ModelLab.render(${JSON.stringify(n)})`);
  for (const [v, data] of Object.entries(r.images)) writeFileSync(join(out, `${n}-${v}.png`), Buffer.from(data.split(',')[1], 'base64'));
  stats[n] = { ...r.stats, clips: r.clips };
  console.log(n, JSON.stringify(r.stats), r.clips ? 'clips: ' + r.clips.slice(0, 8).join(', ') : '');
}
writeFileSync(join(out, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(c.errors.length ? 1 : 0);
