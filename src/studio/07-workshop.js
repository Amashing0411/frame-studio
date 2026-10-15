// Story Workshop: authored toy proportions, extensible assets, deterministic demos.
// All imported extension files are declarative data; no source code is evaluated.
const WORKSHOP_STYLE={id:'market-clay-v1',name:'Market Clay',height:2.02,palette:['#df7557','#e5b852','#388e83','#7689ad','#eedbc0'],rules:['Rounded toy silhouettes; large heads and compact hands.','Warm matte surfaces, small dark eyes, restrained facial details.','Reuse the same proportions and articulated hierarchy for every human.','Ground objects at y=0, face +Z, use meters.','Keep close-up subjects polished; simplify distant background objects.','Inspect assets in the actual scene lighting before accepting them.']};
const workshopActors=new WeakMap(),workshopExtensions=new Map(),workshopGLBs=new Map(),workshopMixers=new WeakMap();
let workshopPacks=[],workshopCrowd=[],workshopProps=[],workshopBrief=null;
function toyMaterial(c,extra={}){const m=new THREE.MeshStandardMaterial({color:c,roughness:.78,metalness:0,flatShading:false,...extra});m.color.convertSRGBToLinear();return m}
// Shared material palette: one material per look, never edited in place. Anything that changes a look (the city clay
// finish, cinema finishes) swaps in a cached variant instead, so sharing can never leak a look to another object.
// Membership is a WeakSet, not userData, so copies made with .clone() are ordinary materials again.
const PALETTE=new Map(),IN_PALETTE=new WeakSet(),PALETTE_SOURCE=new WeakMap(); // finish variant -> the material it was finished from
const isPalette=m=>IN_PALETTE.has(m);
function paletteMaterial(key,make){let m=PALETTE.get(key);if(!m){m=make();IN_PALETTE.add(m);PALETTE.set(key,m)}return m}
// Colours arrive as numbers, CSS strings or THREE.Color objects; the key uses the exact value either way.
const colorKey=c=>c?.isColor?c.r+','+c.g+','+c.b:String(c);
function toyPalette(c,extra={}){return paletteMaterial('toy|'+colorKey(c)+'|'+JSON.stringify(extra,(k,v)=>v?.isColor?colorKey(v):v),()=>toyMaterial(c,extra))}
// A cached variant of a palette material: a fresh copy with `change` applied once.
function paletteVariant(src,key,change){return paletteMaterial(src.uuid+'|'+key,()=>{const v=src.clone();delete v.userData.originalSurface;change(v);return v})}
function toyBall(p,name,xyz,scale,mat){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat);m.name=name;m.position.set(...xyz);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;p.add(m);return m}
function toyBox(p,name,xyz,size,mat,r=.045){
 const [w,h,d]=size,rr=Math.min(r,w/3,h/3,d/3),s=new THREE.Shape();
 s.moveTo(-w/2+rr,-h/2);s.lineTo(w/2-rr,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+rr);s.lineTo(w/2,h/2-rr);s.quadraticCurveTo(w/2,h/2,w/2-rr,h/2);s.lineTo(-w/2+rr,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-rr);s.lineTo(-w/2,-h/2+rr);s.quadraticCurveTo(-w/2,-h/2,-w/2+rr,-h/2);
 const geo=new THREE.ExtrudeGeometry(s,{depth:d-rr*2,bevelEnabled:true,bevelSize:rr*.45,bevelThickness:rr,bevelSegments:2,steps:1,curveSegments:3});geo.translate(0,0,-d/2+rr);const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(...xyz);m.castShadow=m.receiveShadow=true;p.add(m);return m;
}
function toyJoint(p,n,v){const g=new THREE.Group();g.name=n;g.position.set(...v);g.userData.motion=n;p.add(g);return g}
function toyTube(p,n,xyz,top,bottom,h,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,16),m);o.name=n;o.position.set(...xyz);o.castShadow=o.receiveShadow=true;p.add(o);return o}
// A toy character: the jointed rig, restyled with the v3 face, hands and proportions.
// A person: the jointed rig with the v3 face, wearing a glTF cast body when the cast has loaded (src/assets/19-cast.js).
function toyPerson(opts={}){const p=restyleCharacter3(buildToyRig(opts));return CAST.ready?attachCastBody(p,opts):p}
