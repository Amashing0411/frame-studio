// Story Workshop: authored toy proportions, extensible assets, deterministic demos.
// All imported extension files are declarative data; no source code is evaluated.
const WORKSHOP_STYLE={id:'market-clay-v1',name:'Market Clay',height:2.02,palette:['#df7557','#e5b852','#388e83','#7689ad','#eedbc0'],rules:['Rounded toy silhouettes; large heads and compact hands.','Warm matte surfaces, small dark eyes, restrained facial details.','Reuse the same proportions and articulated hierarchy for every human.','Ground objects at y=0, face +Z, use meters.','Keep close-up subjects polished; simplify distant background objects.','Inspect assets in the actual scene lighting before accepting them.']};
const workshopActors=new WeakMap(),workshopExtensions=new Map(),workshopGLBs=new Map(),workshopMixers=new WeakMap();
let workshopPacks=[],workshopCrowd=[],workshopProps=[],workshopBrief=null;
function toyMaterial(c,extra={}){const m=new THREE.MeshStandardMaterial({color:c,roughness:.78,metalness:0,flatShading:false,...extra});m.color.convertSRGBToLinear();return m}
function toyBall(p,name,xyz,scale,mat){const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat);m.name=name;m.position.set(...xyz);m.scale.set(...scale);m.castShadow=m.receiveShadow=true;p.add(m);return m}
function toyBox(p,name,xyz,size,mat,r=.045){
 const [w,h,d]=size,rr=Math.min(r,w/3,h/3,d/3),s=new THREE.Shape();
 s.moveTo(-w/2+rr,-h/2);s.lineTo(w/2-rr,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+rr);s.lineTo(w/2,h/2-rr);s.quadraticCurveTo(w/2,h/2,w/2-rr,h/2);s.lineTo(-w/2+rr,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-rr);s.lineTo(-w/2,-h/2+rr);s.quadraticCurveTo(-w/2,-h/2,-w/2+rr,-h/2);
 const geo=new THREE.ExtrudeGeometry(s,{depth:d-rr*2,bevelEnabled:true,bevelSize:rr*.45,bevelThickness:rr,bevelSegments:2,steps:1,curveSegments:3});geo.translate(0,0,-d/2+rr);const m=new THREE.Mesh(geo,mat);m.name=name;m.position.set(...xyz);m.castShadow=m.receiveShadow=true;p.add(m);return m;
}
function toyJoint(p,n,v){const g=new THREE.Group();g.name=n;g.position.set(...v);g.userData.motion=n;p.add(g);return g}
function toyTube(p,n,xyz,top,bottom,h,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,16),m);o.name=n;o.position.set(...xyz);o.castShadow=o.receiveShadow=true;p.add(o);return o}
function toyPerson({variant=0,color='#388e83',role='casual',accessories=[],proportion=1,clothMaterial=null}={}){
 const g=new THREE.Group(),skin=toyMaterial([0xe0ab83,0xba7d57,0x865639,0xd19a75,0xf0c9a0,0xa9714e][variant%6]),cloth=clothMaterial||toyMaterial(color),pants=toyMaterial([0x35465a,0x484843,0x6d5360][variant%3]),hair=toyMaterial(role==='elder'?0xb9b6a5:[0x2d2524,0x453025,0x272d30,0x745040][variant%4]),dark=toyMaterial(0x292a2e),cream=toyMaterial(0xf4e8d2),rose=toyMaterial(0x9c513e);cloth.flatShading=false;
 const hip=toyJoint(g,'Hips',[0,.95,0]),sp=toyJoint(hip,'Spine',[0,.2,0]),ch=toyJoint(sp,'Chest',[0,.06,0]),hd=toyJoint(ch,'Head',[0,.35,0]),hc=new THREE.Group();hc.position.y=.19;hd.add(hc);
 toyBall(hip,'HipsShape',[0,-.02,0],[.225,.14,.15],pants);
 const pts=[[.195,-.15],[.225,-.13],[.25,-.04],[.26,.14],[.245,.25],[.19,.29],[.10,.30]].map(p=>new THREE.Vector2(...p));const torso=new THREE.Mesh(new THREE.LatheGeometry(pts,20),cloth);torso.scale.z=.70;torso.castShadow=torso.receiveShadow=true;ch.add(torso);
 toyTube(ch,'Collar',[0,.30,0],.09,.115,.07,cream);toyTube(ch,'Neck',[0,.35,0],.075,.075,.12,skin);
 toyBall(hc,'HeadShape',[0,0,0],[.257,.287,.238],skin);for(const side of[-1,1])toyBall(hc,'Ear'+side,[side*.246,-.005,0],[.042,.057,.037],skin);
 const cap=new THREE.Mesh(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,1.31),hair);cap.name='HairCap';cap.scale.set(.268,.302,.251);cap.position.set(0,.002,-.012);hc.add(cap);cap.castShadow=true;
 const cut=variant%4;if(cut===0){toyBall(hc,'Fringe',[-.08,.17,.16],[.17,.08,.08],hair)}else if(cut===1){toyBall(hc,'Bun',[.04,.25,-.18],[.13,.13,.115],hair)}else if(cut===2){toyBall(hc,'HairBack',[0,-.03,-.17],[.25,.26,.11],hair);toyBall(hc,'Fringe',[.11,.17,.14],[.11,.07,.08],hair)}
 const fc=new THREE.Group();fc.position.set(0,.025,.042);fc.scale.setScalar(1.40);hc.add(fc);
 const eyes=[],pupils=[],brows=[];for(const side of[-1,1]){const suffix=side<0?'L':'R',eye=toyJoint(fc,'Eye'+suffix,[side*.060,.02,.137]);const white=toyBall(eye,'EyeWhite',[0,0,0],[.018,.023,.008],dark);const pupil=toyBall(eye,'EyeGlint',[-.004,.007,.008],[.0048,.005,.003],cream);const brow=toyJoint(fc,'Brow'+suffix,[side*.060,.075,.132]);toyBox(brow,'BrowShape',[0,0,0],[.048,.009,.011],hair,.003);eyes.push(white);pupils.push(pupil);brows.push(brow)}
 toyBall(fc,'Nose',[0,-.009,.14],[.017,.021,.021],skin);const mouth=toyJoint(fc,'Mouth',[0,-.055,.14]);const mo=new THREE.Mesh(new THREE.TorusGeometry(.029,.0045,6,16,Math.PI),rose);mo.rotation.z=Math.PI;mouth.add(mo);const mop=toyBall(fc,'OpenMouth',[0,-.056,.139],[.022,.026,.009],rose);mop.visible=false;
 const arms=[];for(const side of[-1,1]){const suffix=side<0?'L':'R',sh=toyJoint(ch,'UpperArm'+suffix,[side*.276,.20,0]),el=toyJoint(sh,'Forearm'+suffix,[0,-.27,0]),ha=toyJoint(el,'Hand'+suffix,[0,-.25,0]);toyBall(sh,'Shoulder',[0,0,0],[.10,.103,.105],cloth);toyTube(sh,'Sleeve',[0,-.09,0],.096,.089,.20,cloth);toyBall(sh,'SleeveHem',[0,-.19,0],[.09,.04,.085],cloth);toyTube(el,'Forearm',[0,-.10,0],.067,.055,.21,skin);toyBall(el,'Elbow',[0,0,0],[.067,.067,.065],skin);toyBall(ha,'Mitten',[0,-.025,.008],[.075,.079,.057],skin);arms.push({sh,el,ha})}
 const legs=[];for(const side of[-1,1]){const suffix=side<0?'L':'R',hp=toyJoint(hip,'Thigh'+suffix,[side*.116,0,0]),kn=toyJoint(hp,'Shin'+suffix,[0,-.44,0]),ft=toyJoint(kn,'Foot'+suffix,[0,-.40,0]);toyTube(hp,'Trouser',[0,-.22,0],.105,.09,.44,pants);toyBall(kn,'Knee',[0,0,0],[.09,.085,.09],pants);toyTube(kn,'Shin',[0,-.18,0],.089,.079,.37,pants);toyBox(ft,'Shoe',[0,-.035,.065],[.18,.13,.31],cream,.045);toyBox(ft,'Sole',[0,-.086,.065],[.185,.036,.316],dark,.013);legs.push({hp,kn,ft})}
 const acc=(id,parent)=>{const o=new THREE.Group();o.name='Accessory_'+id;o.userData.accessory=id;parent.add(o);o.visible=accessories.includes(id);return o};
 toyBox(acc('backpack',ch),'Backpack',[0,.09,-.23],[.35,.39,.16],toyMaterial(0xd8a34e),.07);
 const hat=acc('cap',hc);toyBall(hat,'Cap',[0,.22,-.014],[.27,.10,.245],cloth);toyBox(hat,'Brim',[0,.17,.21],[.25,.025,.20],cloth,.009);
 const helmet=acc('helmet',hc);toyBall(helmet,'Helmet',[0,.16,0],[.285,.19,.265],toyMaterial(0xe6bb50));
 const glasses=acc('glasses',fc);for(const side of[-1,1]){const o=new THREE.Mesh(new THREE.TorusGeometry(.034,.0045,6,16),dark);o.position.set(side*.060,.02,.153);glasses.add(o)}toyBox(glasses,'Bridge',[0,.02,.155],[.05,.006,.009],dark,.002);
 toyBox(acc('mask',fc),'Mask',[0,-.025,.151],[.15,.065,.026],toyMaterial(0x97c4bf),.009);
 toyBox(acc('vest',ch),'Vest',[0,.04,.005],[.51,.34,.375],toyMaterial(0xe3a342),.05);
 toyBox(acc('bag',arms[0].ha),'Tote',[0,-.23,0],[.29,.34,.13],toyMaterial(0xdcc69b),.02);
 const um=acc('umbrella',g);toyTube(um,'Handle',[.35,1.55,0],.016,.016,1.35,dark);const umb=new THREE.Mesh(new THREE.ConeGeometry(.78,.26,16),cloth);umb.position.set(.35,2.30,0);um.add(umb);
 const phone=toyJoint(arms[1].ha,'HeldPhone',[0,0,0]);toyBox(phone,'Phone',[0,-.02,.05],[.075,.135,.016],dark,.008);phone.visible=false;
 const news=toyJoint(ch,'HeldParcel',[0,0,0]);toyBox(news,'Parcel',[0,0,.38],[.42,.30,.28],toyMaterial(0xcba977),.02);news.visible=false;
 if(role==='vendor'||role==='chef'){toyBox(ch,'Apron',[0,-.045,.194],[.36,.34,.025],cream,.014);toyBox(ch,'ApronBib',[0,.17,.187],[.23,.13,.025],cream,.012);toyBox(ch,'Pocket',[0,-.09,.214],[.17,.10,.014],cloth,.008)}
 const sc=(role==='child'?.68:role==='elder'?.94:1)*proportion;g.scale.setScalar(sc);g.userData.styleId=WORKSHOP_STYLE.id;
 g.traverse(o=>{if(o.userData.motion){o.userData.restPosition=o.position.toArray();o.userData.restQuaternion=o.quaternion.toArray();o.userData.restScale=o.scale.toArray()}});
 const p={g,pv:hip,sp,ch,hd,fc,hp:legs.map(x=>x.hp),kn:legs.map(x=>x.kn),sh:arms.map(x=>x.sh),el:arms.map(x=>x.el),phone,news,um,hasU:variant%4===0,e:eyes,p:pupils,b:brows,mo,mop,eyeP:dark,skM:skin,shM:cloth,sk0:skin.color.clone(),sh0:cloth.color.clone(),x:0,z:0,yaw:0,f:V(0,0,1),sc,fem:variant%2===0,age:role==='child'?'kid':role==='elder'?'elder':'adult',ph:variant*.8,ph2:variant*1.1,sp0:1.1,run:3.2,rd:.2,mode:'calm',cr:0,fall:0,inf:0,zm:false,j:{...IDLE},T:{...IDLE},F:{e:1,ba:0,bh:0,c:0,o:0,w:1},bt:3,bd:0,mood:'happy',role:'civ'};
 workshopActors.set(g,p);return p;
}
