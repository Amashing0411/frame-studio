#!/usr/bin/env node
// Pose sheet: catalog people in the Model studio view, one column per state at a fixed clip time, one row per
// character, drawn by the engine (applyCatalogPose + the cast body) from the same three-quarter angle.
//   node tools/capture-poses.mjs [url] [out.png] [--people human.civilian.v03,human.police.v01] [--states walk,run]
import { writeFileSync } from 'node:fs';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null };
const people = (flag('--people') || 'human.civilian.v03,human.police.v01,human.zombie.v01').split(',');
const states = (flag('--states') || 'idle,walk,run,zombie,sit,fall,death').split(',');
const [url = 'http://localhost:5173/', out = 'qa/captures/poses.png'] = args;
// clip time per state (seconds); one-shot clips (fall, death) are shown near their end
const TIME = { idle: .8, walk: .45, run: .3, zombie: .5, sit: 1.2, fall: 1.9, death: 1.9, jog: .3, shoot: .3, torch: 1, sword: .4, cower: .6, wave: .6, point: .5, think: .5 };
const W = 300, H = 420;
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1000);
const tiles = [];
for (const id of people) {
  // select twice: the first build asks for the person's model, the second draws it once loaded
  await c.evaluate(`selectCatalog(${JSON.stringify(id)})`); await c.waitFor('!CAST.missing.size && !CAST.loading.size', 60000);
  await c.evaluate(`selectCatalog(${JSON.stringify(id)})`); await sleep(400);
  for (const st of states) {
    tiles.push(await c.evaluate(`(()=>{const o=assetObject,t=${TIME[st] ?? .5};applyCatalogPose(o,${JSON.stringify(st)},0,'neutral');applyCatalogPose(o,${JSON.stringify(st)},t,'neutral');syncCastBodies();o.updateMatrixWorld(true);
      const box=visibleBox?visibleBox(o):new THREE.Box3().setFromObject(o),ctr=box.getCenter(new THREE.Vector3()),r=assetRenderer,cam=assetPerspective,size=r.getSize(new THREE.Vector2());
      r.setSize(${W},${H},false);cam.aspect=${W}/${H};cam.fov=30;const ht=Math.max(1,box.max.y-box.min.y),d=ht*2.7;cam.position.set(ctr.x+d*.42,box.min.y+ht*.62,ctr.z+d);cam.lookAt(ctr.x,box.min.y+ht*.48,ctr.z);cam.updateProjectionMatrix();
      r.render(assetScene,cam);const url=r.domElement.toDataURL('image/png');r.setSize(size.x,size.y,false);return {id:${JSON.stringify(id)},st:${JSON.stringify(st)},url,clip:workshopActors.get(o)?.castAnim?.clip||'-'}})()`));
  }
}
const png = await c.evaluate(`(async()=>{const T=${JSON.stringify(tiles.map(t => [t.id, t.st, t.url, t.clip]))},cols=${states.length},W=${W},H=${H};const k=document.createElement('canvas');k.width=cols*W;k.height=Math.ceil(T.length/cols)*(H+26);const x=k.getContext('2d');x.fillStyle='#1b1d22';x.fillRect(0,0,k.width,k.height);
  const img=u=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.src=u});
  for(let i=0;i<T.length;i++){const [id,st,u,clip]=T[i],X=(i%cols)*W,Y=Math.floor(i/cols)*(H+26);x.drawImage(await img(u),X,Y+26);x.fillStyle='#fff';x.font='bold 14px sans-serif';x.fillText(st+(clip!==st?' ('+clip+')':''),X+8,Y+18);if(i%cols===0){x.fillStyle='#aaa';x.font='12px sans-serif';x.fillText(id,X+8,Y+H+20)}}
  return k.toDataURL('image/png')})()`);
writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
console.log('wrote', out, c.errors.length ? 'page errors: ' + c.errors.slice(0, 3).join(' | ') : '');
c.close(); process.exit(0);
