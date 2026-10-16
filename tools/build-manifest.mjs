#!/usr/bin/env node
// Writes public/assets/manifest.json: every runtime asset the engine loads from Vercel's static CDN (people now;
// creatures, vehicles and props join as their pipelines land). Reads the Blender build reports.
//   node tools/build-manifest.mjs
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..'), assets = join(root, 'public', 'assets');
const people = JSON.parse(readFileSync(join(assets, 'people', 'build-report.json'), 'utf8'));
const size = rel => statSync(join(assets, rel)).size;
// /assets/* is cached for a year (vercel.json) and model files keep their names, so each URL carries the file's content
// hash: a rebuilt model gets a new URL. The manifest itself is revalidated on every load.
const url = rel => `${rel}?v=${createHash('sha256').update(readFileSync(join(assets, rel))).digest('hex').slice(0, 10)}`;

const women = [], men = [];
const models = {};
for (const [id, m] of Object.entries(people.models)) {
  const sex = /woman|punk2|adventurer2/.test(id) ? 'f' : 'm';
  models[id] = { file: url(`people/${id}.glb`), family: m.family, sex, height: m.height, pelvis: m.pelvis, face: !!m.face, feet: m.feet, bytes: size(`people/${id}.glb`) };
  if (['u-man-suit', 'm-worker', 'm-swat'].includes(id)) continue;
  (sex === 'f' ? women : men).push(id);
}
const families = {};
for (const [f, d] of Object.entries(people.families)) families[f] = { anim: url(`people/anim-${f}.glb`), reference: d.reference, pelvis: d.pelvis, clips: d.clips, bytes: size(`people/anim-${f}.glb`) };

// asset library pictures (tools/build-thumbnails.mjs): archetype -> url with a content hash
const thumbs = {};
if (existsSync(join(assets, 'thumbs'))) for (const f of readdirSync(join(assets, 'thumbs')).filter(f => f.endsWith('.webp')).sort()) thumbs[f.replace(/\.webp$/, '')] = url(`thumbs/${f}`);

const manifest = {
  version: 1,
  note: 'Runtime assets served from /assets by Vercel. Built by tools/blender/*.py and tools/build-manifest.mjs; licenses in public/models/CREDITS.md.',
  people: {
    families, models, women, men,
    roles: { elder: 'u-man-suit', worker: 'm-worker', police: 'm-swat', sol: 'm-swat' },
    // distance per clip cycle (metres) for each family's reference model (height refHeight), measured from the stance
    // foot's speed in the clip; the engine scales it by each person's drawn height, so feet plant instead of gliding
    stride: {
      u: { refHeight: 1.76, walk: 1.13, walk_formal: 1.16, zombie: 1.13, carry: 1.13, crouch_walk: .81, run: 2.3, sprint: 3.0, swim: 1.3 },
      m: { refHeight: 1.78, walk: 1.38, walk_formal: 1.4, zombie: 1.38, carry: 1.38, crouch_walk: 1.2, run: 2.75, sprint: 3.6, swim: 1.3 },
    },
  },
  thumbs,
  credits: [],
};
const total = Object.values(models).reduce((s, m) => s + m.bytes, 0) + Object.values(families).reduce((s, f) => s + f.bytes, 0);
writeFileSync(join(assets, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${Object.keys(models).length} people, ${Object.keys(families).length} clip libraries, ${(total / 2 ** 20).toFixed(1)} MB`);
