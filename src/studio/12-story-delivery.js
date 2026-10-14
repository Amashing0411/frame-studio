// Ease each path segment independently. Repeated positions are actual holds.
// Characters with a dialogue line talk with the matching expression.
function updateTalkingFaces(t){const lines=dialogueList();for(const item of catalogInstances){const p=workshopActors.get(item.object);if(!p?.bones)continue;const motion=item.spec.path?.length?pathDistance(item.spec.path,t):null;if(motion&&motion.speed<.001)item.object.rotation.y=THREE.MathUtils.degToRad(item.spec.rotation?.[1]||0);const d=lines.find(d=>d.target===item.spec.instance_id&&t>=d.at&&t<d.at+d.duration);if(d)faceV2(p,'talk',t-d.at,d.mood==='surprised'?'surprised':d.mood==='worried'?'sad':'happy');item.object.updateMatrixWorld(true)}}
// Give the visitor an observable delivery action, with crates held by tentacles.

// Keep cloned preview rigs attached to their own bones, never the scene's rig.

for(const b of CATALOG_BASE)if(b.kind==='human')b.rig='continuous-skinned-IK';





