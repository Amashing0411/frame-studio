// ---- main step
function step(dt,t){
 restoreAssetTransforms();
 let idx=shots.findIndex(s=>t>=s.t0&&t<s.t1);if(idx<0)idx=t<shots[0].t0?0:shots.length-1;const s=shots[idx],ended=t>=filmEnd;
 if(idx!==cur){cur=idx;onShot(s)}
 const e=s.ev,qn=e.has('quake_shake')?1:0;S.q+=(qn-S.q)*Math.min(1,dt*3);const q=S.q;
 for(const b of blds)b.m.rotation.z=b.tilt+Math.sin(t*38+b.s)*.006*q*(1+b.h/40);
 for(const v of veh){const x=v.ax==='z'?v.l:v.pos,z=v.ax==='z'?v.pos:v.l,inI=Math.abs(x)<15&&Math.abs(z)<15,tg=(S.jam||S.quaked||S.zc)?(inI?v.sp*.7:0):v.sp;
  v.cur+=(tg-v.cur)*Math.min(1,dt*(tg?1:2.2));v.pos+=v.dir*v.cur*dt;if(v.pos>210)v.pos=-210;if(v.pos<-210)v.pos=210;
  v.g.position.set(x,q>.05?Math.sin(t*50+v.pos)*.06*q:0,z);v.g.rotation.y=(v.ax==='x'?Math.PI/2:0)+(v.dir<0?Math.PI:0)}
 if(S.truck){const k=S.truck,h=k.h;if(k.a>14)k.a-=9*dt;const p=Wp(h,3,k.a/h.s,0);truck.position.set(p.x,0,p.z);truck.rotation.y=h.ax==='z'?(k.a>0?Math.PI:0):Math.PI/2*(k.a>0?-1:1)}
 const zs=ppl.filter(o=>o.zm);for(const o of ppl.concat(resc)){if(o.g.visible)updPerson(o,dt,t,s,q,zs)}
 updLife(dt,t);
 for(const d of debris){if(!d.on||d.settled)continue;d.v.y-=9.8*dt;d.m.position.addScaledVector(d.v,dt);d.m.rotation.x+=dt*2;if(d.m.position.y<.4){d.m.position.y=.4;if(d.v.y<-2.5){d.v.y*=-.32;d.v.x*=.55;d.v.z*=.55;d.m.rotation.z+=.6}else d.settled=true}}
 if(e.has('dust_cloud')&&Q()<dt*14){const b=S.dmg.length?S.dmg[S.dmg.length-1-(Q()*Math.min(4,S.dmg.length)|0)]:null;emit(b?b.x+(Q()-.5)*12:s.hub.x+(Q()-.5)*30,1,b?b.z+(Q()-.5)*12:s.hub.z+(Q()-.5)*30,0xb9a98a,6,1.2,3,16,.5)}
 for(const p of S.plumes)if(Q()<dt*3)emit(p.x+(Q()-.5)*3,2,p.z+(Q()-.5)*3,0x2a2a30,9,5,4,22,.55);
 for(const f of S.fires)if(Q()<dt*25)emit(f.x+(Q()-.5)*1.5,.8,f.z+(Q()-.5)*1.5,0xff8a2a,.8,3,1.8,.5,.9,true);
 fireL.intensity=S.fires.length?1.6+Math.sin(t*23)*.5+Math.sin(t*37)*.3:0;
 for(const p of pool){if(p.life<=0)continue;p.life-=dt;const k=1-p.life/p.max;if(p.life<=0){p.s.visible=false;continue}p.s.position.y+=p.vy*dt;p.s.position.x+=.8*dt;const sz=lp(p.s0,p.s1,k);p.s.scale.set(sz,sz,1);p.s.material.opacity=p.op*(1-k)*Math.min(1,k*8)}
 if(e.has('helicopter')){heli.visible=true;const a=t*.5;heli.position.set(s.hub.x+Math.cos(a)*75,110,s.hub.z+Math.sin(a)*75);heli.rotation.y=-a;rotor.rotation.y=t*30}else heli.visible=false;
 updateCatalogInstances(dt,t);
 const pos=V(),look=V(),u=cl((t-s.t0)/(s.t1-s.t0));shotCam(s,u,t,pos,look);if(!s.cam.target_id)fix(pos);referencedCamera(s,t,pos,look);
 const P=s.cam.preset,amp=q*(/aerial|orbit/.test(P)?.18:/rooftop|window/.test(P)?.3:.18);
 pos.x+=(Math.sin(t*53)*.5+Math.sin(t*31+1)*.3)*amp;pos.y+=Math.sin(t*47+2)*amp*.5;pos.z+=Math.sin(t*41+4)*amp*.5;
 camera.position.copy(pos);camera.lookAt(look);if(P==='pov')camera.rotateZ(Math.sin(t*4.5)*.012);
 importedModels.forEach(m=>{const meta=importedMeta.get(m);if(meta&&meta.mixer)meta.mixer.update(dt)});
 if(!simulating){applyAssetEdits();renderer.render(scene,camera);composeFrame(t);mix('',s.cam.preset,q,t>=END-Math.min(1.5,END*.15),dt)}
}

