#!/usr/bin/env node
// Phone smoke test (390 x 844, touch): the studio fits the screen without sideways scrolling, the film is a usable
// size, the bottom tab bar opens each panel as a sheet and closes it again, Play advances the film, the theme switch
// works, and there are no page errors.
//   node tools/smoke-phone.mjs [url]
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const c = await launch();
await c.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await c.cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1500);
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
// sel: a selector (tapped in its middle) or an [x, y] point
const tap = async sel => { const r = Array.isArray(sel) ? sel : await c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]})()`);
  for (const type of ['touchStart', 'touchEnd']) await c.cdp('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: r[0], y: r[1] }] }); await sleep(550); };

const fit = await c.evaluate(`({sw:document.documentElement.scrollWidth,w:innerWidth,film:Math.round(document.getElementById('portrait').getBoundingClientRect().height),bar:(()=>{const b=document.querySelector('.paneltabs').getBoundingClientRect();return [Math.round(b.top),Math.round(b.bottom)]})()})`);
check('no sideways scrolling', fit.sw <= fit.w, JSON.stringify(fit));
check('film is at least 40% of the screen height', fit.film >= 844 * .4, fit.film + ' px');
check('tab bar sits at the bottom of the screen', fit.bar[1] <= 844 && fit.bar[1] > 780, JSON.stringify(fit.bar));
const sheets = [];
for (const k of ['story', 'shot', 'guide', 'more']) {
  await tap(`.paneltabs [data-panel=${k}]`);
  sheets.push(await c.evaluate(`(()=>{const p=document.querySelector('.panels').getBoundingClientRect();return {k:'${k}',open:document.body.classList.contains('sheet-open'),active:document.getElementById('panel-${k}').classList.contains('active'),top:Math.round(p.top)}})()`));
  await tap([195, 90]);  // the dimmed film above the sheet
}
check('each tab opens its panel as a sheet', sheets.every(s => s.open && s.active && s.top < 844 * .35), JSON.stringify(sheets));
check('tapping outside closes the sheet', !(await c.evaluate(`document.body.classList.contains('sheet-open')`)));
const t0 = await c.evaluate('T'); await tap('#bp'); await sleep(1500); await tap('#bp');
const t1 = await c.evaluate('T');
check('Play advances the film', t1 > t0 + .5, `${t0.toFixed(2)} -> ${t1.toFixed(2)} s`);
const theme = await c.evaluate(`(()=>{const a=getComputedStyle(document.body).backgroundColor;document.getElementById('themeToggle').click();const b=getComputedStyle(document.body).backgroundColor;document.getElementById('themeToggle').click();return {a,b}})()`);
check('theme switch changes the colours', theme.a !== theme.b, JSON.stringify(theme));
check('no page errors', !c.errors.length, c.errors.slice(0, 3).join(' | '));
console.log(failed ? `${failed} check(s) FAILED` : 'all checks passed');
c.close(); process.exit(failed ? 1 : 0);
