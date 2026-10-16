#!/usr/bin/env node
// Camera smoothness probe: steps every built-in story at 60 steps/s (like seekFilm) and records the camera after each
// step. Inside a shot, a sudden change of camera speed (position) or turn rate (view direction) shows on screen as a
// pop or a stutter; the probe lists the worst ones per story with what caused them (building lift, smart-camera
// correction, quake shake, a camera that follows a person's head or heading).
//   node tools/camera-probe.mjs [url] [--json out.json] [--only market,earthquake]
import { writeFileSync } from 'node:fs';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null };
const jsonOut = flag('--json'), only = flag('--only'), url = args[0] || 'http://localhost:5173/';
const world = w => `(()=>{const s=document.getElementById('worldDemo');s.value='${w}';s.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('loadWorldDemo').click()})()`;
const STORIES = {
  market: `loadMarketDemo(true)`, 'market-plain': `loadMarketDemo(false)`,
  earthquake: `document.getElementById('bq').click()`, outbreak: `document.getElementById('bz').click()`,
  ...Object.fromEntries(['coast', 'city', 'jungle', 'ocean', 'sky', 'custom'].map(w => [w, world(w)])),
};
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1000);
const report = {};
for (const name of only ? only.split(',') : Object.keys(STORIES)) {
  await c.evaluate(STORIES[name]); await sleep(800); await c.waitFor('!seeking', 120000);
  if (!name.startsWith('market')) { await c.evaluate(`document.getElementById('bv').click()`); await sleep(800); await c.waitFor('!seeking', 120000); }
  report[name] = await c.evaluate(`(()=>{prepareScene();simulating=true;const n=Math.floor(END*60),rows=[],raw=V(),look=V(),dir=V();
    for(let i=0;i<n;i++){stepCount++;step(1/60,stepCount/60);const t=stepCount/60,s=shots[cur],u=cl((t-s.t0)/(s.t1-s.t0));
      shotCam(s,u,t,raw,look);const lifted=raw.clone();if(!s.cam.target_id)fix(lifted);camera.getWorldDirection(dir);
      rows.push({t,shot:cur,preset:s.cam.preset,move:s.cam.move,authored:authoredCamShot,target:!!s.cam.target_id,p:camera.position.toArray(),d:dir.toArray(),
        lift:lifted.y-raw.y,avoid:cameraCorrection!=='Clear',q:S.q||0})}
    simulating=false;
    const sub=(a,b)=>a.map((x,k)=>x-b[k]),len=a=>Math.hypot(...a),ang=(a,b)=>Math.acos(Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2]));
    const ev=[];let sumV=0,sumW=0,cnt=0;
    for(let i=2;i<rows.length;i++){const a=rows[i-2],b=rows[i-1],r=rows[i];if(a.shot!==r.shot)continue;
      const v1=len(sub(b.p,a.p)),v2=len(sub(r.p,b.p)),jerk=len(sub(sub(r.p,b.p),sub(b.p,a.p))),w1=ang(a.d,b.d),w2=ang(b.d,r.d),dw=Math.abs(w2-w1);
      const dist=Math.max(1,len(sub(r.p,[0,0,0]))*0),scale=Math.max(.02,(v1+v2)/2);sumV+=jerk;sumW+=dw;cnt++;
      // Screen-relevant measures: positional jerk relative to the shot's own speed, and turn-rate change in degrees/step.
      const pop=jerk/scale,turn=dw*180/Math.PI;
      if((jerk>.08&&pop>.6)||turn>.25){const cause=[];if(r.lift!==b.lift||b.lift!==a.lift)cause.push('building lift');if(r.avoid!==b.avoid||r.avoid)cause.push('smart camera');if(r.q>0)cause.push('shake');
        if(/closeup|over_shoulder|pov/.test(r.preset)||r.target)cause.push('follows a person');
        ev.push({t:+r.t.toFixed(3),shot:r.shot+1,preset:r.preset,move:r.move,jerk:+jerk.toFixed(3),pop:+pop.toFixed(2),turn:+turn.toFixed(3),cause:cause.join(', ')||'?'})}}
    const byShot={};for(const e of ev){const k=e.shot+' '+e.preset+'/'+e.move;(byShot[k]=byShot[k]||{n:0,worstJerk:0,worstTurn:0,causes:new Set()});const g=byShot[k];g.n++;g.worstJerk=Math.max(g.worstJerk,e.jerk);g.worstTurn=Math.max(g.worstTurn,e.turn);g.causes.add(e.cause)}
    for(const k in byShot)byShot[k].causes=[...byShot[k].causes].join(' | ');
    return {title:SC?.meta?.title,end:END,steps:rows.length,events:ev.length,byShot,worst:ev.sort((a,b)=>b.jerk+b.turn/10-(a.jerk+a.turn/10)).slice(0,6)}})()`, 600000);
  const r = report[name];
  console.log(`\n== ${name}: "${r.title}" ${r.end}s, ${r.events} uneven steps of ${r.steps}`);
  for (const [k, g] of Object.entries(r.byShot)) console.log(`  shot ${k}: ${g.n} steps, worst jump ${g.worstJerk.toFixed(2)} m, worst turn change ${g.worstTurn.toFixed(2)}°  [${g.causes}]`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 1));
if (c.errors.length) console.log('page errors:', c.errors.slice(0, 3).join(' | '));
c.close(); process.exit(0);
