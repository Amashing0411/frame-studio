// Platform safe zones on the 1080x1920 delivery frame, measured from the user's YouTube Shorts and TikTok templates.
// Margins are in delivery pixels; `right` is a list of [fromY, margin] steps because the action-button column widens lower down.
const SAFE_ZONES={
 youtube:{name:'YouTube Shorts',top:240,bottom:380,left:60,right:[[0,120],[720,200]]},
 tiktok:{name:'TikTok',top:252,bottom:640,left:120,right:[[0,120],[360,240]]},
 // the stricter edge of each: top max(240,252), bottom max(380,640), left max(60,120), right max per band (120 above y=360, 240 below)
 both:{name:'YouTube Shorts + TikTok',top:252,bottom:640,left:120,right:[[0,120],[360,240]]}};
// Where the overlays put titles, captions and the end card in the current frame; speech balloons stay clear of them.
let frameLayout={titleBottom:0,captionTop:Infinity};
const SAFE_MEASURE=document.createElement('canvas').getContext('2d');
let safeCheckHits=[];

function zoneRight(z,y){let m=z.right[0][1];for(const [from,v] of z.right)if(y>=from)m=v;return m}
function safeZone(mode=UI.safeZone){return SAFE_ZONES[mode]||null}
// The safe area for a w x h canvas, or null when safe zones are off. rightEdge(y0,y1) is the usable right edge across that band.
function safeArea(w,h,mode=UI.safeZone){const z=safeZone(mode);if(!z)return null;const sx=w/1080,sy=h/1920;
 const rightEdge=(y0,y1)=>{let m=0;for(let i=0;i<z.right.length;i++){const from=z.right[i][0]*sy,to=i+1<z.right.length?z.right[i+1][0]*sy:Infinity;if(y1>=from&&y0<to)m=Math.max(m,z.right[i][1])}return w-m*sx};
 const box=(y0,y1)=>{const x0=z.left*sx,x1=rightEdge(y0,y1);return{x0,x1,cx:(x0+x1)/2,width:x1-x0}};
 return{zone:z,top:z.top*sy,bottom:h-z.bottom*sy,left:z.left*sx,rightEdge,box}}
// Title and caption boxes of the standard overlay inside a safe area (shared by drawing and validation so they always agree).
function safeTextBoxes(a,w,h){const titleTop=a.top+h*.012,capBottom=a.bottom-h*.012-8;
 // the caption's background box reaches 10px past its text on each side (drawText), so the text gets 20px less width
 const cap=a.box(capBottom-h*.13,capBottom);
 return{title:{...a.box(titleTop,titleTop+h*.30),y:titleTop,maxH:Math.min(h*.30,(a.bottom-a.top)*.36)},caption:{...cap,width:cap.width-20,bottom:capBottom,maxH:h*.13}}}

// Validation step: warn when a title or caption only fits the safe area by shrinking far below its normal size.
function validateSafeZoneText(j,r){const a=safeArea(1080,1920);if(!a)return;const b=safeTextBoxes(a,1080,1920),scale=Number(UI.textScale)||1,family=UI.font;
 (r.fl||[]).forEach((s,i)=>{const n='Shot '+(i+1)+': ',label=typeof s.label==='string'?s.label:'',cap=typeof s.caption==='string'?s.caption:s.caption?.text||'';
  const check=(text,box,size,weight,what)=>{if(!text)return;const f=fitText(text,box.width,size,box.maxH,weight,family,SAFE_MEASURE),k=f.size/size;
   if(k<.75)r.w.push(n+what+' is too long for the '+a.zone.name+' safe area: it shrinks to '+Math.round(k*100)+'% size. Shorten it.')};
  check(label,b.title,1080*.077*scale,700,'the title');check(cap,b.caption,1080*.041*scale,500,'the caption')})}

