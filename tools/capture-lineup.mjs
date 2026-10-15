#!/usr/bin/env node
// Step 7 lineup capture: loads the market story, injects lab/lineup.js and renders the candidate glTF people next to
// the current vendor in the film's own world and lights, at film size and medium size.
//   node tools/capture-lineup.mjs [url] [outDir] [time]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/', outArg = 'qa/captures/lineup', time = '9.5', variant = 'all'] = process.argv.slice(2);
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const root = resolve(import.meta.dirname, '..');
// The cast files carry no animation clips, so people stand in their bind pose (clip patterns match nothing and the
// first clip, if any, is used).
const IDLE_U = '(Female|Man)_Idle$', IDLE_M = '(^|[|])Idle$';
const models = [
  { url: '/assets/people/u-woman.glb', label: 'U Woman (C)', clip: IDLE_U },
  { url: '/assets/people/u-man-suit.glb', label: 'U Man in Suit', clip: IDLE_U },
  { url: '/assets/people/u-woman-dress.glb', label: 'U Woman in Dress', clip: IDLE_U },
  { url: '/assets/people/m-casual.glb', label: 'M Casual', clip: IDLE_M },
  { url: '/assets/people/m-woman2.glb', label: 'M Woman', clip: IDLE_M },
  { url: '/assets/people/m-farmer.glb', label: 'M Farmer', clip: IDLE_M },
];
// "kids": children made from U and M adults (child height, bigger head) between adults, as family groups
const KID = { heightScale: 0.66, boneScale: { Head: 1.32 } };
if (variant === 'kids') models.splice(0, models.length,
  { url: '/assets/people/u-man.glb', label: 'U Man', clip: IDLE_U },
  { url: '/assets/people/u-woman-casual.glb', label: 'kid from U Woman Casual', clip: IDLE_U, ...KID },
  { url: '/assets/people/u-woman.glb', label: 'C Woman', clip: IDLE_U },
  { url: '/assets/people/m-hoodie.glb', label: 'kid from M Hoodie', clip: IDLE_M, ...KID },
  { url: '/assets/people/m-woman3.glb', label: 'M Woman 3', clip: IDLE_M },
  { url: '/assets/people/u-man-sleeves.glb', label: 'kid from U Man', clip: IDLE_U, ...KID },
  { url: '/assets/people/m-casual.glb', label: 'kid from M Casual', clip: IDLE_M, ...KID });
const c = await launch();
await c.open(url); await c.waitFor(STUDIO_READY); await sleep(1500);
await c.evaluate(`loadMarketDemo(true)`); await sleep(500); await c.waitFor('!seeking', 120000);
await seek(c, +time); await sleep(300);
console.log(await c.evaluate(readFileSync(join(root, 'lab/lineup.js'), 'utf8')));
const r = await c.evaluate(`Lineup.run(${JSON.stringify(models)})`);
for (const [name, s] of Object.entries(r.shots)) {
  writeFileSync(join(out, `lineup-${name}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
  writeFileSync(join(out, `lineup-${name}.json`), JSON.stringify({ tags: s.tags, figurePx: s.figurePx }, null, 1) + '\n');
}
console.log(JSON.stringify({ labels: r.labels, height: r.height, canvas: r.canvas, figurePx: Object.fromEntries(Object.entries(r.shots).map(([k, s]) => [k, s.figurePx])) }));
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(c.errors.length ? 1 : 0);
