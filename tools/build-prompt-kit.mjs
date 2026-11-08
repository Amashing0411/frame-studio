#!/usr/bin/env node
// Writes the AI prompt kit (promptKit() in src/studio/28-prompt-kit.js, built from the running engine's vocabulary) to
// docs/PROMPT-KIT.md, the same text the Story tab's "Copy AI prompt kit" gives. Re-run when models, cameras or events change.
//   node tools/build-prompt-kit.mjs [url]
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(500);
const kit = await c.evaluate('promptKit()');
mkdirSync('docs', { recursive: true }); writeFileSync('docs/PROMPT-KIT.md', kit);
console.log(`docs/PROMPT-KIT.md: ${(kit.length / 1000).toFixed(1)} KB`, c.errors.length ? 'page errors: ' + c.errors.slice(0, 3).join(' | ') : '');
c.close(); process.exit(0);
