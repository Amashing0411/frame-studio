#!/usr/bin/env node
// Vehicle lineup capture: the current code-built vehicles next to CC0 candidates (Quaternius from poly.pizza, Kenney
// Car Kit), at the catalog's real-world lengths, with a cast person for scale, parked across the outbreak city's avenue
// (lab/vehicle-lineup.js). Sources are read from qa/asset-src/vehicles/ (gitignored; the dev server serves them).
//   node tools/capture-vehicle-lineup.mjs [url] [outDir]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/', outArg = 'qa/captures/vehicle-lineup'] = process.argv.slice(2);
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const root = resolve(import.meta.dirname, '..');
const Q = (id, label, length) => ({ url: `/qa/asset-src/vehicles/quaternius/${id}.glb`, label: 'Quaternius: ' + label, length });
const K = (id, label, length) => ({ url: `/qa/asset-src/vehicles/kenney/src/Models/GLB format/${id}.glb`, label: 'Kenney: ' + label, length });
const now = (make, label) => ({ make, label: 'current: ' + label });
const P = { url: '/assets/people/m-casual.glb', label: 'cast: M Casual', height: 1.8 };
// catalog lengths (01-archetypes.js): compact 3.7, sedan 4.6, suv 4.9, taxi 4.6, police 4.8, ambulance 6, fire engine 8,
// van 5.2, pickup 5.4, flatbed 8.2, refuse truck 8, tractor 3.9
const groups = [
  { name: '1-sedan', items: [P, now(`mkVeh('car',0x3d6fa8)`, 'city car'), Q('car-b', 'car', 4.6), K('sedan', 'sedan', 4.6)] },
  { name: '2-compact-suv', items: [P, Q('car-a', 'car (compact)', 3.7), Q('suv', 'SUV', 4.9), K('suv', 'SUV', 4.9)] },
  { name: '3-taxi', items: [P, now(`mkVeh('taxi')`, 'taxi'), Q('taxi', 'taxi', 4.6), K('taxi', 'taxi', 4.6)] },
  { name: '4-police', items: [P, now(`buildCatalogModel('vehicle.police.v01')`, 'catalog police'), Q('police', 'police', 4.8), K('police', 'police', 4.8)] },
  { name: '5-emergency', items: [P, now(`buildCatalogModel('vehicle.ambulance.v01')`, 'catalog ambulance'), K('ambulance', 'ambulance', 6), K('firetruck', 'fire engine', 8)] },
  { name: '6-work', items: [P, Q('pickup', 'pickup', 5.4), K('van', 'van', 5.2), K('delivery', 'delivery', 5.6)] },
  { name: '7-trucks', items: [P, Q('truck', 'truck', 8.2), K('garbage-truck', 'refuse truck', 8), Q('foodtruck', 'food truck', 6)] },
  { name: '8-ph', items: [P, now(`mkVeh('jeep',0xd9b23a)`, 'jeepney'), now(`mkVeh('trike',0x2f7a4a)`, 'tricycle'), now(`mkVeh('bus',0x2a5fa8)`, 'bus')] },
];
const c = await launch();
await c.open(url); await c.waitFor(STUDIO_READY); await sleep(1500);
await c.evaluate(`document.getElementById('bz').click()`); await sleep(700); await c.evaluate(`document.getElementById('bv').click()`); await sleep(500); await c.waitFor('!seeking', 120000);
await seek(c, 1); await sleep(300);
console.log(await c.evaluate(readFileSync(join(root, 'lab/vehicle-lineup.js'), 'utf8')));
const r = await c.evaluate(`VehicleLineup.run(${JSON.stringify(groups)})`);
for (const [name, s] of Object.entries(r.shots)) {
  writeFileSync(join(out, `lineup-${name}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
  writeFileSync(join(out, `lineup-${name}.json`), JSON.stringify({ tags: s.tags }, null, 1) + '\n');
}
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(c.errors.length ? 1 : 0);
