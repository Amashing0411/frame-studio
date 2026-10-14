// ---- navigation
function route(o,tx,tz){const ax=Math.abs(o.x),az=Math.abs(o.z),inZ=ax<19&&az>=46,inX=az<19&&ax>=46,tZ=Math.abs(tx)<19&&Math.abs(tz)>=46,tX=Math.abs(tz)<19&&Math.abs(tx)>=46;
 if(inZ&&!tZ)return[o.x,Math.sign(o.z)*44];if(inX&&!tX)return[Math.sign(o.x)*44,o.z];
 if(tZ&&az<46)return[cl(tx,-15,15),Math.sign(tz)*47];if(tX&&ax<46)return[Math.sign(tx)*47,cl(tz,-15,15)];return[tx,tz]}
function moveTo(o,tx,tz,sp,dt){if(Math.hypot(tx-o.x,tz-o.z)<.8)return 0;const w=route(o,tx,tz),dx=w[0]-o.x,dz=w[1]-o.z,dd=Math.hypot(dx,dz)||1,st=Math.min(sp*dt,dd);o.x+=dx/dd*st;o.z+=dz/dd*st;o.f.set(dx/dd,0,dz/dd);o.yaw=Math.atan2(dx,dz);return sp}
function away(o,ax,az){if(Math.abs(o.x)<46&&Math.abs(o.z)<46){if(Math.abs(ax)>Math.abs(az))return[Math.sign(ax||1)*150,cl(o.z,-15,15)];return[cl(o.x,-15,15),Math.sign(az||1)*150]}
 if(Math.abs(o.x)<19)return[o.x,Math.sign(az||1)*165];return[Math.sign(ax||1)*165,o.z]}
const tgOf=o=>o.tg||(o.tg=[Math.sign(o.x||1)*(22+Q()*22),Math.sign(o.z||1)*(22+Q()*22)]);
