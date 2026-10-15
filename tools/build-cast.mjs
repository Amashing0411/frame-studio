#!/usr/bin/env node
// Builds the people cast (Step 7) from the Quaternius CC0 models on poly.pizza:
// downloads each source GLB once (cached in qa/cast-src/, gitignored), checks the page still says CC0, keeps only the
// animation clips the engine uses, removes unused data, quantizes normals and skin weights and writes
// public/models/cast/<id>.glb. Positions stay float: three r128 reads quantized positions as raw integers in bounding
// boxes and CPU skinning, which broke sizing.
//   node tools/build-cast.mjs [--offline]
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, quantize } from '@gltf-transform/functions';

const root = resolve(import.meta.dirname, '..'), cache = join(root, 'qa/cast-src'), out = join(root, 'public/models/cast');
const offline = process.argv.includes('--offline');
mkdirSync(cache, { recursive: true }); mkdirSync(out, { recursive: true });

// id: output name; pp: poly.pizza model id; glb: its file on static.poly.pizza. "u" = Ultimate Animated Character pack
// (31-bone rig), "m" = modular pack (62-bone rig). Both by Quaternius, CC0.
export const CAST_SOURCES = [
  ['u-woman', 'AQsd9ngvKU', '906a0cbe-b0a4-4312-b898-0f974b6f6771', 'Woman'],
  ['u-woman-casual', 'jpKRgGDxhk', '51d5abdd-bb87-4b8d-9967-21738ffb8437', 'Woman Casual'],
  ['u-woman-tank', 'XqzeZGB7iU', '9a6a3e55-23ce-4d5c-89bc-7d3f30307ed0', 'Woman in Tank Top'],
  ['u-woman-dress', 'zMyPlQXBzq', 'a642af96-e239-4c5f-b50d-7661ff51deec', 'Woman in Dress'],
  ['u-man', 'HMnuH5geEG', '3746be88-6799-4817-929b-6bc067c47caa', 'Man'],
  ['u-man2', 'fjHyMd5Wxw', '985eacbf-9dde-44b7-9270-4e35c8400b13', 'Man'],
  ['u-man-sleeves', 'DLptRuewTn', 'e6019b9f-aed0-400c-8df4-ce5b648e9b82', 'Man in Long Sleeves'],
  ['u-man-suit', 'mQnGoME1ez', '66b57880-bcb0-479a-8d72-5c3e88afaa39', 'Man in Suit'],
  ['m-woman2', 'qJ2gsTUBHL', 'ba7a1955-ea51-4cb9-a561-188bdef0a6c7', 'Animated Woman'],
  ['m-woman3', 'nIItLV9nxS', '46d6db5a-3c9f-4238-8cdf-8eb7194498dc', 'Animated Woman'],
  ['m-punk2', 'djXoqejw6w', '1d368679-1d9a-4d5c-9095-877144b02d00', 'Punk'],
  ['m-adventurer2', 'ZwF0K7WBmu', '69689495-028d-4b81-8678-792338a5693e', 'Adventurer'],
  ['m-beach', 'DojKLcO34E', 'f771a536-1c18-4a47-bb56-ceea4b603455', 'Beach Character'],
  ['m-casual', 'kZ3DmIoGip', '90a9e2d4-053f-42f1-99a2-8f5e1180ea7f', 'Casual Character'],
  ['m-business', 'JFrLIKqvCH', 'e599abbe-7d73-488c-9d7e-3ead281e705c', 'Business Man'],
  ['m-hoodie', 'gKLBoRsyKe', 'bcd66ec5-5e81-4901-a222-47abc875fe2a', 'Hoodie Character'],
  ['m-farmer', '7pn3R6hPvE', '81f2f0cf-6f53-4b57-92ea-dba0928620f2', 'Farmer'],
  ['m-punk', 'BTALZymknF', 'e56f23b5-3270-406f-8924-f77cad980c43', 'Punk'],
  ['m-adventurer', '5EGWBMpuXq', 'bbe369ee-a686-42c7-adad-14356f5f2f15', 'Adventurer'],
  ['m-worker', 'Yg2bQZO6Hj', '3a5f3056-ffe6-42eb-bd52-122afcbd22b2', 'Worker'],
  ['m-swat', 'Btfn3G5Xv4', '713f6535-f4f3-4367-a4c6-ced126ae0936', 'SWAT'],
];
// Clips kept in the output (matched on the name after the armature prefix). The engine poses people from its own
// motion rig, so none are needed yet.
const KEEP_CLIPS = [];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
let total = 0;
const credits = [];
for (const [id, pp, file, title] of CAST_SOURCES) {
  const src = join(cache, id + '.glb'), page = join(cache, id + '.html');
  if (!existsSync(src) || !existsSync(page)) {
    if (offline) throw new Error(`${id}: not cached and --offline was given`);
    const html = await (await fetch(`https://poly.pizza/m/${pp}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
    writeFileSync(page, html);
    const glb = Buffer.from(await (await fetch(`https://static.poly.pizza/${file}.glb`)).arrayBuffer());
    writeFileSync(src, glb);
  }
  // license check on the model page: CC0 / Public Domain, and not a Creative Commons Attribution license
  const html = readFileSync(page, 'utf8');
  if (!/CC0|Public Domain/.test(html) || /CC-BY|Creative Commons Attribution/.test(html)) throw new Error(`${id}: the poly.pizza page no longer says CC0`);
  if (!/Quaternius/.test(html)) throw new Error(`${id}: the author is not Quaternius`);

  const doc = await io.read(src);
  // a disposed animation leaves its samplers and keyframe accessors behind (prune keeps them), so dispose those too
  for (const anim of doc.getRoot().listAnimations()) {
    if (KEEP_CLIPS.includes(anim.getName().replace(/^.*\|/, ''))) continue;
    for (const s of anim.listSamplers()) { s.getInput()?.dispose(); s.getOutput()?.dispose(); s.dispose(); }
    for (const c of anim.listChannels()) c.dispose();
    anim.dispose();
  }
  await doc.transform(prune(), dedup(), quantize({ pattern: /^(NORMAL|WEIGHTS_0|COLOR_0)$/ }));
  const dst = join(out, id + '.glb');
  await io.write(dst, doc);
  const before = statSync(src).size, after = statSync(dst).size; total += after;
  console.log(`${id.padEnd(15)} ${(before / 1024).toFixed(0).padStart(5)} KB -> ${(after / 1024).toFixed(0).padStart(4)} KB`);
  credits.push(`| cast/${id}.glb | ${title} | Quaternius | CC0 1.0 (no credit required) | https://poly.pizza/m/${pp} |`);
}
// the people table in public/models/CREDITS.md, between the cast markers
const creditsFile = join(root, 'public/models/CREDITS.md'), md = readFileSync(creditsFile, 'utf8');
const table = ['| File | Model | Author | License | Source |', '|---|---|---|---|---|', ...credits].join('\n');
if (!/<!-- cast:start -->[^]*<!-- cast:end -->/.test(md)) throw new Error('CREDITS.md has no cast markers');
writeFileSync(creditsFile, md.replace(/<!-- cast:start -->[^]*<!-- cast:end -->/, `<!-- cast:start -->\n${table}\n<!-- cast:end -->`));
console.log(`cast: ${CAST_SOURCES.length} models, ${(total / 1024 / 1024).toFixed(2)} MB total`);
