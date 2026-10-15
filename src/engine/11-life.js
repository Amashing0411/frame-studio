// ---- animals + sky
function updLife(dt,t){const sc=S.scare=S.q>.3||S.evac||S.zc>0||S.quaked;
 for(const b of birds){b.a+=dt*b.w*(sc?3:1);const r=b.r*(sc?1.6:1),y=b.h+(sc?25:0)+Math.sin(b.a*3)*3;b.g.position.set(b.cx+Math.cos(b.a)*r,y,b.cz+Math.sin(b.a)*r);b.g.rotation.y=b.w>0?-b.a:-b.a+Math.PI;const glide=sc?1:.2+.8*Math.max(0,Math.sin(t*.55+b.ph*1.7)),f=Math.sin(t*(sc?16:9)+b.ph)*.7*glide+.18*(1-glide);b.wl.rotation.z=f;b.wr.rotation.z=-f;b.g.rotation.z=(b.w>0?1:-1)*.22}
 for(const p of pig){if(p.fly){p.dl-=0;p.g.position.x+=p.vx*dt;p.g.position.y+=p.vy*dt;p.g.position.z+=p.vz*dt;p.g.rotation.y=Math.atan2(p.vx,p.vz);if(p.g.position.y>70)p.g.visible=false}
  else if(sc){p.dl-=dt;if(p.dl<0){p.fly=true;p.vx=(Q()-.5)*10;p.vz=(Q()-.5)*10;p.vy=7+Q()*4}}else{p.hd.position.z=.13+Math.max(0,Math.sin(t*5+p.ph))*.05;p.hd.position.y=.1-Math.max(0,Math.sin(t*5+p.ph))*.04;p.g.position.x=p.x+Math.sin(t*.3+p.ph)*.4}}
 for(const d of dogs){const sp=sc?4.2:1.1;d.pos+=d.dir*sp*dt;if(Math.abs(d.pos)<22||Math.abs(d.pos)>170)d.dir=-d.dir;d.ph+=dt*sp*4;const x=d.ax==='z'?d.side*16.5:d.pos,z=d.ax==='z'?d.pos:d.side*16.5;d.g.position.set(x,0,z);d.g.rotation.y=d.ax==='z'?(d.dir>0?0:Math.PI):(d.dir>0?Math.PI/2:-Math.PI/2);
  d.lg.forEach((l,i)=>{l.rotation.x=Math.sin(d.ph+(i===0||i===3?0:Math.PI))*.7});d.tail.rotation.z=Math.sin(t*(sc?14:6))*.4}
 for(const c of clouds){c.s.position.x+=c.v*dt;if(c.s.position.x>560)c.s.position.x=-560}
 // rain falls 32 m/s and wraps over a 40 m column: each drop's height is a function of the film clock, so a frame looks
 // the same however many seeks or plays came before it (accumulating dt made the drops depend on the page's history)
 if(WX.rain){const cp=camera.position;rain.position.copy(cp);for(let i=0;i<RN;i++){const l=rainL[i],y=((l[1]+20-32*t)%40+40)%40-20;rainP[i*6]=l[0];rainP[i*6+1]=y;rainP[i*6+2]=l[2];rainP[i*6+3]=l[0]+.25;rainP[i*6+4]=y+1.1;rainP[i*6+5]=l[2]}rainG.attributes.position.needsUpdate=true}
 for(const p of puddles){p.rg.material.opacity=WX.rain?(1-((t*.8+p.ph)%1))*.45:0;const k=.2+((t*.8+p.ph)%1)*1.1;p.rg.scale.setScalar(k)}
 if(WX.storm){if(t>S.nl){S.fl=.14;S.nl=t+4+Q()*8;S.tw=t+.5+Q()}S.fl-=dt;hemi.intensity=hemiBase+(S.fl>0?2.4:0);if(S.tw&&t>S.tw){S.tw=0;/* Thunder is scheduled by its own mixer channel. */}}
 const red=S.jam||S.quaked||S.zc||Math.floor(t/9)%2;tl.forEach((m,i)=>{const c=S.out?0:((i%2?red:!red)?0xff3020:0x30ff60);m.emissive.set(c);m.color.set(c)})}
