// One layout pass for thought clouds and speech balloons: keep clear of the title band and the caption/clock
// block, never overlap each other, and point each tail at its speaker.
function bubbleAnchor(item){const point=talkHeadPoint(item).add(V(0,.28,0)),delta=point.clone().sub(camera.position),distance=delta.length(),ray=new THREE.Ray(camera.position,delta.clone().normalize());if(cameraSolids.some(box=>{const hit=ray.intersectBox(box,V());return hit&&hit.distanceTo(camera.position)<distance-.3}))return null;const pr=point.project(camera);if(pr.z>1||pr.z<0||Math.abs(pr.x)>1.25||Math.abs(pr.y)>1.25)return null;return{x:(pr.x*.5+.5)*canvas.width,y:(-.5*pr.y+.5)*canvas.height}}
function roundRectPath(c,x,y,w,h,r){c.beginPath();c.moveTo(x-w/2+r,y-h/2);c.arcTo(x+w/2,y-h/2,x+w/2,y+h/2,r);c.arcTo(x+w/2,y+h/2,x-w/2,y+h/2,r);c.arcTo(x-w/2,y+h/2,x-w/2,y-h/2,r);c.arcTo(x-w/2,y-h/2,x+w/2,y-h/2,r);c.closePath()}

