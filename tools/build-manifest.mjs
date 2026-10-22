#!/usr/bin/env node
// Writes public/assets/manifest.json: every runtime asset the engine loads from Vercel's static CDN (people, the PSX
// catalog models, library pictures). Reads the build reports (Blender people, tools/build-psx.mjs).
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

// people (tools/blender/build_psx_people.py): loaded on demand per story. The everyday men and women are the crowd
// pools; uniforms, killers and monsters only come through their roles (report.roles: role -> {m: [ids], f: [ids]}).
const roles = people.roles || {}, special = new Set(['police', 'sol', 'sheriff', 'fire', 'medic', 'worker', 'killer', 'zombie'].flatMap(r => Object.values(roles[r] || {}).flat()));
const women = [], men = [], models = {};
for (const [id, m] of Object.entries(people.models)) {
  models[id] = { file: url(`people/${id}.glb`), family: m.family, sex: m.sex, height: m.height, pelvis: m.pelvis, feet: m.feet, bytes: size(`people/${id}.glb`) };
  if (!special.has(id) && m.group !== 'Killer_M') (m.sex === 'f' ? women : men).push(id);
}
const families = {};
for (const [f, d] of Object.entries(people.families)) families[f] = { anim: url(`people/anim-${f}.glb`), reference: d.reference, pelvis: d.pelvis, clips: d.clips, bytes: size(`people/anim-${f}.glb`) };

// PSX catalog models (tools/build-psx.mjs): loaded on demand when a scene or the library needs them
const psx = {};
if (existsSync(join(assets, 'psx', 'build-report.json'))) for (const [id, m] of Object.entries(JSON.parse(readFileSync(join(assets, 'psx', 'build-report.json'), 'utf8')).models))
  psx[id] = { file: url(`psx/${id}.glb`), name: m.name, category: m.category, states: m.states, size: m.size, tris: m.tris, bytes: size(`psx/${id}.glb`) };

// asset library pictures (tools/build-thumbnails.mjs): archetype -> url with a content hash
const thumbs = {};
if (existsSync(join(assets, 'thumbs'))) for (const f of readdirSync(join(assets, 'thumbs')).filter(f => f.endsWith('.webp')).sort()) thumbs[f.replace(/\.webp$/, '')] = url(`thumbs/${f}`);

// PSX look editor (tools/build-psx-look.mjs): the shader project's textures, the Kenney graveyard models and its layout
const look = join(assets, 'psx-look'), psxLook = existsSync(look) ? {
  textures: Object.fromEntries(readdirSync(join(look, 'textures')).filter(f => f.endsWith('.png')).sort().map(f => [f.replace(/\.png$/, ''), url(`psx-look/textures/${f}`)])),
  kenney: Object.fromEntries(readdirSync(join(look, 'kenney')).filter(f => f.endsWith('.glb')).sort().map(f => [f.replace(/\.glb$/, ''), url(`psx-look/kenney/${f}`)])),
  graveyard: url('psx-look/graveyard.json'),
} : null;

const manifest = {
  version: 1,
  note: 'Runtime assets served from /assets by Vercel. Built by tools/blender/*.py and tools/build-manifest.mjs; licenses in public/models/CREDITS.md.',
  people: {
    families, models, women, men,
    roles,
    // distance per clip cycle (metres) for the family's reference height; the engine scales it by each person's
    // drawn height, so feet plant instead of gliding
    stride: Object.fromEntries(Object.entries(people.families).map(([f, d]) => [f, d.stride])),
  },
  psx,
  thumbs,
  psxLook,
  credits: [],
};
const total = Object.values(models).reduce((s, m) => s + m.bytes, 0) + Object.values(families).reduce((s, f) => s + f.bytes, 0);
writeFileSync(join(assets, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log(`manifest: ${Object.keys(models).length} people (${men.length} men, ${women.length} women in the crowds), ${Object.keys(families).length} clip libraries, ${(total / 2 ** 20).toFixed(1)} MB; ${Object.keys(psx).length} PSX models, ${(Object.values(psx).reduce((s, m) => s + m.bytes, 0) / 2 ** 20).toFixed(1)} MB (on demand)`);
