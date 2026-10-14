// ---- light, sky, weather
const hemi=new THREE.HemisphereLight(0xdfe6ff,0x6b5d4a,.9),sun=new THREE.DirectionalLight(0xffc890,1.2);let hemiBase=.9;
sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const shc=sun.shadow.camera;shc.left=-150;shc.right=150;shc.top=150;shc.bottom=-150;shc.near=10;shc.far=520;sun.shadow.bias=-.0006;scene.add(hemi,sun);
const hx=n=>'#'+n.toString(16).padStart(6,'0');
const puff=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
const mkSpr=(col,add)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puff,color:col,transparent:true,depthWrite:false,fog:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending}));scene.add(s);return s};
const sunS=mkSpr(0xffd9a0,true),moonS=mkSpr(0xdfe8ff,false),clouds=[];
// Sky setup has its own seeded stream so clouds, stars and rain start the same every time, without shifting the world's R/Q sequences.
const SKY=rngf(2026);
for(let i=0;i<36;i++){const s=mkSpr(0xffffff,false),sc=90+SKY()*90;s.material.opacity=.5+SKY()*.3;s.scale.set(sc*1.8,sc*.7,1);s.position.set((SKY()-.5)*1100,300+SKY()*80,(SKY()-.5)*1100);clouds.push({s,v:2+SKY()*3})}
const stars=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({size:2,sizeAttenuation:false,color:0xffffff,fog:false}));
{const a=[];for(let i=0;i<400;i++){const u=SKY()*6.28,v=.1+SKY()*1.3;a.push(Math.cos(u)*Math.cos(v)*900,Math.sin(v)*900,Math.sin(u)*Math.cos(v)*900)}stars.geometry.setAttribute('position',new THREE.Float32BufferAttribute(a,3));scene.add(stars)}
const RN=500,rainG=new THREE.BufferGeometry(),rainP=new Float32Array(RN*6),rainL=[];for(let i=0;i<RN;i++)rainL.push([SKY()*60-30,SKY()*40-20,SKY()*60-30]);
rainG.setAttribute('position',new THREE.BufferAttribute(rainP,3).setUsage(THREE.DynamicDrawUsage));
const rain=new THREE.LineSegments(rainG,new THREE.LineBasicMaterial({color:0xbfd0e8,transparent:true,opacity:.4,fog:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
const TOD={golden:{sky:[0x3b4a78,0xe9a37a,0xffc58f],fog:0xe3a47d,sun:0xffc088,si:1.3,hi:.8,p:[-150,60,110],cc:0xf4c2a4},day:{sky:[0x4f86c6,0xa9cdee,0xdfeaf2],fog:0xcfdde8,sun:0xfff2d8,si:1.5,hi:1,p:[-70,140,90],cc:0xffffff},night:{sky:[0x05070f,0x121a33,0x2a3350],fog:0x141b30,sun:0x8aa0e0,si:.45,hi:.5,p:[40,90,40],cc:0x3a4260}};
let EI=.5,WX={};
function setTOD(tod,wx,hz){const night=/night|midnight/i.test(tod),gold=/rush|late|dusk|evening|sunset|golden|dawn/i.test(tod),rainy=/rain|storm|typhoon|drizzle|thunder/i.test(wx),storm=/storm|typhoon|thunder/i.test(wx),fog=/fog|mist/i.test(wx),ov=rainy||fog||/overcast|gr[ae]y|smoke|haze|gloom|cloud/i.test(wx);
 WX={rain:rainy,storm,fog,over:ov,night,gold};let t={...(night?TOD.night:gold?TOD.golden:TOD.day)};t.sky=[...t.sky];
 if(ov&&!night){t.sky=[0x5f6773,0x848b96,0xa4aab3];t.fog=0x8c929b;t.si*=.45;t.hi*=1.15;t.cc=0x9aa1ab}
 if(hz==='zombie'){const g=new THREE.Color(0x6f8a5c);t.sky=t.sky.map(c=>new THREE.Color(c).lerp(g,.28).getHex());t.fog=new THREE.Color(t.fog).lerp(g,.3).getHex()}
 EI=night?1.7:gold?.7:.15;const c=document.createElement('canvas');c.width=4;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,hx(t.sky[0]));g.addColorStop(.7,hx(t.sky[1]));g.addColorStop(1,hx(t.sky[2]));x.fillStyle=g;x.fillRect(0,0,4,256);
 if(scene.background&&scene.background.isTexture)scene.background.dispose();scene.background=new THREE.CanvasTexture(c);scene.fog=new THREE.Fog(t.fog,rainy||fog?50:160,rainy||fog?320:520);sun.color.set(t.sun);sun.intensity=t.si;hemi.intensity=hemiBase=t.hi;sun.position.set(...t.p);
 const d=V(...t.p).normalize().multiplyScalar(850);sunS.visible=!night;sunS.position.copy(d);sunS.scale.setScalar(gold?420:300);sunS.material.color.set(t.sun);sunS.material.opacity=ov?.4:1;
 moonS.visible=night;moonS.position.copy(d);moonS.scale.setScalar(150);stars.visible=night&&!ov;
 clouds.forEach((k,i)=>{k.s.visible=ov||i<14;k.s.material.color.set(t.cc)});rain.visible=rainy}
