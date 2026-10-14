// ---- characters
const JK=['py','lean','twist','cx','hx','hy','hz','lh','rh','lk','rk','lhz','rhz','ls','rs','lsz','rsz','le','re','sway'];
const IDLE={py:.95,lean:0,twist:0,cx:0,hx:0,hy:0,hz:0,lh:0,rh:0,lk:.05,rk:.05,lhz:.04,rhz:.04,ls:.05,rs:.05,lsz:.1,rsz:.1,le:.25,re:.25,sway:0};
function mkPerson(role){const fem=R()<.5,r=R(),age=role!=='civ'?'adult':r<.12?'kid':r<.24?'elder':'adult',W=fem?.9:1,Hp=fem?1.08:1,sc=age==='kid'?.62:age==='elder'?.92:fem?.94:.98;
 const skin=pick(SKIN),hair=age==='elder'?pick([0xd8d8d8,0xa8a8a8,0xf0f0f0]):pick(HAIR),shirt=role==='resp'?0x30343d:role==='sol'?0x4f5a3c:pick(SHIRT),pants=role==='sol'?0x3d4630:role==='resp'?0x1f2430:pick(PANTS),vest=role==='resp'?0xff9a1a:role==='sol'?0x2f3a28:0;
 let hs=role==='resp'||role==='sol'?'helmet':fem?pick(['long','long','bun','short','cap']):pick(['short','short','cap','bald','short','hat']);if(age==='elder'&&!fem&&R()<.4)hs='bald';
 const g=new THREE.Group();g.rotation.order='YXZ';const skM=mat(skin),shM=mat(shirt),pnM=mat(pants),hrM=mat(hair),btM=smat(0x1d1f26),eyeP=mat(0x15110e,0xff2200,0);
 const pv=new THREE.Group();pv.position.y=.95;g.add(pv);
 const abd=new THREE.Mesh(new THREE.CylinderGeometry(.155*W,.17*Hp,.3,8),shM);abd.position.y=.1;abd.scale.z=.72;pv.add(abd);
 const sp=new THREE.Group();sp.position.y=.2;pv.add(sp);const ch=new THREE.Group();ch.position.y=.06;sp.add(ch);
 const chm=new THREE.Mesh(new THREE.CylinderGeometry(.2*W,.16*W,.34,8),shM);chm.position.y=.15;chm.scale.z=.7;ch.add(chm);
 if(vest){const v=new THREE.Mesh(new THREE.CylinderGeometry(.215*W,.175*W,.3,8),mat(vest));v.position.y=.15;v.scale.z=.78;ch.add(v)}
 const nk=new THREE.Mesh(new THREE.CylinderGeometry(.05,.055,.1,6),skM);nk.position.y=.34;ch.add(nk);
 const hd=new THREE.Group();hd.position.y=.36;ch.add(hd);const hc=new THREE.Group();hc.position.y=.13;if(age==='kid')hc.scale.setScalar(1.22);else if(fem)hc.scale.setScalar(.96);hd.add(hc);
 const hm=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),skM);hm.scale.set(1,1.1,1.03);hc.add(hm);
 const hairM=(rad,sx,sy,sz,y,z,c)=>{const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rad,1),c||hrM);m.scale.set(sx,sy,sz);m.position.set(0,y,z);hc.add(m);return m};
 if(hs==='short'||hs==='long'||hs==='bun')hairM(.148,1,.72,1.06,.055,-.012);if(hs==='long'){const b=mk(.27,.34,.1,hair);b.material=hrM;b.position.set(0,-.06,-.1);hc.add(b)}if(hs==='bun')hairM(.06,1,1,1,.17,-.09);
 if(hs==='cap'){const cm=mat(pick(SHIRT));hairM(.152,1,.62,1.06,.075,-.005,cm);const vz=mk(.17,.015,.1,0x222222);vz.material=cm;vz.position.set(0,.025,.135);vz.rotation.x=.12;hc.add(vz)}
 if(hs==='hat'){const hm2=mat(0xd8c9a0),a=new THREE.Mesh(new THREE.CylinderGeometry(.12,.15,.07,8),hm2),b=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.012,10),hm2);a.position.y=.15;b.position.y=.11;hc.add(a,b)}
 if(hs==='helmet'){const m=mat(role==='sol'?0x4a5a3a:0xf2f2f2);hairM(.16,1,.8,1.1,.06,-.005,m)}
 const fc=new THREE.Group();hc.add(fc);const sclM=smat(0xf4f4f4),eg=new THREE.IcosahedronGeometry(.03,0),pg=new THREE.IcosahedronGeometry(.017,0);
 const sc1=new THREE.Mesh(eg,sclM),sc2=new THREE.Mesh(eg,sclM),pu1=new THREE.Mesh(pg,eyeP),pu2=new THREE.Mesh(pg,eyeP);sc1.position.set(-.058,.02,.124);sc2.position.set(.058,.02,.124);pu1.position.set(-.058,.02,.14);pu2.position.set(.058,.02,.14);
 const bg=new THREE.BoxGeometry(.07,.016,.016),b1=new THREE.Mesh(bg,hrM),b2=new THREE.Mesh(bg,hrM);b1.position.set(-.058,.075,.114);b2.position.set(.058,.075,.114);
 const mo=new THREE.Mesh(new THREE.TorusGeometry(.035,.007,4,10,Math.PI),smat(0x5a2323)),mop=new THREE.Mesh(new THREE.IcosahedronGeometry(.03,0),smat(0x4a1515));mo.position.set(0,-.055,.132);mop.position.set(0,-.062,.126);mop.scale.z=.4;
 const nose=new THREE.Mesh(new THREE.IcosahedronGeometry(.022,0),skM);nose.position.set(0,-.01,.138);nose.scale.z=1.2;fc.add(sc1,sc2,pu1,pu2,b1,b2,mo,mop,nose);
 if(R()<.18){const gl=smat(0x222222),a=new THREE.Mesh(new THREE.TorusGeometry(.032,.004,4,8),gl),b=a.clone();a.position.set(-.058,.02,.142);b.position.set(.058,.02,.142);fc.add(a,b)}
 const arm=s=>{const sh=new THREE.Group();sh.position.set(s*.23*W,.3,0);ch.add(sh);const ua=new THREE.Mesh(new THREE.CylinderGeometry(.052,.046,.28,6).translate(0,-.14,0),shM);sh.add(ua);
  const el=new THREE.Group();el.position.y=-.28;sh.add(el);const fa=new THREE.Mesh(new THREE.CylinderGeometry(.044,.038,.26,6).translate(0,-.13,0),R()<.4?shM:skM);el.add(fa);
  const ha=new THREE.Group();ha.position.y=-.26;el.add(ha);const hnd=new THREE.Mesh(new THREE.IcosahedronGeometry(.055,0),role==='civ'?skM:smat(0x2a2d33));ha.add(hnd);return{sh,el,ha}};
 const A1=arm(-1),A2=arm(1);const phone=new THREE.Mesh(new THREE.BoxGeometry(.07,.13,.012),mat(0x111111,0x66aaff,.9));phone.position.set(0,-.02,.07);phone.visible=false;A2.ha.add(phone);
 const leg=s=>{const hp=new THREE.Group();hp.position.set(s*.095*Hp,0,0);pv.add(hp);const th=new THREE.Mesh(new THREE.CylinderGeometry(.078,.062,.44,6).translate(0,-.22,0),pnM);hp.add(th);
  const kn=new THREE.Group();kn.position.y=-.44;hp.add(kn);const shn=new THREE.Mesh(new THREE.CylinderGeometry(.06,.048,.42,6).translate(0,-.21,0),pnM);kn.add(shn);const an=new THREE.Group();an.position.y=-.42;kn.add(an);const bt=new THREE.Mesh(new THREE.BoxGeometry(.11,.09,.25),btM);bt.position.set(0,-.045,.06);an.add(bt);return{hp,kn}};
 const L1=leg(-1),L2=leg(1);
 const news=new THREE.Mesh(new THREE.BoxGeometry(.46,.3,.012),smat(0xe4e0d4));news.position.set(0,.15,.3);news.rotation.x=-.35;news.visible=false;ch.add(news);
 if(age==='kid'||R()<.2){const bp=mk(.3,.34,.14,pick(ACC));bp.position.set(0,.15,-.19);ch.add(bp)}
 const um=new THREE.Group();um.add(new THREE.Mesh(new THREE.ConeGeometry(.6,.25,8),mat(pick(ACC))),cyl(.015,.015,.7,4,0x333333));um.children[0].position.y=2.0;um.children[1].position.y=1.65;um.visible=false;g.add(um);
 const bl=new THREE.Mesh(new THREE.CircleGeometry(.5,8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.28,depthWrite:false}));bl.position.y=.02;g.add(bl);
 g.scale.setScalar(sc);g.traverse(o=>{o.userData.pp=true});world.add(g);
 return{g,pv,sp,ch,hd,fc,hp:[L1.hp,L2.hp],kn:[L1.kn,L2.kn],sh:[A1.sh,A2.sh],el:[A1.el,A2.el],phone,news,um,hasU:R()<.35,e:[sc1,sc2],p:[pu1,pu2],b:[b1,b2],mo,mop,eyeP,skM,shM,sk0:skM.color.clone(),sh0:shM.color.clone(),x:0,z:0,yaw:0,f:V(0,0,1),sc,fem,age,
  ph:R()*6,ph2:R()*6,sp0:age==='kid'?.95:age==='elder'?.85:1.1+R()*.5,run:(age==='elder'?2.4:3+R()*1.6),rd:.1+R()*1.5,mode:'calm',cr:0,fall:0,inf:0,zm:false,j:{...IDLE},T:{...IDLE},F:{e:1,ba:0,bh:0,c:0,o:0,w:1},bt:2+R()*3,bd:0,mood:R()<.4?'happy':'neutral',role}}
