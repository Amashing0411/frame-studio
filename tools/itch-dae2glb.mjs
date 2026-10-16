#!/usr/bin/env node
// Converts Collada (.dae) files to GLB in headless Chrome with three's ColladaLoader and GLTFExporter (Blender 5 no
// longer imports Collada). Waits for every texture; drops textures that fail to load. Files are served by the dev
// server (project-relative URLs). Prints one "INV {json}" line per file (used by tools/convert-itch.sh).
//   node tools/itch-dae2glb.mjs <outDir> <file.dae> ...
import { writeFileSync } from 'node:fs';
import { relative, basename, resolve } from 'node:path';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';
const [out, ...files] = process.argv.slice(2), root = resolve(import.meta.dirname, '..');
const c = await launch(); await c.open('http://localhost:5173/'); await c.waitFor(STUDIO_READY, 120000); await sleep(500);
await c.evaluate(`new Promise((ok,fail)=>{const s=document.createElement('script');s.src='/node_modules/three/examples/js/loaders/ColladaLoader.js';s.onload=ok;s.onerror=fail;document.head.appendChild(s)})`);
for (const f of files) {
  const url = '/' + relative(root, f).split(/[\\/]/).map(encodeURIComponent).join('/');
  const r = await c.evaluate(`new Promise(ok=>{const mgr=new THREE.LoadingManager(),missing=[];let scene=null,done=false;mgr.onError=u=>missing.push(u);mgr.onLoad=()=>{if(done||!scene)return;done=true;finish()};new THREE.ColladaLoader(mgr).load(${JSON.stringify(url)},d=>{scene=d.scene},undefined,e=>ok({error:String(e&&e.message||e)}));function finish(){scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material))if(m.map&&!(m.map.image&&m.map.image.width))m.map=null});let tris=0,meshes=0;const mats=new Set(),imgs=new Set();scene.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3;for(const m of [].concat(o.material)){mats.add(m.name);if(m.map?.image?.src)imgs.add(decodeURIComponent(m.map.image.src.split('/').pop()))}});
    new THREE.GLTFExporter().parse(scene,buf=>{const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));ok({glb:btoa(s),meshes,tris,mats:[...mats],imgs:[...imgs],missing})},{binary:true,embedImages:true})}})`, 300000);
  if (r.error) { console.log('INV ' + JSON.stringify({ file: f, error: r.error })); continue; }
  const dest = `${out}/${basename(f, '.dae').replace(/ /g, '_')}.glb`; writeFileSync(dest, Buffer.from(r.glb, 'base64'));
  console.log('INV ' + JSON.stringify({ file: f, glb: dest, objects: Array(r.meshes).fill(''), tris: r.tris, materials: r.mats, images: r.imgs, missing: r.missing, armatures: 0, actions: [] }));
}
if (c.errors.length) console.error('page errors:', c.errors.slice(0, 3).join(' | '));
c.close(); process.exit(0);
