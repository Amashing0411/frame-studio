#!/usr/bin/env node
// Step 1 proof: the split project contains exactly the original page.
//  1. Rebuild the single-file page from index.html + src/styles + the classic bundles, and compare it byte for byte
//     with reference/workshop-original.html (line endings normalised to LF, as the browser's HTML parser does).
//  2. If dist/ exists, check that the built script and style files carry the original script and style text.
// Valid until Step 2 starts changing the code on purpose.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildClassicBundles } from './vite-classic-scripts.js';
import config from '../classic.config.js';

const root = resolve(import.meta.dirname, '..');
const read = p => readFileSync(join(root, p), 'utf8');
const original = read('reference/workshop-original.html').replace(/\r\n?/g, '\n');
let failures = 0;
const check = (label, actual, expected) => {
  if (actual === expected) { console.log(`PASS  ${label} (${expected.length.toLocaleString()} chars)`); return; }
  failures++;
  let i = 0; while (i < actual.length && actual[i] === expected[i]) i++;
  console.log(`FAIL  ${label}: first difference at char ${i}\n  expected: ${JSON.stringify(expected.slice(i, i + 80))}\n  actual:   ${JSON.stringify(actual.slice(i, i + 80))}`);
};

// Pieces of the original, cut by tags (independent of how the split was made).
const scripts = [...original.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const styles = [...original.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
console.log(`original: ${scripts.length} scripts, ${styles.length} style blocks`);

const bundles = buildClassicBundles(root, config);
check('vendor bundle = original script 1', bundles.vendor, scripts[0]);
check('engine bundle = original script 2', bundles.engine, scripts[1]);
check('studio bundle = original script 3', bundles.studio, scripts[2]);
check('src/styles/studio.css = original style 1', read('src/styles/studio.css'), styles[0]);
check('src/styles/theme.css = original style 2', read('src/styles/theme.css'), styles[1]);

const links = '<link rel="stylesheet" href="/src/styles/studio.css"><link rel="stylesheet" href="/src/styles/theme.css">';
const rebuilt = read('index.html')
  .replace(links, () => styles.map(s => `<style>${s}</style>`).join(''))
  .replace('<!-- classic-scripts -->', () => ['vendor', 'engine', 'studio'].map(n => `<script>${bundles[n]}</script>`).join(''));
check('whole page rebuilt from sources = original', rebuilt, original);

if (existsSync(join(root, 'dist/index.html'))) {
  const html = read('dist/index.html');
  const srcs = [...html.matchAll(/<script src="\/([^"]+)"><\/script>/g)].map(m => m[1]);
  const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\/([^"]+)"/g)].map(m => m[1]);
  console.log(`dist: ${srcs.length} classic scripts, ${css.length} stylesheet(s), no module scripts: ${!/type="module"/.test(html)}`);
  srcs.forEach((s, i) => check(`dist/${s} = original script ${i + 1}`, read(join('dist', s)), scripts[i]));
  check('dist stylesheet = original style 1 + style 2', css.map(c => read(join('dist', c))).join(''), styles.join(''));
  check('dist markup = original markup', html.slice(html.indexOf('<body>'), html.indexOf('<script')), original.slice(original.indexOf('<body>'), original.indexOf('<script')));
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
