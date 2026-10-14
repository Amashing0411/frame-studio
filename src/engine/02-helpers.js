// ---- helpers
let MC={};
const safeColor=c=>(c===undefined||c===null||c===''||Number.isNaN(c))?0x808080:c;
const mat=(c,e,ei)=>new THREE.MeshStandardMaterial({color:safeColor(c),flatShading:true,roughness:.85,metalness:.05,emissive:safeColor(e||0),emissiveIntensity:Number.isFinite(ei)?ei:0}),smat=c=>MC[safeColor(c)]||(MC[safeColor(c)]=mat(c));
const mk=(w,h,d,c,e,ei)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,e,ei));
const cyl=(rt,rb,h,sg,c)=>new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sg),mat(c));
const ico=(r,c,d=0)=>new THREE.Mesh(new THREE.IcosahedronGeometry(r,d),mat(c));
let world=new THREE.Group();scene.add(world);
const put=(o,x,y,z,g)=>{o.position.set(x,y,z);(g||world).add(o);return o},flat=o=>{o.userData.nf=true;return o};
function wtex(em){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),r=rngf(3);x.fillStyle=em?'#000':'#fff';x.fillRect(0,0,64,64);
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){if(em){if(r()<.4){x.fillStyle='#ffd98a';x.fillRect(i*16+3,j*16+3,10,9)}}else{x.fillStyle='#3a475f';x.fillRect(i*16+3,j*16+3,10,9);x.fillStyle='#5b6d8a';x.fillRect(i*16+3,j*16+3,10,2)}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
const TM=wtex(false),TE=wtex(true);function isSharedTex(x){return x===TM||x===TE||x===puff}
const wallMat=c=>new THREE.MeshStandardMaterial({color:safeColor(c),map:TM,emissive:0xffffff,emissiveMap:TE,emissiveIntensity:EI,roughness:.85,flatShading:true});
function bgeo(w,h,d){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,dm=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*dm[f][0]/8,uv.getY(k)*dm[f][1]/8)}g.translate(0,h/2,0);return g}
const sh2=pts=>{const s=new THREE.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));return s};
function ex(pts,w,c,b){b=b||.07;const g=new THREE.ExtrudeGeometry(sh2(pts),{depth:w,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:3});g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return new THREE.Mesh(g,typeof c==='number'?mat(c):c)}
const WALL=[0xcfc8b8,0xa9b8c9,0xdcd2c2,0xaeb1b8,0xc2ac96,0x97aba8,0xe0c9a6],ACC=[0xd64541,0x2a7fd0,0xf2b632,0x2fa76a,0x8e5bd6,0xe8803a];
const PASTEL=[0xf2d9b3,0xe8a09a,0xa9d1c4,0xf3e6a8,0xb8c7e8,0xe9c1d6],ROOF=[0xa8493a,0x7a5c46,0x5b6b7a,0x3f5f4a];
const SKIN=[0xf1c9a5,0xd9a47c,0xb97f5a,0x8d5a3b,0xc68f66],HAIR=[0x15110e,0x2a1c12,0x4a3320,0x7a5a3a,0x1b1b22],SHIRT=[0xe84a3c,0x2e7bd6,0xf2c230,0x3aa655,0xf2f2f2,0xff7bb0,0x6b4fbb,0x2a2d36,0x3fb7b0,0xe8803a],PANTS=[0x2a2f44,0x3b3f4a,0x5a6b8a,0x6b5a46,0x1f2430,0x7a7f88,0x8a4a3a];
const vc=[0xe84a3c,0x2e7bd6,0xf2c230,0x3aa655,0xf2f2f2,0xff8a3d,0x8e44ad,0x2a2d36,0x1fa7a0];
let blds=[],veh=[],ppl=[],resc=[],lamps=[],tl=[],birds=[],pig=[],dogs=[],puddles=[],wetM=[],benches=[];
