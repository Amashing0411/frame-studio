#!/usr/bin/env node
// Shrinks the runtime assets in public/assets after the Blender builds: removes unused data, merges duplicates, drops
// redundant animation keyframes and quantizes normals, skin weights and colours (positions stay float: three r128
// reads quantized positions as raw integers on the CPU). Rewrites each file in place, then refreshes the manifest.
//   node tools/optimize-assets.mjs [subfolder]
import { readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, quantize } from '@gltf-transform/functions';

const root = resolve(import.meta.dirname, '..'), base = join(root, 'public', 'assets', process.argv[2] || '');
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.glb')) files.push(p); } };
walk(base);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
let before = 0, after = 0;
for (const f of files) {
  const b = statSync(f).size; before += b;
  const doc = await io.read(f);
  // already optimised (written by glTF-Transform, not Blender): skip, so a re-run never re-quantizes and changes files
  if (/glTF-Transform/i.test(doc.getRoot().getAsset().generator || '')) { after += b; continue; }
  // no sparse accessors: three r128's GLTFLoader cannot read sparse accessors without a buffer view (Blender writes
  // shape keys sparse, and gltf-transform would write them without one)
  for (const a of doc.getRoot().listAccessors()) a.setSparse(false);
  await doc.transform(prune(), dedup(), resample({ tolerance: 1e-4 }), quantize({ pattern: /^(NORMAL|WEIGHTS_0|COLOR_0)$/ }));
  await io.write(f, doc);
  const a = statSync(f).size; after += a;
  console.log(`${relative(base, f).padEnd(28)} ${(b / 1024).toFixed(0).padStart(6)} KB -> ${(a / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`total ${(before / 2 ** 20).toFixed(1)} MB -> ${(after / 2 ** 20).toFixed(1)} MB`);
execFileSync(process.execPath, [join(root, 'tools', 'build-manifest.mjs')], { stdio: 'inherit' });
