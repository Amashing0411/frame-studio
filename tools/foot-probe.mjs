#!/usr/bin/env node
// Foot-slide probe: steps a story at 60 steps/s and, for every cast person walking, running or shambling, follows the
// lowest ground point (heel or toe): while the same point stays the lowest (the planted one the engine pins to the
// floor), its travel along the ground is sliding. Reports, per story, the slide as a share of the distance walked (0% = feet perfectly planted) and the
// worst person. A good result keeps the median under a few percent.
//   node tools/foot-probe.mjs [url] [--only earthquake,outbreak] [--seconds 6]
import { launch, sleep, seek, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null };
const only = flag('--only'), secs = +(flag('--seconds') || 6), url = args[0] || 'http://localhost:5173/';
const STORIES = { market: [`loadMarketDemo(true)`, false, 2], earthquake: [`document.getElementById('bq').click()`, true, 14], outbreak: [`document.getElementById('bz').click()`, true, 18] };
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1000);
for (const name of only ? only.split(',') : Object.keys(STORIES)) {
  const [load, validate, at] = STORIES[name];
  await c.evaluate(load); await sleep(800); await c.waitFor('!seeking', 120000);
  if (validate) { await c.evaluate(`document.getElementById('bv').click()`); await sleep(800); await c.waitFor('!seeking', 120000); }
  await seek(c, at);
  const r = await c.evaluate(`(()=>{const walkers=new Set(['walk','run','sprint','zombie','jog','carry','walk_formal','crouch_walk']),stats=new Map(),v=new THREE.Vector3();
    const people=[...CAST.people].filter(p=>p.cast&&p.g.parent);
    for(let i=0;i<${Math.round(secs * 60)};i++){simulating=true;stepCount++;step(1/60,stepCount/60);simulating=false;
      for(const p of people){castApply(p);const clip=p.castAnim.clip;if(!walkers.has(clip))continue;p.g.updateMatrixWorld(true);
        let s=stats.get(p);if(!s){s={id:p.cast.id,clip,slide:0,dist:0,prev:null,pos:null};stats.set(p,s)}
        const pos=p.g.getWorldPosition(new THREE.Vector3());if(s.pos)s.dist+=Math.hypot(pos.x-s.pos.x,pos.z-s.pos.z);s.pos=pos;
        const pts=p.cast.ground.map(g=>g.o.getWorldPosition(new THREE.Vector3()));
        // the stance point: the lowest ground point (the one castGround pins to the floor); its travel while it stays
        // the lowest point is sliding (a swinging toe brushing the floor is not counted)
        let low=0;for(let k=1;k<pts.length;k++)if(pts[k].y<pts[low].y)low=k;
        if(s.prev&&s.low===low)s.slide+=Math.hypot(pts[low].x-s.prev[low].x,pts[low].z-s.prev[low].z);
        s.prev=pts;s.low=low}}
    const rows=[...stats.values()].filter(s=>s.dist>1).map(s=>({id:s.id,clip:s.clip,dist:+s.dist.toFixed(2),pct:+(100*s.slide/s.dist).toFixed(1)})).sort((a,b)=>a.pct-b.pct);
    const med=rows.length?rows[Math.floor(rows.length/2)].pct:null;return {people:rows.length,median:med,worst:rows.slice(-3),best:rows.slice(0,2)}})()`, 300000);
  console.log(`${name.padEnd(11)} ${r.people} walkers, median foot slide ${r.median}% of distance  worst: ${r.worst.map(w => `${w.id} ${w.clip} ${w.pct}%`).join(', ')}`);
}
if (c.errors.length) console.log('page errors:', c.errors.slice(0, 3).join(' | '));
c.close(); process.exit(0);
