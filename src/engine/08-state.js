// ---- state
const HUBS=[{x:0,z:0,ax:'z',s:1},{x:0,z:-90,ax:'z',s:1},{x:0,z:90,ax:'z',s:1},{x:90,z:0,ax:'x',s:1},{x:-90,z:0,ax:'x',s:1},{x:30,z:30,ax:'z',s:.45}];
const Wp=(h,l,a,y)=>h.ax==='z'?V(h.x+l,y,h.z+a*h.s):V(h.x+a*h.s,y,h.z+l);
let S={},shots=[],SC=null,T=0,END=0,run=false,last=0,cur=-1,curHero=null,filmRaf=0;
function resetWorld(){S={quaked:false,jam:false,evac:false,out:false,q:0,plumes:[],fires:[],dmg:[],rescue:false,truck:null,zinf:false,zsp:0,zc:0,dpt:{x:0,z:0},scare:false,fl:0,nl:6,tw:0};Q=rngf(99);curHero=null;
 for(const b of blds){b.tilt=0;b.dmg=0;b.lit=true;b.mats.forEach((m,i)=>{m.color.copy(b.c0[i]);if(m.emissiveMap)m.emissiveIntensity=EI});b.m.rotation.set(0,0,0);b.m.position.set(b.x,0,b.z)}
 lamps.forEach(m=>m.emissiveIntensity=EI*1.2);for(const d of debris){d.on=false;d.m.visible=false}for(const p of pool){p.life=0;p.s.visible=false}
 for(const v of veh)v.pos=v.pos0,v.cur=v.sp;
 for(const o of ppl.concat(resc)){o.mode='calm';o.lastSpeed=0;o.pend=null;o.panicUntil=0;o.panicDirection=null;o.zm=false;o.inf=0;o.fall=0;o.cr=0;o.wild=false;o.tg=null;o.go=false;o.x=o.hx;o.z=o.hz;o.tx=o.hx;o.tz=o.hz;o.pos=o.pos0;o.dir=o.dir0;o.yaw=o.yaw0||0;o.skM.color.copy(o.sk0);o.shM.color.copy(o.sh0);o.eyeP.color.set(0x15110e);o.eyeP.emissiveIntensity=0;o.j={...IDLE};if(o.rs)o.g.visible=false}
 for(const b of birds)b.a=b.a%6.28;for(const p of pig){p.fly=false;p.g.visible=true;p.g.position.set(p.x,.1,p.z)}for(const d of dogs){d.pos=d.pos0;d.dir=d.dir0}
 truck.visible=false;heli.visible=false;fireL.intensity=0;cur=-1;for(const b of worldLife.bodies){b.pos.copy(b.home);b.vel.set(0,0,0);b.air=false;b.o.position.copy(b.home);b.o.rotation.set(0,b.yaw,0)}for(const v of veh){const u=v.g.userData;delete u.prev;delete u.prevCur;u.pitch=0}}
const near=(h,n,f)=>blds.filter(f).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z)).slice(0,n);
const nearP=(h,n,f)=>ppl.filter(f).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z)).slice(0,n);
function damage(b){b.dmg++;b.tilt+=(Q()-.5)*.05;b.mats.forEach(m=>m.color.lerp(new THREE.Color(0x7d7260),.35));S.dmg.push(b);const sg=Math.sign(b.x)||1;
 for(let i=0;i<7;i++){const d=debris.find(x=>!x.on);if(!d)break;d.on=true;d.settled=false;d.m.visible=true;d.m.position.set(b.x-sg*(b.w/2+.8)+(Q()-.5)*3,4+Q()*Math.min(b.h,25),b.z+(Q()-.5)*b.d);d.v.set(-sg*(1+Q()*3),0,(Q()-.5)*3);d.m.scale.set(.6+Q()*1.3,.5+Q(),.6+Q()*1.3);d.m.rotation.set(Q()*3,Q()*3,Q()*3)}
 for(let i=0;i<8;i++)emit(b.x-sg*(b.w/2+2)+(Q()-.5)*4,2+Q()*8,b.z+(Q()-.5)*b.d,0xb9a98a,6,1.2,3,16,.55)}
function makeZ(o){if(o.zm)return;o.zm=true;o.inf=0;S.zc++;o.skM.color.set(0x7f9a74);o.shM.color.lerp(new THREE.Color(0x3f4a3a),.6);o.eyeP.color.set(0xff3b2a);o.eyeP.emissiveIntensity=1.3}
function onShot(s){const e=s.ev,h=s.hub;
 if(e.has('traffic_jam'))S.jam=true;if(e.has('quake_shake'))S.quaked=true;if(e.has('crowd_evacuate'))S.evac=true;
 if(e.has('facade_fall'))near(h,4,b=>!b.dmg).forEach(damage);
 if(e.has('power_outage')){S.out=true;near(h,70,b=>b.lit).forEach(b=>{b.lit=false;b.mats.forEach(m=>{if(m.emissiveMap)m.emissiveIntensity=0})})}
 if(e.has('smoke_plume'))S.plumes.push({x:h.x+(Q()-.5)*20+14,z:h.z+(Q()-.5)*20-14});
 if(e.has('fire_small')){const f={x:h.x+10,z:h.z-10};S.fires.push(f);S.plumes.push(f);fireL.position.set(f.x,3,f.z)}
 if(e.has('zombie_spawn')){if(!S.zc)S.dpt={x:h.x,z:h.z};nearP(h,3,o=>!o.zm&&!o.inf).forEach(makeZ)}
 if(e.has('zombie_surge')){S.zinf=true;S.zsp=3.2;nearP(h,14,o=>!o.zm&&!o.inf).forEach(o=>{o.inf=.3+Q()*2.5})}
 if(e.has('infection_spread'))S.zinf=true;
 if(e.has('rescue_crew')&&!S.rescue){S.rescue=true;resc.forEach(o=>{const p=Wp(h,(Q()-.5)*8,40+Q()*12,0),t=Wp(h,(Q()-.5)*10,(Q()-.5)*8,0);o.x=p.x;o.z=p.z;o.tx=t.x;o.tz=t.z;o.g.visible=true;o.go=true});S.truck={h,a:70};truck.visible=true}
 if((s.cam||{}).preset==='closeup'||(s.cam||{}).preset==='over_shoulder'){const zt=/zombie|infected|horde|undead|creature/.test((s.cam.target||'').toLowerCase()),pl=ppl.filter(o=>zt?o.zm:!o.zm&&!o.inf),ps=(pl.length?pl:ppl.slice()).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z));curHero=ps[(s.idx*3)%Math.min(8,ps.length)];s.heroP=curHero}}
