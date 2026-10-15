// ---- faces, poses, joints
const EMO={neutral:{e:1,ba:0,bh:0,c:0,o:0,w:1},fear:{e:1.4,ba:.38,bh:.035,c:-.4,o:.55,w:1.1},shock:{e:1.5,ba:.15,bh:.045,c:0,o:.85,w:.8},determined:{e:.78,ba:-.4,bh:-.005,c:-.25,o:0,w:1},relief:{e:.55,ba:.14,bh:.01,c:.55,o:0,w:1.15},happy:{e:.8,ba:.08,bh:.01,c:.9,o:.1,w:1.3},sad:{e:.85,ba:.4,bh:0,c:-.5,o:0,w:.8},angry:{e:.8,ba:-.55,bh:-.01,c:-.45,o:.2,w:1.1},zombie:{e:1.1,ba:-.35,bh:-.01,c:-.3,o:.95,w:1.15}};
function face(o,dt,emo,vis,t,talk){if(o.bones){o.fc.visible=vis;if(vis)faceV2(o,talk?'talk':'idle',t,emo);return}o.fc.visible=vis;if(!vis)return;const g=EMO[emo]||EMO.neutral,F=o.F,k=Math.min(1,dt*9);for(const n in g)F[n]+=(g[n]-F[n])*k;
 if(t>o.bt){o.bd=.13;o.bt=t+2.5+Q()*3.5}o.bd-=dt;const bl=o.bd>0?.12:1,op=F.o+(talk?.3*(.5+.5*Math.sin(t*9+o.ph)):0);
 o.e[0].scale.set(1,F.e*bl,.55);o.e[1].scale.set(1,F.e*bl,.55);o.p[0].scale.set(1,F.e*bl*.9,.8);o.p[1].scale.set(1,F.e*bl*.9,.8);
 o.b[0].rotation.z=F.ba;o.b[1].rotation.z=-F.ba;o.b[0].position.y=o.b[1].position.y=.075+F.bh;
 const c=F.c,sy=c>=0?-(.12+.45*c):(.12-.45*c);o.mo.scale.set(F.w,sy,1);o.mo.position.y=-.055-sy*.0175;o.mop.visible=op>.06;o.mop.scale.set(F.w*1.1,Math.max(.05,op*.9),.4)}
function target(o,P,spd,t){const T=o.T,p=o.ph;Object.assign(T,IDLE);T.lean=Math.sin(t*1.6+o.ph2)*.02+(o.age==='elder'?.1:0);T.sway=Math.sin(t*.7+o.ph2)*.012;
 if(spd>.1){const f=cl((spd-1)/3.6),A=lp(.55,1,f),Ar=lp(.5,.95,f),s=Math.sin(p),c=Math.cos(p),c2=Math.cos(p+Math.PI);
  T.lh=A*s;T.rh=-A*s;T.lk=.12+lp(.8,1.1,f)*Math.max(0,c);T.rk=.12+lp(.8,1.1,f)*Math.max(0,c2);T.ls=-Ar*s;T.rs=Ar*s;T.le=lp(.3,1.3,f)+.1*c;T.re=lp(.3,1.3,f)-.1*c;T.twist=.12*s*(1+f);T.py=.94-.03*f+.022*Math.cos(2*p);T.lean+=lp(.04,.25,f);T.sway=.02*s;T.lsz=T.rsz=.06;T.hx=-.05*f}
 switch(P){
  case'phone':T.rs=.95;T.re=1.9;T.hx=.45;break;
  case'sit_phone':case'sit_news':T.py=.54;T.lh=T.rh=1.5;T.lk=T.rk=1.5;T.lhz=T.rhz=.12;T.lean=.05;if(P==='sit_phone'){T.ls=.7;T.rs=.8;T.le=1.7;T.re=1.8;T.hx=.55}else{T.ls=T.rs=1.15;T.le=T.re=.9;T.hx=.4}break;
  case'talk':T.rs=.7+.5*Math.sin(t*2.1+o.ph);T.re=1.2+.4*Math.sin(t*2.6+o.ph);T.ls=.3+.2*Math.sin(t*1.3+o.ph);T.le=.9;T.hz=Math.sin(t*.8+o.ph)*.05;break;
  case'vendor':T.rs=.5+.35*Math.sin(t*1.7+o.ph);T.re=1.1;T.ls=.25;T.le=.7;break;
  case'cower':T.py=.52;T.lh=T.rh=1.25;T.lk=T.rk=2.2;T.lean=.8;T.cx=.25;T.hx=.5;T.ls=T.rs=2.6;T.le=T.re=2.1;T.lsz=T.rsz=-.25;break;
  case'head':T.ls=T.rs=2.3;T.le=T.re=2.3;T.lsz=T.rsz=.45;T.hx=-.12;T.lean=-.06;break;
  case'up':T.ls=T.rs=2.7+Math.sin(t*9+o.ph)*.3;T.le=T.re=.5;T.lsz=T.rsz=.5;break;
  case'fwd':T.ls=T.rs=1.45+Math.sin(t*2+o.ph)*.1;T.le=T.re=.2;T.lsz=T.rsz=.05;T.hz=.28;T.hx=.25;T.lean=Math.max(T.lean,.3);if(spd>.1){T.rh*=.5;T.rk=.1;T.sway=.05*Math.sin(p)}break;
  case'help':T.rs=1.3;T.re=.3;break;
  case'film':T.ls=T.rs=1.45;T.le=T.re=1.1;T.hx=-.1;break;
  case'limp':T.ls=-.3;T.rs=-.2;T.lsz=T.rsz=.6;T.lh=.3;T.lk=.3;T.rk=.2;T.hx=.4;T.lean=.1;break}}
