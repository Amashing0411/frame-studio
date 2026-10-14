// ---- camera
const BASEH={aerial:150,orbit:120,rooftop:40,window:15,ground:1.6,pov:1.65,over_shoulder:1.9,waterline:.8,closeup:1.6},tmpV=V();
function fix(p){for(const b of blds){if(Math.abs(p.x-b.x)<b.w/2+1.5&&Math.abs(p.z-b.z)<b.d/2+1.5&&p.y<b.h+3)p.y=b.h+3}p.y=Math.max(p.y,.7)}
function shotCam(s,u,t,pos,look){const c=s.cam,P=c.preset,M=c.move,h=+c.height>0?+c.height:BASEH[P]||10,hub=s.hub,dur=s.t1-s.t0;let az=s.az;
 if(P==='aerial'||P==='orbit'){if(M==='orbit'||P==='orbit')az+=(u-.5);const D=M==='push'?lp(200,130,u):M==='pull'?lp(130,200,u):165,hh=M==='crane'?h*lp(.75,1.3,u):h;pos.set(hub.x+Math.sin(az)*D+(M==='track'?(u-.5)*60:0),hh,hub.z+Math.cos(az)*D);look.set(hub.x,6,hub.z)}
 else if(P==='rooftop'){if(M==='orbit')az+=(u-.5);const D=M==='push'?lp(85,55,u):M==='pull'?lp(55,85,u):70;pos.set(hub.x+Math.sin(az)*D,h+(M==='crane'?u*12:0),hub.z+Math.cos(az)*D);look.set(hub.x,4,hub.z)}
 else if(P==='window'){const a=M==='push'?lp(-14,4,u):M==='pull'?lp(4,-14,u):lp(-10,10,u);pos.copy(Wp(hub,s.sd*24,a,h));look.copy(Wp(hub,-s.sd*6,a+16,h*.35))}
 else if(P==='pov'){const dir=s.sd,a=dir*(1-u)*dur*4.2;pos.copy(Wp(hub,15,a,h+Math.abs(Math.sin(t*9))*.07));look.copy(Wp(hub,15,a-dir*10,h-.15))}
 else if((P==='over_shoulder'||P==='closeup')&&!(s.heroP||ppl[0])){pos.set(s.hub.x+3,1.7,s.hub.z+4);look.set(s.hub.x,1.4,s.hub.z)}
 else if(P==='over_shoulder'){const p=s.heroP||ppl[0],fx=Math.sin(p.yaw),fz=Math.cos(p.yaw),hs=p.sc*1.5;pos.set(p.x-fx*3.4,Math.max(h,hs+.4),p.z-fz*3.4);look.set(p.x+fx*6,hs*.85,p.z+fz*6)}
 else if(P==='closeup'){const p=s.heroP||ppl[0],d=(M==='pull'?lp(1.3,2.8,u):lp(2.8,1.35,u))*(p.age==='kid'?.8:1),a=p.yaw+p.hd.rotation.y*.6;p.hd.getWorldPosition(tmpV);const hy=tmpV.y+.14*p.sc,fx=Math.sin(a),fz=Math.cos(a);pos.set(tmpV.x+fx*d+fz*.22,hy+.04,tmpV.z+fz*d-fx*.22);look.set(tmpV.x,hy,tmpV.z)}
 else{const a=M==='push'?lp(30,16,u):M==='pull'?lp(14,30,u):22,lat=M==='track'?lp(-6,6,u):s.sd*3;pos.copy(Wp(hub,lat,a,P==='waterline'?.8:h));look.copy(s.front?Wp(hub,s.sd*20,0,6):Wp(hub,0,0,2.4))}}
