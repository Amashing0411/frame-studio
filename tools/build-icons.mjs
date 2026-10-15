#!/usr/bin/env node
// Renders the app icon (public/icon.svg, and public/icon-small.svg for 16-48 px) to the PNG sizes browsers and phones
// ask for, and writes public/favicon.ico (16, 32, 48). Uses headless Chrome, so the result matches the SVG exactly.
//   node tools/build-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launch, sleep } from './lib/chrome.mjs';

const pub = resolve(import.meta.dirname, '../public');
const svg = name => 'data:image/svg+xml;base64,' + readFileSync(resolve(pub, name)).toString('base64');
const big = svg('icon.svg'), small = svg('icon-small.svg');
const sizes = [['icon-512.png', 512, big], ['icon-192.png', 192, big], ['apple-touch-icon.png', 180, big], ['favicon-48.png', 48, small], ['favicon-32.png', 32, small], ['favicon-16.png', 16, small]];

const c = await launch();
await c.open('about:blank');
await c.cdp('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
const png = {};
for (const [file, size, src] of sizes) {
  await c.cdp('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
  await c.evaluate(`document.body.style.margin=0;document.body.innerHTML='<img src="${src}" width="${size}" height="${size}" style="display:block">'`);
  await sleep(150);
  // the iOS home-screen icon is drawn by the system with its own corner mask: give it a full-bleed tile
  if (file === 'apple-touch-icon.png') await c.evaluate(`document.body.style.background='#e8643a'`);
  png[file] = Buffer.from((await c.cdp('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } })).data, 'base64');
  if (file !== 'favicon-48.png' && file !== 'favicon-16.png') writeFileSync(resolve(pub, file), png[file]);
  console.log(file, png[file].length, 'bytes');
}
c.close();

// ICO container with PNG entries (Vista+ reads PNG-compressed icons)
const entries = [['favicon-16.png', 16], ['favicon-32.png', 32], ['favicon-48.png', 48]];
const head = Buffer.alloc(6 + 16 * entries.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
let offset = head.length;
entries.forEach(([file, size], i) => {
  const b = png[file], o = 6 + 16 * i;
  head.writeUInt8(size, o); head.writeUInt8(size, o + 1); head.writeUInt8(0, o + 2); head.writeUInt8(0, o + 3);
  head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(offset, o + 12);
  offset += b.length;
});
writeFileSync(resolve(pub, 'favicon.ico'), Buffer.concat([head, ...entries.map(([f]) => png[f])]));
console.log('favicon.ico written');
process.exit(0);