function updPersonState(o,dt,t,s,q,zs){
 const ZB=SC.hazard&&SC.hazard.type==='zombie',beh=s.beh;let nz=null,nd=1e9;
 if(!o.zm)for(const z of zs){const d=Math.hypot(z.x-o.x,z.z-o.z);if(d<nd){nd=d;nz=z}}
 let m;if(o.rs)m='rescue';else if(o.zm)m='zombie';else if(o.inf>0)m='infected';else if(nz&&nd<30)m='flee';else if(q>.3&&!ZB)m='drop';else m=beh.crowd||(S.evac?'flee':S.quaked?'alert':'calm');
 if(m!==o.mode){if(o.pend!==m){o.pend=m;o.pt=t}if(t-o.pt>=o.rd||m==='infected'||m==='zombie'||m==='rescue'||(m==='flee'&&nz&&nd<12)){o.mode=m;o.pend=null}}else o.pend=null;
 const md=o.mode;let spd=0,P='idle',emo=o.mood,look=0,talk=false;const fx=nz?nz.x:ZB&&S.zc?S.dpt.x:s.hub.x,fz=nz?nz.z:ZB&&S.zc?S.dpt.z:s.hub.z;
 if(md==='zombie'){if(o.fall>.05){o.fall=Math.max(0,o.fall-dt*1.5);P='limp'}else{let tg=null,bd=1e9;for(const h of ppl){if(h.zm||h.inf>0)continue;const d=Math.hypot(h.x-o.x,h.z-o.z);if(d<bd){bd=d;tg=h}}
   const sp=beh.zombies==='sprint'?3.4:beh.zombies==='chase'?1.9:beh.zombies==='shamble'?1.1:(S.zsp||1.1);
   if(tg&&bd<80){spd=moveTo(o,tg.x,tg.z,sp,dt);if(bd<1.4&&S.zinf&&tg.inf<=0)tg.inf=1.6}else spd=moveTo(o,S.dpt.x,S.dpt.z,sp*.6,dt);P='fwd'}emo='zombie';o.wild=true}
 else if(md==='infected'){o.inf-=dt;o.fall=cl((1.6-o.inf)/.9);P='limp';emo='shock';if(o.inf<=0)makeZ(o);o.wild=true}
 else if(md==='rescue'){if(o.go)spd=moveTo(o,o.tx,o.tz,o.run,dt);emo='determined'}
 else if(md==='flee'||md==='panic'){o.wild=true;let tg;
  if(nz&&nd<45)tg=away(o,o.x-nz.x,o.z-nz.z);
  // pv is the pelvis Group. Keep panic steering separate from the character rig.
  else if(md==='panic'){if(!o.panicDirection||t>o.panicUntil){o.panicUntil=t+1+Q()*1.3;o.panicDirection=[Q()<.5,Q()<.5?1:-1]}const dir=o.panicDirection;tg=away(o,dir[0]?dir[1]:0,dir[0]?0:dir[1])}
  else tg=tgOf(o);
  spd=moveTo(o,tg[0],tg[1],o.run*(md==='panic'?1.1:1),dt);P=md==='panic'?'up':'walk';emo=nz&&nd<20?'shock':'fear';look=1}
 else if(md==='drop'||md==='hide'){P='cower';emo='fear';o.wild=true}
 else if(md==='alert'||md==='freeze'){P='head';emo=md==='freeze'?'shock':'fear';look=1;o.wild=true}
 else if(md==='film'){P='film';emo='shock';look=1;o.wild=true}
 else if(md==='help'){const g=tgOf(o);spd=moveTo(o,g[0],g[1],o.sp0*.85,dt);P=o.i%2?'help':'idle';emo='determined';o.wild=true}
 else if(md==='relief'){emo='relief';o.wild=true}
 else{if(o.wild)P='idle';
  else if(o.act==='sit'){P=o.sitP;o.yaw=o.yaw0}
  else if(o.act==='talk'){P='talk';talk=true;o.yaw=o.yaw0}
  else if(o.act==='vendor'){P='vendor';talk=t%9<3;emo='happy';o.yaw=o.yaw0}
  else if(o.ax==='p'){if(Math.hypot(o.tx-o.x,o.tz-o.z)<1){o.tx=Math.sign(o.hx)*(22+Q()*22);o.tz=Math.sign(o.hz)*(22+Q()*22)}spd=moveTo(o,o.tx,o.tz,o.sp0*.8,dt)}
  else{const nx=o.pos+o.dir*o.sp0*dt;if(Math.abs(nx)<22||Math.abs(nx)>170)o.dir=-o.dir;else o.pos=nx;o.x=o.ax==='z'?o.hx:o.pos;o.z=o.ax==='z'?o.pos:o.hz;o.f.set(o.ax==='z'?0:o.dir,0,o.ax==='z'?o.dir:0);o.yaw=Math.atan2(o.f.x,o.f.z);spd=o.sp0;if(o.act==='phone')P='phone'}}
 if(o===curHero&&beh.emotion)emo=beh.emotion;
 let ang=look?Math.atan2(fx-o.x,fz-o.z)-o.yaw:0;ang=cl(((ang+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI,-1.15,1.15);
 target(o,P,spd,t);const Tg=o.T;Tg.hy=ang;o.ph+=dt*Math.min(11,spd*4.4);
 const k=Math.min(1,dt*(spd>0?30:P==='cower'||P==='head'?14:9)),j=o.j;for(let i=0;i<JK.length;i++){const n=JK[i];j[n]+=(Tg[n]-j[n])*k}
 o.pv.position.set(j.sway,j.py,0);o.sp.rotation.set(j.lean,j.twist,0);o.ch.rotation.x=j.cx;o.hd.rotation.set(j.hx,j.hy,j.hz);
 o.hp[0].rotation.set(-j.lh,0,-j.lhz);o.hp[1].rotation.set(-j.rh,0,j.rhz);o.kn[0].rotation.x=j.lk;o.kn[1].rotation.x=j.rk;
 o.sh[0].rotation.set(-j.ls,0,-j.lsz);o.sh[1].rotation.set(-j.rs,0,j.rsz);o.el[0].rotation.x=-j.le;o.el[1].rotation.x=-j.re;
 o.phone.visible=P==='phone'||P==='sit_phone'||P==='film';o.news.visible=P==='sit_news';o.um.visible=WX.rain&&o.hasU&&md==='calm'&&!o.wild&&o.act!=='sit';
 o.g.rotation.y=o.yaw;o.g.rotation.x=o.cast?0:-1.45*o.fall;o.g.position.set(o.x+(q>.3&&!o.zm&&!ZB?Math.sin(t*35+o.ph)*.1:0),o.cast?0:.18*o.fall,o.z);
 face(o,dt,emo,Math.hypot(camera.position.x-o.x,camera.position.z-o.z)<16||o===curHero,t,talk)}
// Per-person update: the state machine above, then jointed people get a pose from their motion, then flood swimming.
// renderCurrent redraws with step(0,T): a zero-time step keeps the last real speed, or every runner would be posed idle.
// A risen zombie's fall rests at .05 (updPersonState stops there), so the cast body only plays 'fall' above .08.
function updPerson(p,dt,t,...args){const x=p.x,z=p.z;updPersonState(p,dt,t,...args);if(!p.bones)return;const distance=Math.hypot(p.x-x,p.z-z),speed=dt>0?(p.lastSpeed=distance/dt):p.lastSpeed||0;p.distanceV2=(p.distanceV2||0)+distance;const mode=p.mode,state=p.cast&&p.fall>.08?'fall':p.zm?'zombie':mode==='drop'||mode==='hide'?'cower':mode==='film'?'phone':mode==='freeze'||mode==='alert'?'think':speed>.1?(speed>1.5?'run':'walk'):p.act==='talk'?'talk':p.act==='sit'&&Math.hypot(p.g.position.x-p.hx,p.g.position.z-p.hz)<.6?'sit':'idle';poseV2(p,state,t,p.mood||'neutral',p.distanceV2,speed);const st=floodState(t);if(!st.hz)return;const d=floodDepthAt(st,p.g.position.x,p.g.position.z);if(d>.95){poseV2(p,'swim',t,'fear',null,.85);p.g.position.y=st.level-1.12+Math.sin(t*1.6+p.variant)*.05;p.inWater3=true}else if(p.inWater3){p.g.position.y=0;p.inWater3=false}}
