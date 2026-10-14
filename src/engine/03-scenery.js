// ---- scenery
function palm(x,z){const g=new THREE.Group(),h=6+R()*3,tr=cyl(.16,.26,h,5,0x7a5a3a);tr.position.y=h/2;tr.rotation.z=(R()-.5)*.15;g.add(tr);
 for(let i=0;i<7;i++){const f=mk(.35,.06,3.2,0x3f8a3a);f.geometry.translate(0,0,1.6);f.position.y=h;f.rotation.y=i/7*6.28;f.rotation.x=.45+R()*.2;g.add(f)}g.position.set(x,0,z);g.userData.assetCategory="vegetation";g.name="Palm";world.add(g)}
function tree(x,z){const g=new THREE.Group(),t=cyl(.2,.3,2.4,5,0x5a4632),c=ico(1.9+R()*.8,pick([0x3f7a3a,0x4d8a40,0x2f6b3a,0x6a9a3e]));t.position.y=1.2;c.position.y=3.6;g.add(t,c);g.position.set(x,0,z);g.userData.assetCategory="vegetation";g.name="Tree";world.add(g)}
function bush(x,z){const b=ico(.7+R()*.4,pick([0x3f7a3a,0x4d8a40,0x2f6b3a]));b.scale.y=.7;b.userData.assetCategory="vegetation";b.name="Shrub";put(b,x,.4,z)}
function bench(x,z,yaw){const g=new THREE.Group(),w=0x8a5a2e;put(mk(1.6,.08,.5,w),0,.45,0,g);put(mk(1.6,.45,.06,w),0,.72,-.24,g);put(mk(.08,.45,.45,0x333a42),-.7,.22,0,g);put(mk(.08,.45,.45,0x333a42),.7,.22,0,g);g.position.set(x,0,z);g.rotation.y=yaw;world.add(g);const b={x,z,yaw};benches.push(b);return b}
function bin(x,z){const g=new THREE.Group(),c=pick([0x2f6b3a,0x2a5fa8,0x555a62]);put(cyl(.3,.26,.85,6,c),0,.43,0,g);put(cyl(.33,.33,.08,6,0x2a2d33),0,.89,0,g);g.position.set(x,0,z);world.add(g)}
function litter(x,z){const r=R(),o=r<.35?cyl(.05,.05,.12,6,pick([0xc9ced4,0xd64541,0x2a7fd0])):r<.7?mk(.25,.01,.18,pick([0xf2f2f2,0xe8d9a0,0xcfcfcf])):ico(.1,0xf2f2f2);if(r<.35)o.rotation.z=Math.PI/2;if(r>=.7)o.scale.y=.4;o.rotation.y=R()*6;flat(o);put(o,x,.08,z)}
function cart(x,z,yaw,col){const g=new THREE.Group();put(mk(1.7,.9,.9,col),0,.75,0,g);put(mk(1.8,.08,1),0,1.22,0,g);const um=new THREE.Mesh(new THREE.ConeGeometry(1.5,.6,8),mat(pick(ACC)));put(um,0,2.7,0,g);put(cyl(.05,.05,1.6,5,0xcccccc),0,1.9,0,g);for(const s of[-.7,.7]){const w=cyl(.3,.3,.1,8,0x15171c);w.rotation.z=Math.PI/2;put(w,s,.3,.1,g)}for(let i=0;i<4;i++)put(mk(.2,.2,.2,pick(ACC)),-.6+i*.4,1.35,0,g);g.position.set(x,0,z);g.rotation.y=yaw;world.add(g)}
function tower(cx,cz,w,d,h,dist){const g=new THREE.Group(),mats=[],wc=new THREE.Color(pick(WALL)),mm=c=>{const m=wallMat(c);mats.push(m);return m};
 const ph=4+R()*5,pod=new THREE.Mesh(bgeo(w,ph,d),mm(wc.clone().offsetHSL(0,0,-.1)));g.add(pod);
 const tw=w*(.8+R()*.14),td=d*(.8+R()*.14),tm=new THREE.Mesh(bgeo(tw,h,td),mm(wc));tm.position.y=ph;g.add(tm);let top=ph+h;
 if(h>28&&R()<.6){const t2=new THREE.Mesh(bgeo(tw*.68,h*.22,td*.68),mm(wc.clone().offsetHSL(0,0,.06)));t2.position.y=top;g.add(t2);top+=h*.22}
 if(dist<150){const r=R();if(r<.4){const ac=mk(2.4,1.2,2,0x8a8f98);ac.position.set((R()-.5)*tw*.5,top+.6,(R()-.5)*td*.5);g.add(ac)}else if(r<.7){const tk=cyl(1.1,1.1,2.2,6,0x6b7380);tk.position.set(tw*.2,top+1.1,td*.2);g.add(tk)}else{const an=cyl(.08,.1,9,4,0x555a62);an.position.y=top+4.5;g.add(an)}
  const aw=mk(w*.7,.25,2.4,pick(ACC));aw.position.set(0,3.4,d/2+1.2);g.add(aw)}
 g.position.set(cx,0,cz);world.add(g);blds.push({m:g,x:cx,z:cz,w,d,h:top,mats,s:R()*9,tilt:0,dmg:0,lit:true,c0:mats.map(m=>m.color.clone())})}
function house(x,z,w,d,h){const g=new THREE.Group(),bm=wallMat(pick(PASTEL)),rm=mat(pick(ROOF)),M=Math.max(w,d),rh=2+R()*1.5;
 g.add(new THREE.Mesh(bgeo(w,h,d),bm));const r=new THREE.Mesh(new THREE.ConeGeometry(M*.74,rh,4).rotateY(Math.PI/4),rm);r.scale.set(w/M,1,d/M);r.position.y=h+rh/2;g.add(r);
 const dr=mk(1.1,2,.15,pick(ACC));dr.position.set(0,1,d/2+.05);g.add(dr);g.position.set(x,0,z);world.add(g);blds.push({m:g,x,z,w,d,h:h+rh,mats:[bm,rm],s:R()*9,tilt:0,dmg:0,lit:true,c0:[bm.color.clone(),rm.color.clone()]})}
