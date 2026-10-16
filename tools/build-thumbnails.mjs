#!/usr/bin/env node
// Renders a picture of every catalog model type (one per archetype, its first preset) with the engine itself: same
// light, same three-quarter angle, fitted to the model, transparent background (so it suits light and dark). Writes
// public/assets/thumbs/<archetype>.webp; tools/build-manifest.mjs lists them for the asset library grid.
//   node tools/build-thumbnails.mjs [url]        (default http://localhost:5173/, the dev server)
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const url = process.argv[2] || 'http://localhost:5173/', SIZE = 192;
const out = resolve(import.meta.dirname, '../public/assets/thumbs'); mkdirSync(out, { recursive: true });
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(1500);
const ids = await c.evaluate(`CATALOG_BASE.map(b=>b.id)`);
await c.evaluate(`(()=>{const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(${SIZE},${SIZE});r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
  const s=new THREE.Scene();s.add(new THREE.HemisphereLight(0xffffff,0x8a7a6a,1.05));const d=new THREE.DirectionalLight(0xffffff,1.5);d.position.set(3,6,4);s.add(d);const b=new THREE.DirectionalLight(0xffffff,.45);b.position.set(-4,2,-3);s.add(b);
  window.__thumb={r,s,cam:new THREE.PerspectiveCamera(28,1,.01,2000)}})()`);
let n = 0;
for (const id of ids) {
  const png = await c.evaluate(`(()=>{const {r,s,cam}=window.__thumb,entry=catalogEntries.find(e=>e.archetype===${JSON.stringify(id)}&&e.variant===0)||catalogEntries.find(e=>e.archetype===${JSON.stringify(id)});if(!entry)return null;
    const root=buildCatalogModel(entry.id);try{applyCatalogPose(root,entry.states.includes('idle')?'idle':entry.states[0],.6)}catch(e){}
    const shadow=root.getObjectByName('Contact shadow');if(shadow)shadow.visible=false;s.add(root);root.updateMatrixWorld(true);if(typeof syncCastBodies==='function')syncCastBodies();root.updateMatrixWorld(true);
    const box=typeof visibleBox==="function"?visibleBox(root):new THREE.Box3().setFromObject(root),sp=box.getBoundingSphere(new THREE.Sphere()),sz=box.getSize(new THREE.Vector3()),dir=new THREE.Vector3(1,.55,1.5).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(cam.fov/2)),dist=Math.max(sz.y,Math.hypot(sz.x,sz.z)*.8)/2/tan*1.12+Math.max(sz.x,sz.z)/2;
    cam.position.copy(sp.center).addScaledVector(dir,dist);cam.near=dist/100;cam.far=dist*4;cam.lookAt(sp.center);cam.updateProjectionMatrix();
    r.render(s,cam);const url=r.domElement.toDataURL('image/webp',.86);s.remove(root);disposeCatalogModel(root);return url})()`);
  if (!png) { console.log('skip', id); continue; }
  writeFileSync(join(out, id + '.webp'), Buffer.from(png.split(',')[1], 'base64')); n++;
}
console.log(`${n} thumbnails written to public/assets/thumbs`, c.errors.length ? 'page errors: ' + c.errors.slice(0, 3).join(' | ') : '');
c.close(); process.exit(0);
