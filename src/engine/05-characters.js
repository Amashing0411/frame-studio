// ---- characters
const JK=['py','lean','twist','cx','hx','hy','hz','lh','rh','lk','rk','lhz','rhz','ls','rs','lsz','rsz','le','re','sway'];
const IDLE={py:.95,lean:0,twist:0,cx:0,hx:0,hy:0,hz:0,lh:0,rh:0,lk:.05,rk:.05,lhz:.04,rhz:.04,ls:.05,rs:.05,lsz:.1,rsz:.1,le:.25,re:.25,sway:0};
function mkPerson(role){const variant=Math.floor(R()*24),r=R(),p=toyPerson({variant,role:role==='civ'?(r<.12?'child':r<.24?'elder':'casual'):role==='resp'?'worker':'police',color:WORKSHOP_STYLE.palette[variant%5],accessories:role==='resp'?['helmet','vest']:role==='sol'?['helmet']:variant%5===0?['backpack']:[]});p.role=role;world.add(p.g);return p}
