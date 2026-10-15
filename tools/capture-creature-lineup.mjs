#!/usr/bin/env node
// Step 8 creature lineup capture: loads the market story, injects lab/creature-lineup.js and renders candidate
// creatures next to cast people at real-world sizes (one shot per group), plus a JSON file of name tags per shot.
//   node tools/capture-creature-lineup.mjs [url] [outDir]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/', outArg = 'qa/captures/creature-lineup'] = process.argv.slice(2);
const out = resolve(outArg); mkdirSync(out, { recursive: true });
const root = resolve(import.meta.dirname, '..');
const lab = id => `/models/_lab/${id}.glb`, cast = id => `/assets/people/${id}.glb`;
const IDLE = '(^|[|])(Idle|Swim|Swimming_Normal|IdleCat)$';
const people = [{ url: cast('u-woman'), label: 'cast: U Woman', height: 1.71 }, { url: cast('m-casual'), label: 'cast: M Casual', height: 1.8 }];
// Small groups, each with a cast person for scale, so a 9:16 shot shows them near the size they have in a film.
const W = people[0], M = people[1];
const groups = [
  { name: '1-octopus', items: [W, { url: '/models/poly-octopus.glb', label: 'octopus (Poly, CC-BY)', height: 2.4 }, M] },
  { name: '2-small', items: [W, { url: lab('y4wdQpg767'), label: 'dog: Shiba Inu', length: 1, side: true, clip: IDLE }, { url: lab('6dM1J6f6pm9'), label: 'cat (Poly, CC-BY)', length: .6, side: true }, { url: lab('AbqX1f25xK'), label: 'monkey (marioba, CC-BY)', height: .65 }] },
  { name: '3-farm', items: [M, { url: lab('T6Cs7tmMHJ'), label: 'deer', length: 1.5, side: true, clip: IDLE }, { url: lab('TNvG3QUFlp'), label: 'boar: Pig, darker', length: 1.4, side: true, clip: IDLE, tint: '#5b4636' }] },
  { name: '4-big', items: [W, { url: lab('26zM1outCr'), label: 'cow', length: 2.4, side: true, clip: IDLE }, { url: lab('5A3w06FXUup'), label: 'tiger (Poly, CC-BY)', length: 2.1, side: true }] },
  { name: '5-elephant', items: [M, { url: lab('cx0-TiCjDOx'), label: 'elephant (Poly, CC-BY)', length: 4, side: true }] },
  { name: '6-birds', items: [W, { url: lab('eMNhHDZakYp'), label: 'gull (Poly, CC-BY)', length: 1.2, lift: 1.3 }, { url: lab('1MIvWQ5Q3R9'), label: 'pigeon: Poly crow', length: .55, side: true }, { url: lab('dpl7B31PqWX'), label: 'parrot (Poly, CC-BY)', length: .8, lift: 1.1 }, { url: lab('d7CSLvsHULY'), label: 'eagle (Poly, CC-BY)', length: 1.2 }] },
  { name: '7-sea', items: [M, { url: lab('Ymu8ftrmuT'), label: 'fish (reef)', length: .5, side: true, lift: .9, clip: IDLE }, { url: lab('AyHTK3zUSG'), label: 'shark', length: 3, side: true, lift: .5, clip: IDLE }] },
  { name: '8-sea', items: [W, { url: lab('3LzFgI3GLO'), label: 'dolphin', length: 2.5, side: true, lift: .4, clip: IDLE }, { url: lab('fklSEvGm1Q8'), label: 'turtle (Poly, CC-BY)', length: 1.1, side: true }] },
];
const c = await launch();
await c.open(url); await c.waitFor(STUDIO_READY); await sleep(1500);
await c.evaluate(`loadMarketDemo(true)`); await sleep(500); await c.waitFor('!seeking', 120000);
await seek(c, 1); await sleep(300);
console.log(await c.evaluate(readFileSync(join(root, 'lab/creature-lineup.js'), 'utf8')));
const r = await c.evaluate(`CreatureLineup.run(${JSON.stringify(groups)})`);
for (const [name, s] of Object.entries(r.shots)) {
  writeFileSync(join(out, `lineup-${name}.png`), Buffer.from(s.png.split(',')[1], 'base64'));
  writeFileSync(join(out, `lineup-${name}.json`), JSON.stringify({ tags: s.tags, personPx: s.personPx }, null, 1) + '\n');
  console.log(name, 'person height in a 960 px frame:', s.personPx);
}
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(c.errors.length ? 1 : 0);
