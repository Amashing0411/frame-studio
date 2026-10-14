// ---- build world (seeded)
function buildBaseWorld(seed,style,hz){
 if(typeof importedModels!=='undefined')importedModels.forEach(m=>{if(m.parent===world)world.remove(m)});world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>{for(const k of['map','emissiveMap','normalMap','roughnessMap','metalnessMap','alphaMap','bumpMap','aoMap']){const x=m[k];if(x&&x.isTexture&&!isSharedTex(x))x.dispose()}m.dispose()})});scene.remove(world);world=new THREE.Group();scene.add(world);if(typeof importedModels!=='undefined')importedModels.forEach(m=>world.add(m));MC={};
 R=rngf(seed||7);blds=[];veh=[];ppl=[];resc=[];lamps=[];tl=[];birds=[];pig=[];dogs=[];puddles=[];wetM=[];benches=[];const town=style==='town',wet=WX.rain;
 if(typeof buildBiome==='function'&&SC?.world?.biome&&SC.world.biome!=='city'){buildBiome(SC.world.biome);return}
 const roadC=wet?0x24262c:0x34373e,swkC=wet?0x8e8a80:0xb3ad9f;
 put(flat(new THREE.Mesh(new THREE.PlaneGeometry(900,900).rotateX(-Math.PI/2),mat(town?0x7d9a5a:wet?0x5e5c57:0x7c7a72))),0,0,0);
 put(flat(mk(28,.1,440,roadC)),0,.05,0);put(flat(mk(440,.1,28,roadC)),0,.06,0);
 for(const s of[-1,1])for(const t of[-1,1]){put(flat(mk(5,.14,206,swkC)),s*16.5,.07,t*117);put(flat(mk(206,.14,5,swkC)),t*117,.08,s*16.5)}
 for(const t of[-1,1]){put(flat(mk(.4,.12,206,0xe8c24a)),0,.1,t*117);put(flat(mk(206,.12,.4,0xe8c24a)),t*117,.11,0)}
 for(const s of[-1,1])for(const t of[-1,1])for(let i=-5;i<=5;i++){put(flat(mk(.7,.12,3,0xf2f2f2)),i*2.2,.12,t*13.5);put(flat(mk(3,.12,.7,0xf2f2f2)),t*13.5,.13,i*2.2);if(s>0)break}
 for(const sx of[-1,1])for(const sz of[-1,1]){put(flat(mk(30,.08,30,0xa89f8c)),sx*33,.04,sz*33);palm(sx*(24+R()*6),sz*(24+R()*6));palm(sx*(36+R()*6),sz*(36+R()*6));tree(sx*(40+R()*3),sz*(26+R()*8));bush(sx*(28+R()*8),sz*(40+R()*3));
  const sg=Math.atan2(-sx*30,-sz*25);bench(sx*30,sz*25,sg);bench(sx*25,sz*34,Math.atan2(-sx*25,-sz*34));
  const p=new THREE.Group(),lm=mk(.3,.3,.12,0xff3020,0xff3020,1.5);put(cyl(.08,.1,5,5,0x2a2d33),0,2.5,0,p);put(mk(.4,.9,.3,0x1d1f26),0,4.9,0,p);lm.position.set(0,5.1,.18);p.add(lm);p.position.set(sx*15,0,sz*15);p.rotation.y=Math.atan2(-sx,-sz);world.add(p);tl.push(lm.material);
  bin(sx*17.5,sz*(21+R()*8));bin(sx*(21+R()*8),sz*17.5);const hy=cyl(.12,.14,.7,6,0xd02a24);put(hy,sx*19.2,.35,sz*(30+R()*10));if(sx*sz>0)cart(sx*36,sz*21.5,Math.atan2(-sx,-sz*.2),pick(ACC))}
 for(const s of[-1,1])for(let a=-170;a<=170;a+=34){if(Math.abs(a)<20)continue;[[s*19.5,a],[a,s*19.5]].forEach(p=>{const g=new THREE.Group(),hd=mk(.9,.25,.5,0x40444c,0xffe2a0,EI*1.2);put(cyl(.1,.14,7,5,0x40444c),0,3.5,0,g);hd.position.set(0,7.1,0);g.add(hd);g.position.set(p[0],0,p[1]);world.add(g);lamps.push(hd.material)})}
 const nl=Math.round(70*QL);for(let i=0;i<nl;i++){const s=R()<.5?-1:1,a=(R()-.5)*320;if(R()<.5)litter(s*(14.5+R()*4),a);else litter(a,s*(14.5+R()*4))}
 for(let i=0;i<Math.round(14*QL);i++){const a=(R()-.5)*320,s=R()<.5?-1:1;if(Math.abs(a)>22){if(R()<.5)bin(s*17.5,a);else bin(a,s*17.5)}}
 for(let i=0;i<Math.round(28*QL);i++){const x=(R()-.5)*300,z=R()<.5?(R()-.5)*20:(R()-.5)*300,pd=new THREE.Mesh(new THREE.CircleGeometry(.8+R()*1.4,10).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x2a3a52,roughness:.15,metalness:.5,transparent:true,opacity:wet?.75:.0})),rg=new THREE.Mesh(new THREE.RingGeometry(.8,1,14).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xcfe0f0,transparent:true,opacity:0,depthWrite:false}));
  flat(pd);flat(rg);const px=(R()<.5?x:(R()<.5?-1:1)*(15+R()*3)),pz=R()<.5?z:(R()<.5?-1:1)*(15+R()*3);put(pd,px,.15,pz);put(rg,px,.16,pz);puddles.push({pd,rg,ph:R()})}
 const cs=24,dens=.06+R()*.12+(1-QL)*.22,hs=.75+R()*.7,cl0=R()*6.283;
 for(let i=-8;i<8;i++)for(let j=-8;j<8;j++){const cx=(i+.5)*cs,cz=(j+.5)*cs;if(Math.min(Math.abs(cx),Math.abs(cz))<30||(Math.abs(cx)<48&&Math.abs(cz)<48)||R()<dens)continue;const dist=Math.hypot(cx,cz);
  if(town){for(let k=0;k<2;k++)house(cx+(k?5.5:-5.5)+(R()-.5)*2,cz+(R()-.5)*8,7+R()*3,8+R()*3,3.5+R()*2.5);if(R()<.5)tree(cx+(R()-.5)*16,cz+(R()-.5)*16)}
  else{const w=16+R()*5,d=16+R()*5,cb=Math.pow(Math.max(0,Math.cos(Math.atan2(cz,cx)-cl0)),3)*40;tower(cx,cz,w,d,(10+R()*22+(dist>100?R()*35:0)+cb)*hs,dist)}}
 const nv=Math.max(2,Math.round(6*QL)),vt=town?['car','car','jeep','trike']:['car','car','taxi','jeep','bus','trike'];
 [-9,-4,4,9].forEach(l=>['z','x'].forEach(ax=>{const sp=6+R()*3;for(let k=0;k<nv;k++){const g=mkVeh(pick(vt),pick(vc));world.add(g);veh.push({g,ax,l,sp,pos0:-200+k*(400/nv)+R()*10,pos:0,dir:l>0?1:-1,cur:sp})}}));
 const mkP=(o,i)=>{o.i=i;ppl.push(o);return o};let n=0;
 const nw=Math.round(46*QL);for(let i=0;i<nw;i++){const o=mkP(mkPerson('civ'),n++);o.ax=i%2?'z':'x';o.side=R()<.5?-1:1;o.dir0=R()<.5?-1:1;o.pos0=(24+R()*140)*(R()<.5?-1:1);const j=(i%5-2)*.5,r=R();o.act=r<.12?'jog':r<.34?'phone':'walk';if(o.act==='jog')o.sp0=2.6;o.hx=o.ax==='z'?o.side*16.5+j:o.pos0;o.hz=o.ax==='z'?o.pos0:o.side*16.5+j}
 const np=Math.round(8*QL);for(let i=0;i<np;i++){const o=mkP(mkPerson('civ'),n++);o.ax='p';o.act='walk';const sx=R()<.5?-1:1,sz=R()<.5?-1:1;o.hx=sx*(22+R()*22);o.hz=sz*(22+R()*22);o.pos0=0;o.dir0=1}
 const ns=Math.min(benches.length,Math.round(8*QL));for(let i=0;i<ns;i++){const o=mkP(mkPerson('civ'),n++),b=benches[i];o.ax='s';o.act='sit';o.sitP=R()<.5?'sit_phone':'sit_news';o.hx=b.x;o.hz=b.z-0.0;o.yaw0=b.yaw;o.pos0=0;o.dir0=1}
 const nt=Math.round(5*QL);for(let i=0;i<nt;i++){const sx=R()<.5?-1:1,sz=R()<.5?-1:1,cx=sx*(20+R()*22),cz=sz*(20+R()*22),ya=R()*6.28;for(let k=0;k<2;k++){const o=mkP(mkPerson('civ'),n++);o.ax='t';o.act='talk';o.hx=cx+Math.sin(ya)*(k?.6:-.6);o.hz=cz+Math.cos(ya)*(k?.6:-.6);o.yaw0=ya+(k?Math.PI:0);o.pos0=0;o.dir0=1}}
 for(let i=0;i<3;i++){const o=mkP(mkPerson('civ'),n++);o.ax='v';o.act='vendor';const sx=i<2?-1:1,sz=i===1?-1:1;o.hx=sx*36;o.hz=sz*24.2;o.yaw0=Math.atan2(-sx*.01,-sz);o.pos0=0;o.dir0=1}
 for(let i=0;i<8;i++){const o=mkPerson(hz==='zombie'?'sol':'resp');o.rs=true;o.ax='r';o.hx=o.hz=0;o.i=100+i;o.g.visible=false;o.pos0=0;o.dir0=1;resc.push(o)}
 // animals
 const mkBird=()=>{const g=new THREE.Group(),b=ico(.12,0x555a62),wl=mk(.6,.03,.22,0x666b73),wr=mk(.6,.03,.22,0x666b73);b.scale.set(1,.8,1.7);wl.geometry.translate(-.3,0,0);wr.geometry.translate(.3,0,0);wl.position.x=-.08;wr.position.x=.08;g.add(b,wl,wr);g.scale.setScalar(2.2);world.add(g);return{g,wl,wr}};
 for(let i=0;i<Math.round(12*QL);i++){const b=mkBird();b.cx=(R()-.5)*160;b.cz=(R()-.5)*160;b.r=30+R()*80;b.h=28+R()*45;b.a=R()*6.28;b.w=(.2+R()*.3)*(R()<.5?1:-1);b.ph=R()*6;birds.push(b)}
 for(let i=0;i<Math.round(8*QL);i++){const g=new THREE.Group(),b=ico(.1,0x8a8f98),h=ico(.055,0x6f7480);b.scale.set(1,.85,1.4);h.position.set(0,.1,.13);const bk=mk(.02,.02,.05,0xd8a030);bk.position.set(0,.09,.19);g.add(b,h,bk);const sx=R()<.5?-1:1,sz=R()<.5?-1:1;g.position.set(sx*(22+R()*22),.1,sz*(22+R()*22));g.scale.setScalar(1.8);world.add(g);pig.push({g,hd:h,x:g.position.x,z:g.position.z,ph:R()*6,fly:false,vy:0,vx:0,vz:0,dl:R()*1.5,h:bk})}
 for(let i=0;i<Math.round(4*QL);i++){const g=new THREE.Group(),c=pick([0x8a6a46,0x2a2a2a,0xc9a46a,0xd8d8d8]),bd=ico(.28,c);bd.scale.set(.6,.55,1.2);bd.position.y=.5;const hd=ico(.15,c);hd.position.set(0,.66,.38);const sn=mk(.1,.08,.14,0x222222);sn.position.set(0,.62,.5);const tail=cyl(.025,.04,.3,4,c);tail.position.set(0,.68,-.38);tail.rotation.x=-.9;g.add(bd,hd,sn,tail);
  const lg=[];for(const sx of[-.1,.1])for(const sz of[-.25,.25]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.04,.03,.34,5).translate(0,-.17,0),mat(c));l.position.set(sx,.4,sz);g.add(l);lg.push(l)}
  world.add(g);dogs.push({g,lg,tail,ax:i%2?'z':'x',side:R()<.5?-1:1,pos0:(24+R()*130)*(R()<.5?-1:1),dir0:R()<.5?-1:1,ph:R()*6})}
 enhanceModels();world.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=!o.userData.nf&&!o.userData.pp}})}
// Build the world from a seed; city worlds then get the toy finish unless the scenario asks for the classic look.
function build(seed,style,hz){worldLife={plants:[],bodies:[],t:0};buildBaseWorld(seed,style,hz);if(SC?.world?.biome&&SC.world.biome!=='city')return;if(SC?.world?.finish==='classic')return;stylizeCityWorld()}
