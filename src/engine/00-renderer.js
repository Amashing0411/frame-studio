
const $=id=>document.getElementById(id);
if(!window.THREE){$('rep').textContent='Three.js failed to load. Check your connection and reload.';throw new Error('no three')}
const cl=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),sm=v=>{v=cl(v);return v*v*(3-2*v)},lp=(a,b,k)=>a+(b-a)*k,V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const rngf=s=>()=>(s=s*16807%2147483647)/2147483647;
let R=rngf(7),Q=rngf(99),QL=.7;const pick=a=>a[R()*a.length|0];
let renderer;try{renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true,preserveDrawingBuffer:true})}catch(e){$('rep').textContent='WebGL is not available in this browser.';throw e}
renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(56,9/16,.3,1200);scene.add(camera);
function size(){if(typeof configureRender==='function')configureRender()}
addEventListener('resize',size);
