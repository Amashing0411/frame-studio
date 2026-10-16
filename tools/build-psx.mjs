#!/usr/bin/env node
// Builds the PSX catalog models: public/assets/psx/<id>.glb + build-report.json, from the converted itch.io sources in
// qa/asset-src/itch/glb (tools/convert-itch.sh) and the table in tools/psx-catalog.mjs. Runs the engine's own three.js
// (r128) in headless Chrome against the dev server, so every file is written by, and readable with, the same loader.
// Each model: the chosen objects, skinned meshes frozen in their rest pose, geometry baked to one space, scaled to its
// real size, centred, standing at y=0, facing +Z; textures shrunk to PSX size (256 px, 128 for small things; opaque
// ones saved as JPEG); materials made plain (metalness 0, no transmission). Then run tools/build-manifest.mjs.
//   node tools/build-psx.mjs [url] [--only id,id]
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';
import { CATALOG, PACKS } from './psx-catalog.mjs';

const args = process.argv.slice(2), oi = args.indexOf('--only'), only = oi >= 0 ? args.splice(oi, 2)[1].split(',') : null;
const url = args[0] || 'http://localhost:5173/', root = resolve(import.meta.dirname, '..');
const out = join(root, 'public/assets/psx'); mkdirSync(out, { recursive: true });
const reportPath = join(out, 'build-report.json'), report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : { models: {} };
const c = await launch(); await c.open(url); await c.waitFor(STUDIO_READY, 120000); await sleep(500);
let failed = 0;
for (const row of CATALOG.filter(r => !only || only.includes(r.id))) {
  const src = '/qa/asset-src/itch/glb/' + encodeURIComponent(row.src);
  const small = ['food', 'animal', 'prop', 'rock'].includes(row.category);
  const r = await c.evaluate(`(async()=>{const row=${JSON.stringify(row)},maxTex=${small ? 128 : 256};
    const g=await new Promise((ok,no)=>new THREE.GLTFLoader().load(${JSON.stringify(src)},ok,undefined,no));const scene=g.scene;scene.updateMatrixWorld(true);
    const picks=row.objects.length?row.objects.map(n=>{const o=scene.getObjectByName(n);if(!o)throw Error('no object '+n+' in '+row.src);return o}):[scene];
    const meshes=[];for(const p of picks)p.traverse(o=>{if(o.isMesh&&o.visible!==false)meshes.push(o)});if(!meshes.length)throw Error('no meshes');
    // freeze each mesh in world space (skinned meshes in their bind pose), drop skin attributes
    const group=new THREE.Group(),texCache=new Map();
    const shrink=t=>{if(!t||!t.image)return null;if(texCache.has(t))return texCache.get(t);const im=t.image,w=im.width,h=im.height,k=Math.min(1,maxTex/Math.max(w,h)),cw=Math.max(8,Math.round(w*k)),ch=Math.max(8,Math.round(h*k));
      const cv=document.createElement('canvas');cv.width=cw;cv.height=ch;const x=cv.getContext('2d');x.drawImage(im,0,0,cw,ch);const d=x.getImageData(0,0,cw,ch).data;let alpha=false;for(let i=3;i<d.length;i+=4)if(d[i]<250){alpha=true;break}
      const n=new THREE.CanvasTexture(cv);n.flipY=t.flipY;n.wrapS=t.wrapS;n.wrapT=t.wrapT;n.encoding=THREE.sRGBEncoding;n.format=alpha?THREE.RGBAFormat:THREE.RGBFormat;n.userData={alpha};texCache.set(t,n);return n};
    const matCache=new Map(),plain=m=>{if(matCache.has(m))return matCache.get(m);const map=shrink(m.map),n=new THREE.MeshStandardMaterial({name:m.name,color:m.color?m.color.clone():0xffffff,map,roughness:.9,metalness:0,side:m.side,transparent:false,alphaTest:map&&map.userData.alpha?.5:0,vertexColors:!!m.vertexColors});matCache.set(m,n);return n};
    let tris=0;for(const o of meshes){const geo=new THREE.BufferGeometry();for(const k of ['position','normal','uv','color'])if(o.geometry.attributes[k])geo.setAttribute(k,o.geometry.attributes[k].clone());if(o.geometry.index)geo.setIndex(o.geometry.index.clone());
      for(const gr of o.geometry.groups)geo.addGroup(gr.start,gr.count,gr.materialIndex);
      if(o.isSkinnedMesh){o.skeleton.update();const p=geo.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){o.boneTransform(i,v);p.setXYZ(i,v.x,v.y,v.z)}geo.computeVertexNormals()}
      geo.applyMatrix4(o.matrixWorld);const mats=Array.isArray(o.material)?o.material.map(plain):plain(o.material);const m=new THREE.Mesh(geo,mats);m.name=o.name;group.add(m);tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3}
    // size, centre, ground
    let box=new THREE.Box3().setFromObject(group),size=box.getSize(new THREE.Vector3());const f=row.fit,k=f.height?f.height/size.y:f.length?f.length/Math.max(size.x,size.z):(f.scale||1);
    const T=new THREE.Matrix4().makeRotationY((row.rotY||0)*Math.PI/2).multiply(new THREE.Matrix4().makeScale(k,k,k)).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2));
    group.children.forEach(m=>{m.geometry.applyMatrix4(T);m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere()});box=new THREE.Box3().setFromObject(group);size=box.getSize(new THREE.Vector3());
    group.name=row.id;const buf=await new Promise(ok=>new THREE.GLTFExporter().parse(group,ok,{binary:true,embedImages:true}));
    const b=new Uint8Array(buf);let s='';for(let i=0;i<b.length;i+=32768)s+=String.fromCharCode.apply(null,b.subarray(i,i+32768));
    return {glb:btoa(s),tris,meshes:meshes.length,materials:matCache.size,textures:texCache.size,size:size.toArray().map(v=>+v.toFixed(2))}})()`, 300000).catch(e => ({ error: e.message }));
  if (r.error) { failed++; console.log('FAIL', row.id, r.error.split('\n')[0]); continue; }
  const bytes = Buffer.from(r.glb, 'base64'); writeFileSync(join(out, row.id + '.glb'), bytes);
  report.models[row.id] = { name: row.name, category: row.category, states: row.states, size: r.size, tris: r.tris, materials: r.materials, textures: r.textures, bytes: bytes.length, source: { ...PACKS[row.pack], file: row.src, objects: row.objects } };
  console.log(`${row.id.padEnd(26)} ${r.size.join('x').padEnd(18)} ${String(r.tris).padStart(6)} tris  ${r.materials} mats  ${(bytes.length / 1024).toFixed(0)} KB`);
}
// drop report rows whose model left the catalog
for (const id of Object.keys(report.models)) if (!CATALOG.some(r => r.id === id)) delete report.models[id];
writeFileSync(reportPath, JSON.stringify(report, null, 1) + '\n');
// credits: one row per model, between markers in public/models/CREDITS.md (rewritten on every build)
const credits = join(root, 'public/models/CREDITS.md'), notice = 'One or more textures bundled with this project have been created with images from Textures.com. These images may not be redistributed by default. Please visit www.textures.com for more information.';
const table = ['<!-- psx:start -->', '## PSX catalog models', '', 'Downloaded from itch.io (free downloads) on 2026-10-16 into `qa/asset-src/itch/`, converted by `tools/convert-itch.sh` and', 'built by `tools/build-psx.mjs` into `public/assets/psx/` (sized, centred, textures reduced to PSX size). The elbolilloduro', 'packs carry the author\'s Textures.com notice: "' + notice + '"', 'The project owner has the authors\' permission to use these models in Frame Studio (direct messages, October 2026).', '', '| File | Model | Pack | Author | License | Source |', '|---|---|---|---|---|---|',
  ...Object.entries(report.models).map(([id, m]) => `| ../assets/psx/${id}.glb | ${m.name} | ${m.source.name} | ${m.source.author} | ${m.source.license} | ${m.source.url} |`), '<!-- psx:end -->'].join('\n');
let text = readFileSync(credits, 'utf8').replace(/\r\n/g, '\n');
text = /<!-- psx:start -->[\s\S]*<!-- psx:end -->/.test(text) ? text.replace(/<!-- psx:start -->[\s\S]*<!-- psx:end -->/, table) : text.trimEnd() + '\n\n' + table + '\n';
writeFileSync(credits, text);
const total = Object.values(report.models).reduce((s, m) => s + m.bytes, 0);
console.log(`${Object.keys(report.models).length} PSX models, ${(total / 2 ** 20).toFixed(1)} MB${failed ? ', ' + failed + ' FAILED' : ''}`, c.errors.length ? 'page errors: ' + c.errors.slice(0, 2).join(' | ') : '');
c.close(); process.exit(failed ? 1 : 0);
