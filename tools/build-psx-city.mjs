#!/usr/bin/env node
// PSX city textures (overhaul Phase 3): the street surfaces from the Roads pack (asphalt, concrete paving slabs, stone
// paving), copied to public/assets/psx-city/ as small JPEGs; tools/build-manifest.mjs lists them (manifest.psxCity).
//   node tools/build-psx-city.mjs [path to the Roads pack's Models folder]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const src = process.argv[2] || join(process.env.FS_ASSETS || 'C:\\Users\\HP\\Desktop\\ASSETS', 'Roads', 'Roads', 'Models');
const out = join(root, 'public', 'assets', 'psx-city');
mkdirSync(out, { recursive: true });
// name in the engine -> file in the Roads pack (its textures carry Blender's numbered names)
const FILES = { asphalt: 'T (1).jpg', slabs: 'T (4).jpg', stone: 'T (3).jpg' };
for (const [name, file] of Object.entries(FILES)) {
  await sharp(join(src, file)).resize(128, 128, { fit: 'cover' }).jpeg({ quality: 82 }).toFile(join(out, name + '.jpg'));
  console.log('psx-city:', name, '<-', file);
}
