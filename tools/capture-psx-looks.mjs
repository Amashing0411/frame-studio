#!/usr/bin/env node
// PSX look editor captures: opens the editor at 1280 x 720 (the size of fcidade's itch.io viewer), applies every
// "Try this" look and saves the preview, the whole editor once, the film frame mode, and the phone layout. With a
// reference folder (the viewer's own captures, one <name>.png per look) it also writes side-by-side pictures.
//   node tools/capture-psx-looks.mjs [url] [outDir] [--ref qa/captures/psx-ref] [--only ps1,chrome] [--wait 2500]
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const ref = flag('--ref'), only = flag('--only'), wait = +(flag('--wait') || 2500);
const [url = 'http://localhost:5173/', out = 'qa/captures/psx-looks'] = args;
mkdirSync(out, { recursive: true });
// the viewer's preset names -> file names of its captures
const FILE = { 'PS1': 'ps1', 'Graveyard': 'graveyard', 'Horror fog': 'horror_fog', 'Clean (all off)': 'clean', 'Crunchy 3-bit': 'crunchy', 'Shaky': 'shaky', 'N64': 'n64', 'Chrome': 'chrome', 'Glowing runes': 'runes', 'Texture swimming': 'swimming', 'Fence cutout': 'fence', 'Billboard': 'billboard' };
const c = await launch({ width: 1280, height: 720 });
await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(800);
const stage = async () => { const r = await c.evaluate(`(()=>{const b=document.getElementById('psxEdStage').getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(Math.round)})()`); return sharp(await c.screenshot()).extract({ left: r[0], top: r[1], width: r[2], height: r[3] }); };
await c.evaluate(`openPsxEditor('corridor')`); await sleep(wait);
const names = await c.evaluate(`PSX_PRESETS.map(p=>p.name)`);
for (const name of names) {
  const file = FILE[name]; if (only && !only.split(',').includes(file)) continue;
  await c.evaluate(`psxEdPreset(PSX_PRESETS.find(p=>p.name===${JSON.stringify(name)}))`);
  // the corridor and graveyard walks restart, so every capture shows the same moment of the walk
  await c.evaluate(`PSX_ED.t0=performance.now()-${name === 'Graveyard' ? 300 : 1800}`); await c.waitFor(`!PSX_ED.scenes[PSX_ED.scene]?.loading`, 60000); await sleep(wait);
  await (await stage()).toFile(join(out, file + '.png'));
  if (ref && existsSync(join(ref, file + '.png'))) {
    const W = 640, H = 480, a = await sharp(join(ref, file + '.png')).resize(W, H, { fit: 'cover' }).toBuffer(), b = await sharp(join(out, file + '.png')).resize(W, H, { fit: 'cover' }).toBuffer();
    const label = (t, x) => `<text x="${x + 10}" y="22" font-family="sans-serif" font-size="16" font-weight="700" fill="#fff">${t}</text>`;
    await sharp({ create: { width: W * 2 + 8, height: H + 32, channels: 3, background: '#111' } }).composite([{ input: a, left: 0, top: 32 }, { input: b, left: W + 8, top: 32 },
      { input: Buffer.from(`<svg width="${W * 2 + 8}" height="32">${label(name + ' · shader project (itch.io viewer)', 0)}${label(name + ' · Frame Studio editor', W + 8)}</svg>`), left: 0, top: 0 }]).jpeg({ quality: 86 }).toFile(join(out, 'vs-' + file + '.jpg'));
  }
  console.log('captured', name);
}
// the whole editor, the film frame mode, and a phone
await c.evaluate(`psxEdPreset(PSX_PRESETS[0]);psxEdSetScene('corridor')`); await sleep(wait); writeFileSync(join(out, 'editor.png'), await c.screenshot());
await c.evaluate(`psxEdSetScene('film')`); await sleep(wait + 1500); writeFileSync(join(out, 'editor-film.png'), await c.screenshot());
await c.evaluate(`psxEdTab('code')`); await sleep(400); writeFileSync(join(out, 'editor-code.png'), await c.screenshot());
await c.evaluate(`psxEdTab('params');closePsxEditor()`);
await c.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await sleep(800);
await c.evaluate(`openPsxEditor('graveyard')`); await c.waitFor(`!PSX_ED.scenes.graveyard?.loading`, 60000); await sleep(wait);
writeFileSync(join(out, 'phone.png'), await c.screenshot());
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(0);
