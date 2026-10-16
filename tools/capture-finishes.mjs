#!/usr/bin/env node
// Extra regression evidence for material sharing: a market frame under every cinema material finish, plus a screenshot
// of the Asset studio while the film uses the "faceted" finish (the preview must not pick up the film's finish).
//   node tools/capture-finishes.mjs <url> <outDir> [--compare otherDir]
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { launch, sleep, seek, canvasPng, STUDIO_READY } from './lib/chrome.mjs';
const args = process.argv.slice(2), ci = args.indexOf('--compare'), cmp = ci >= 0 ? args.splice(ci, 2)[1] : null;
const [url, out] = args; mkdirSync(out, { recursive: true });
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY); await sleep(1500);
await c.evaluate('loadMarketDemo(true)'); await sleep(500); await c.waitFor('!seeking');
const files = [];
for (const finish of ['natural', 'soft', 'ceramic', 'faceted', 'toon', 'psx']) {
  await c.evaluate(`CINEMA.material='${finish}';applyCinemaMaterials('${finish}')`);
  for (const t of [0, 9.5]) { await seek(c, t); await sleep(200); const f = `finish-${finish}-${t * 10}.png`; writeFileSync(join(out, f), await canvasPng(c)); files.push(f); }
}
// Asset studio with the film left on "faceted": select the first catalog human and screenshot the viewer.
await c.evaluate(`CINEMA.material='faceted';applyCinemaMaterials('faceted');tabLeft('library');document.querySelector('#left-library .asset-item')?.click();document.querySelector('[data-view=asset]').click()`);
await sleep(2000);
const box = await c.evaluate(`(()=>{const r=document.getElementById('assetPreview').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()`);
writeFileSync(join(out, 'asset-faceted.png'), Buffer.from((await c.cdp('Page.captureScreenshot', { format: 'png', clip: box })).data, 'base64')); files.push('asset-faceted.png');
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 3).join(' | ') : 'page errors: none');
let bad = c.errors.length;
if (cmp) for (const f of files) { const h = p => existsSync(p) ? createHash('sha256').update(readFileSync(p)).digest('hex') : null; const ok = h(join(out, f)) === h(join(cmp, f)); if (!ok) bad++; console.log(`${ok ? 'MATCH    ' : 'DIFFERENT'} ${f}`); }
c.close(); process.exit(bad ? 1 : 0);