// The safe-zone guides: drawn on their own canvas over the film, so they never reach a PNG or a video export.
function drawSafeGuides(){const c=$('safeCanvas');if(!c)return;const a=safeArea(1080,1920),show=!!a&&UI.safeGuides!==false;c.hidden=!show;if(!show)return;
 const g=c.getContext('2d'),W=1080,H=1920,z=a.zone,Y='#ffe14a',ghost='rgba(255,255,255,.30)';g.clearRect(0,0,W,H);
 // the safe area as a polygon (the right edge steps inward lower down)
 const pts=[[a.left,a.top]];for(let i=0;i<z.right.length;i++){const from=Math.max(a.top,z.right[i][0]),to=i+1<z.right.length?Math.min(a.bottom,z.right[i+1][0]):a.bottom;if(to<=from)continue;pts.push([W-z.right[i][1],from],[W-z.right[i][1],to])}pts.push([a.left,a.bottom]);
 g.fillStyle='rgba(8,10,18,.52)';g.beginPath();g.rect(0,0,W,H);g.moveTo(pts[0][0],pts[0][1]);for(const p of pts.slice(1))g.lineTo(p[0],p[1]);g.closePath();g.fill('evenodd');
 g.strokeStyle=Y;g.lineWidth=4;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.stroke();
 const tag=(text,x,y,align='center')=>{g.font='700 30px Arial';const tw=g.measureText(text).width+24,x0=align==='center'?x-tw/2:align==='right'?x-tw:x;g.fillStyle='rgba(8,10,18,.82)';g.fillRect(x0,y-21,tw,42);g.strokeStyle=Y;g.lineWidth=2;g.strokeRect(x0,y-21,tw,42);g.fillStyle=Y;g.textAlign='center';g.textBaseline='middle';g.fillText(text,x0+tw/2,y+1)};
 tag(z.name.toUpperCase()+' SAFE ZONE',a.left+8,46,'left');
 tag(z.top+' px',W/2,a.top/2+18);tag(z.bottom+' px',W*.42,a.bottom+(H-a.bottom)*.5);tag(z.left+'',a.left/2,(a.top+a.bottom)/2);
 z.right.forEach(([from,m],i)=>{const to=i+1<z.right.length?z.right[i+1][0]:a.bottom,mid=(Math.max(from,a.top)+Math.min(to,a.bottom))/2;if(mid>a.top&&mid<a.bottom)tag(m+'',W-m/2,mid)});
 // generic ghost interface: tabs at the top, action buttons on the right, caption lines at the bottom (no platform logos)
 g.fillStyle=ghost;const pill=(x,y,w,h)=>{g.beginPath();g.roundRect(x,y,w,h,h/2);g.fill()};
 pill(W/2-230,a.top*.42,200,46);pill(W/2+30,a.top*.42,200,46);g.beginPath();g.arc(W-70,a.top*.42+23,26,0,Math.PI*2);g.fill();
 const colX=W-zoneRight(z,a.bottom-1)/2;let y=a.bottom-560;for(let i=0;i<5;i++){g.beginPath();g.arc(colX,y,i?40:50,0,Math.PI*2);g.fill();if(i)pill(colX-34,y+52,68,16);y+=i?128:140}
 pill(a.left,a.bottom+40,300,40);pill(a.left,a.bottom+100,Math.min(560,W-a.left-zoneRight(z,a.bottom)-40),30);pill(a.left,a.bottom+148,420,30);
 if(z.bottom>500){g.fillStyle='rgba(255,255,255,.16)';g.fillRect(0,H-150,W,150);g.fillStyle=ghost;for(let i=0;i<5;i++){g.beginPath();g.arc(W*(i+.5)/5,H-80,i===2?40:26,0,Math.PI*2);g.fill()}}}

function setSafeZone(mode){UI.safeZone=SAFE_ZONES[mode]?mode:'off';$('safeZone').value=UI.safeZone;drawSafeGuides();
 if(validatedSource&&validatedSource===$('ta').value){const r=validate(parse());validation=r;report(r)}
 composeFrame(T);autosave();checkSafeZoneSubjects()}

// The camera's subject for a shot: the asset it follows, or for an authored camera the placed asset nearest the point it
// looks at (within 2.5 m), or the closeup person. People are measured at head height, objects at their centre.
function shotSubjectPoint(s){let id=s.cam?.target_id;if(!id&&Array.isArray(s.cam?.look)){const L=V(...s.cam.look);let best=2.5;for(const a of catalogInstances){if(!a.object.visible)continue;const p=a.object.position,d=Math.hypot(p.x-L.x,p.z-L.z);if(d<best){best=d;id=a.spec.instance_id}}}
 if(id){const item=catalogInstances.find(a=>a.spec.instance_id===id);if(!item||!item.object.visible)return null;
  const rig=workshopActors.get(item.object);if(rig?.hd)return{name:item.spec.name||id,point:rig.hd.getWorldPosition(V())};
  const box=visibleBox(item.object);return box.isEmpty()?null:{name:item.spec.name||id,point:box.getCenter(V())}}
 if(s.cam?.preset==='closeup'){const p=s.heroP||ppl[0];if(p?.hd)return{name:'the closeup person',point:p.hd.getWorldPosition(V())}}return null}
