#!/usr/bin/env node
// PSX on the film: renders story frames under several PSX looks (cinema.psx), checks that a frame repeats exactly when
// the film is sought to it again (jitter and grain run on the film clock), that a 1080-wide render (the export size)
// matches the 540-wide preview once scaled down, and draws a placed model with its own look (assets[].psx).
//   node tools/check-psx-film.mjs [url] [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const [url = 'http://localhost:5173/', out = 'qa/captures/psx-film'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const c = await launch({ width: 1280, height: 900 });
await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(800);
const png = async () => Buffer.from((await c.evaluate(`document.getElementById('output').toDataURL('image/png')`)).split(',')[1], 'base64');
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 12);
// one story with one look; model: optional {id, psx}
const setLook = async (load, look, model) => {
  await c.evaluate(load); await sleep(500); await c.waitFor('!seeking', 120000);
  await c.evaluate(`(()=>{const j=parse();j.cinema={...(j.cinema||{}),material:'psx',psx:${JSON.stringify(look)}};${model ? `j.assets.find(a=>a.instance_id===${JSON.stringify(model.id)}).psx=${JSON.stringify(model.psx)};` : ''}$('ta').value=JSON.stringify(j,null,2);cancelSeek();return validateOnly()})()`);
  await sleep(500); await c.waitFor('!seeking', 120000);
};
const looks = await c.evaluate(`Object.fromEntries(PSX_PRESETS.filter(p=>!p.scene||p.scene==='corridor').map(p=>[p.name,p.look]))`);
const market = `loadMarketDemo(true)`, quake = `document.getElementById('bq').click()`;
const tiles = [], report = {};
for (const [name, look] of Object.entries(looks)) {
  await setLook(market, look); await c.evaluate(`configureRender(540)`); await seek(c, 9.5); await sleep(300);
  const a = await png(); await seek(c, 9.5); await sleep(300); const b = await png();
  writeFileSync(join(out, `market-${name.replace(/\W+/g, '_')}.png`), a); tiles.push([name, a]);
  report[name] = { repeat: sha(a) === sha(b) };
  console.log(name.padEnd(16), 'repeats on a second seek:', report[name].repeat);
}
// export size: the same frame at 1080 wide, scaled down to 540, against the preview
await setLook(market, looks['PS1']); await c.evaluate(`configureRender(540)`); await seek(c, 9.5); await sleep(300); const small = await png();
await c.evaluate(`configureRender(1080);renderCurrent()`); await sleep(300); const big = await png(); await c.evaluate(`configureRender()`);
writeFileSync(join(out, 'export-1080.png'), big); writeFileSync(join(out, 'preview-540.png'), small);
const s1 = await sharp(small).removeAlpha().raw().toBuffer(), s2 = await sharp(big).resize(540, 960, { kernel: 'cubic' }).removeAlpha().raw().toBuffer(), s1b = await sharp(small).blur(1.2).removeAlpha().raw().toBuffer(), s2b = await sharp(big).resize(540, 960, { kernel: 'cubic' }).blur(1.2).removeAlpha().raw().toBuffer();
let d = 0, db = 0; for (let i = 0; i < s1.length; i++) { d += Math.abs(s1[i] - s2[i]); db += Math.abs(s1b[i] - s2b[i]); }
console.log(`export vs preview: mean difference ${(d / s1.length).toFixed(1)} levels per channel (${(db / s1.length).toFixed(1)} after a 1 px blur, which hides the dither pattern)`);
// a placed model with its own look: Leo in chrome, the market's close-up
await setLook(market, looks['PS1'], { id: 'leo', psx: { matcap_tex: 'chrome', matcap_amount: .85, albedo_color: '#ffd27a' } });
await c.evaluate(`configureRender(540)`); await seek(c, 9.5); await sleep(300); tiles.push(['Leo: chrome model look', await png()]);
// another story under PS1
await setLook(quake, looks['PS1']); await c.evaluate(`configureRender(540)`); await seek(c, 2); await sleep(300); tiles.push(['Earthquake, PS1', await png()]);
const W = 270, H = 480, cols = 4, rows = Math.ceil(tiles.length / cols);
const comp = await Promise.all(tiles.map(async ([n, b], i) => ({ input: await sharp(b).resize(W, H).toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * (H + 24) + 24 })));
const labels = tiles.map(([n], i) => `<text x="${(i % cols) * W + 6}" y="${Math.floor(i / cols) * (H + 24) + 17}" font-family="sans-serif" font-size="14" font-weight="700" fill="#fff">${n}</text>`).join('');
await sharp({ create: { width: cols * W, height: rows * (H + 24), channels: 3, background: '#111' } }).composite([...comp, { input: Buffer.from(`<svg width="${cols * W}" height="${rows * (H + 24)}">${labels}</svg>`), left: 0, top: 0 }]).jpeg({ quality: 86 }).toFile(join(out, 'sheet.jpg'));
console.log(c.errors.length ? 'page errors: ' + c.errors.slice(0, 4).join(' | ') : 'page errors: none');
c.close(); process.exit(0);
