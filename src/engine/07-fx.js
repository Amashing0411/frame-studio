// ---- fx objects
const truck=new THREE.Group();{const a=mk(2.4,1.8,6,0xd02a24),b=mk(2.1,.5,3,0xf2f2f2),c2=mk(2.2,.3,.1,0xffffff,0x4488ff,1);a.position.y=1.2;b.position.set(0,2.3,-.8);c2.position.set(0,2.4,2.2);truck.add(a,b,c2);truck.visible=false;scene.add(truck)}
const heli=new THREE.Group(),rotor=mk(16,.12,.5,0x222222);{const b=mk(2.4,2,6,0x3a4a3a),t=mk(.6,.6,6,0x3a4a3a);t.position.z=-5;rotor.position.y=1.5;heli.add(b,t,rotor);heli.visible=false;scene.add(heli)}
const debris=[];for(let i=0;i<120;i++){const m=ico(.8,0x7a7468);m.visible=false;m.castShadow=true;scene.add(m);debris.push({m,on:false,settled:true,v:V()})}
const pool=[];for(let i=0;i<240;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puff,transparent:true,depthWrite:false,opacity:0}));s.visible=false;scene.add(s);pool.push({s,life:0,max:1,vy:0,s0:1,s1:1,op:1})}
function emit(x,y,z,col,max,vy,s0,s1,op,add){const p=pool.find(p=>p.life<=0);if(!p)return;p.life=p.max=max;p.vy=vy;p.s0=s0;p.s1=s1;p.op=op;p.s.position.set(x,y,z);p.s.material.color.set(col);const b=add?THREE.AdditiveBlending:THREE.NormalBlending;if(p.s.material.blending!==b){p.s.material.blending=b;p.s.material.needsUpdate=true}p.s.visible=true}
const fireL=new THREE.PointLight(0xff7a2a,0,45);scene.add(fireL);