// Bounds of the meshes that actually show (Box3.setFromObject also counts hidden accessories and props).
function visibleBox(root){const box=new THREE.Box3(),part=new THREE.Box3();root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld))});return box}
function noGoPart(a,x,y,w,h){if(x<0||x>w||y<0||y>h)return'outside';if(y<a.top)return'top';if(y>a.bottom)return'bottom';if(x<a.left)return'left';if(x>a.rightEdge(y,y))return'right';return null}
let cameraCheckHits=[];
// A camera inside a building or vehicle box, or a box between the camera and the shot's subject (null when clear).
function cameraClearance(sub){if(!cameraSolids.length)return null;const cam=camera.getWorldPosition(V());
 if(cameraSolids.some(b=>b.clone().expandByScalar(.15).containsPoint(cam)))return'inside';if(!sub)return null;
 const d=sub.point.clone().sub(cam),len=d.length(),ray=new THREE.Ray(cam,d.normalize()),hit=V();
 return cameraSolids.some(b=>!b.containsPoint(sub.point)&&ray.intersectBox(b,hit)&&hit.distanceTo(cam)<len-.4)?'blocked':null}
// After Validate (or a zone change): play the film once without drawing, sample each shot three times and warn when its
// subject sits under the platform interface (with a safe zone selected) and when the camera is inside a building or a
// building blocks its view of the subject. Cancels itself if a seek, playback or export starts, then returns to the current time.
async function checkSafeZoneSubjects(){const a=safeArea(canvas.width,canvas.height);safeCheckHits=[];cameraCheckHits=[];if(!shots.length||recording||seeking||!validatedSource)return;
 const token=++seekToken,back=T;stopPlayback();seeking=true;status(a?'Checking safe zones and cameras…':'Checking cameras…');const w=canvas.width,h=canvas.height,
  samples=shots.flatMap((s,i)=>[.15,.5,.85].map(f=>({i,t:s.t0+(s.t1-s.t0)*f}))).sort((p,q)=>p.t-q.t),flagged=new Set(),camFlagged=new Set();let k=0;
 try{prepareScene();refreshCameraSolids();simulating=true;const n=Math.floor(Math.min(END,filmEnd)*60);let due=performance.now()+24;
  for(let i=0;i<n&&k<samples.length;i++){if(token!==seekToken)return;stepCount++;step(1/60,stepCount/60);
   while(k<samples.length&&stepCount/60>=samples[k].t){const sp=samples[k++],s=shots[sp.i],sub=shotSubjectPoint(s);camera.updateMatrixWorld(true);
    if(!camFlagged.has(sp.i)){const c=cameraClearance(sub);if(c){camFlagged.add(sp.i);cameraCheckHits.push('Shot '+(sp.i+1)+' at '+timecode(sp.t)+': '+(c==='inside'?'the camera is inside a building or vehicle.':'a building blocks the camera\'s view of '+sub.name+'.')+' Move the camera (cam.pos or offset) or raise it.')}}
    if(!a||flagged.has(sp.i)||!sub)continue;const v=sub.point.clone().project(camera);if(v.z<0||v.z>1)continue;const x=(v.x*.5+.5)*w,y=(-.5*v.y+.5)*h,part=noGoPart(a,x,y,w,h);
    if(part){flagged.add(sp.i);safeCheckHits.push('Shot '+(sp.i+1)+' at '+timecode(sp.t)+': '+sub.name+(part==='outside'?' is outside the frame.':' is under the '+a.zone.name+' '+part+' area.')+' Move the camera or change target_height/offset.')}}
   if(performance.now()>due){status((a?'Checking safe zones and cameras… ':'Checking cameras… ')+Math.round(i/n*100)+'%');await new Promise(r=>setTimeout(r,0));due=performance.now()+24}}}
 finally{if(token===seekToken){simulating=false;seeking=false}}
 if(token!==seekToken)return;const rep=$('rep');rep.textContent=rep.textContent.replace(/\n?(Safe zones|Camera clearance)[^]*$/,'')+(a?'\nSafe zones ('+a.zone.name+'): '+(safeCheckHits.length?safeCheckHits.length+' warning(s)\n- '+safeCheckHits.join('\n- '):'every camera subject is inside the safe area.'):'')+'\nCamera clearance: '+(cameraCheckHits.length?cameraCheckHits.length+' warning(s)\n- '+cameraCheckHits.join('\n- '):'every camera is clear of buildings.');
 await seekFilm(back)}
