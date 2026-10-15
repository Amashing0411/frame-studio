// Step 7 cast: people wear Quaternius glTF bodies (public/models/cast, built by tools/build-cast.mjs) driven by the
// procedural motion rig. buildToyRig still makes the skeleton, IK, gait and v3 face; attachCastBody moves that
// skeleton's joints onto the glTF joints, hides the procedural body and puts the face on the glTF head, and
// syncCastBodies (a named step of renderFilm and the Asset studio render) copies the final bone rotations onto the
// glTF skeleton just before drawing, after every pose, blend and look-at has run. Without the models (load failed,
// offline file) people keep their procedural bodies.
const CAST_WOMEN = ['u-woman', 'u-woman-casual', 'u-woman-tank', 'u-woman-dress', 'm-woman2', 'm-woman3', 'm-punk2', 'm-adventurer2'];
const CAST_MEN = ['u-man', 'u-man2', 'u-man-sleeves', 'm-beach', 'm-casual', 'm-business', 'm-hoodie', 'm-farmer', 'm-punk', 'm-adventurer'];
const CAST_ROLE = { elder: 'u-man-suit', worker: 'm-worker', police: 'm-swat', sol: 'm-swat' };
const CAST = { ready: false, src: new Map(), info: new Map(), people: new Set() };
// Height of an adult cast body before the person's own scale (child .74, elder .96) is applied.
const CAST_HEIGHT = { m: 1.80, f: 1.71 };
// Children are made from the adult models: the person's child scale plus a bigger head.
const CAST_CHILD_HEAD = 1.28;
const CAST_HIDE_MATERIAL = /^(Eye|Eyes|Eyebrows)$/;
const CAST_FACE_FEATURE = 1.4, CAST_MOUTH = 1.2;
const CAST_SKIN = /^Skin/, CAST_NOT_CLOTH = /^(Skin|Hair|HairBase|Hair_.*|Eye|Eyes|Eyebrows|Moustache|Gold|Earrings|Visor)$/;

async function loadCast() {
  const loader = new THREE.GLTFLoader(), ids = [...new Set([...CAST_WOMEN, ...CAST_MEN, ...Object.values(CAST_ROLE)])];
  try {
    await Promise.all(ids.map(id => new Promise((ok, fail) => loader.load('models/cast/' + id + '.glb', g => { CAST.src.set(id, g.scene); ok(); }, undefined, fail))));
    CAST.ready = true;
  } catch (e) { CAST.src.clear(); CAST.ready = false; console.warn('Cast models did not load; people keep their procedural bodies.', e); }
}

function castModelFor({ role = 'casual', variant = 0 }, feminine) {
  if (role === 'elder' && feminine) return CAST_WOMEN[variant % CAST_WOMEN.length];
  if (CAST_ROLE[role]) return CAST_ROLE[role];
  const list = feminine ? CAST_WOMEN : CAST_MEN; return list[variant % list.length];
}

// Per source model, measured once in its own (unscaled) space: height, which material is the top garment.
function castInfo(id) {
  let info = CAST.info.get(id); if (info) return info;
  const src = CAST.src.get(id); src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src), h = box.max.y - box.min.y, mats = new Map();
  src.traverse(o => {
    if (!o.isMesh) return; const m = o.material; if (CAST_NOT_CLOTH.test(m.name)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld), c = b.getCenter(V()), n = o.geometry.attributes.position.count;
    const rel = (c.y - box.min.y) / h; if (rel < .45 || rel > .85) return;
    mats.set(m.name, (mats.get(m.name) || 0) + n);
  });
  const top = [...mats].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  info = { h, minY: box.min.y, top }; CAST.info.set(id, info); return info;
}

const castV = () => new THREE.Vector3(), castQ = () => new THREE.Quaternion();
// Position and rotation of an object in the person's own frame (p.g, without its scale).
function castLocalPos(p, o, out = castV()) { return p.g.worldToLocal(o.getWorldPosition(out)); }
function castLocalQuat(p, o, out = castQ()) { return out.copy(p.g.getWorldQuaternion(castQ()).invert().multiply(o.getWorldQuaternion(castQ()))); }

function attachCastBody(p, opts = {}) {
  const id = castModelFor(opts, p.fem), src = CAST.src.get(id); if (!src) return p;
  const info = castInfo(id), sex = CAST_WOMEN.includes(id) ? 'f' : 'm', body = THREE.SkeletonUtils.clone(src);
  body.name = 'Cast body ' + id; body.userData.castId = id;
  // GLTFLoader and SkeletonUtils.clone give every skinned mesh its own Skeleton (and bone texture, updated each
  // frame). A body's meshes use the same bones, so they share one skeleton per distinct bind.
  const shared = [];
  body.traverse(o => {
    if (!o.isSkinnedMesh) return; const sk = o.skeleton;
    const same = shared.find(s => s.bones.length === sk.bones.length && s.bones.every((b, i) => b === sk.bones[i]) && s.boneInverses.every((m, i) => m.equals(sk.boneInverses[i])));
    if (same) o.bind(same, o.bindMatrix); else shared.push(sk);
  });
  const s = CAST_HEIGHT[sex] * (1 + ((p.variant * 7) % 5 - 2) * .012) / info.h;
  body.scale.setScalar(s); body.position.y = -info.minY * s; p.g.add(body);
  const bone = n => body.getObjectByName(n);
  const G = { body: bone('Body'), hips: bone('Hips'), torso: bone('Torso'), head: bone('Head'), arms: [], legs: [] };
  // The rig's arms[0]/legs[0] are on -x. The models name sides from the character's view (".L" on +x), so pair by
  // position: whichever side's upper leg sits on -x goes first.
  body.updateMatrixWorld(true);
  const sides = bone('UpperLegL') && castLocalPos(p, bone('UpperLegL')).x > 0 ? ['R', 'L'] : ['L', 'R'];
  for (const sd of sides) {
    G.arms.push({ up: bone('UpperArm' + sd), low: bone('LowerArm' + sd), hand: bone('Palm' + sd) || bone('Wrist' + sd) });
    G.legs.push({ up: bone('UpperLeg' + sd), low: bone('LowerLeg' + sd), end: bone('LowerLeg' + sd + '_end'), foot: bone('Foot' + sd) });
  }
  if (!G.body || !G.hips || !G.torso || !G.head || G.arms.some(a => !a.up || !a.low || !a.hand) || G.legs.some(l => !l.up || !l.low || !l.foot)) { p.g.remove(body); return p; }
  if (opts.role === 'child') G.head.scale.setScalar(CAST_CHILD_HEAD);
  p.g.updateMatrixWorld(true);

  // 1. Fit the motion rig to the model: same joint positions and limb lengths, so IK and gait drive this body.
  const at = o => castLocalPos(p, o), ankle = l => at(l.end || l.foot);
  const set = (b, v) => { b.position.copy(v); b.userData.restPosition = v.toArray(); };
  const len = (a, b) => at(a).distanceTo(b.isVector3 ? b : at(b));
  set(p.pv, at(G.body)); set(p.sp, at(G.hips).sub(at(G.body))); set(p.ch, at(G.torso).sub(at(G.hips))); set(p.hd, at(G.head).sub(at(G.torso)));
  for (let i = 0; i < 2; i++) {
    const a = p.arms[i], g = G.arms[i], l = p.legs[i], k = G.legs[i];
    set(a.sh, at(g.up).sub(at(G.torso))); set(a.el, V(0, -len(g.up, g.low), 0)); set(a.ha, V(0, -len(g.low, g.hand), 0));
    set(l.hp, at(k.up).sub(at(G.body))); set(l.kn, V(0, -len(k.up, k.low), 0)); set(l.ft, V(0, -len(k.low, ankle(k)), 0));
  }
  p.ankleY = (ankle(G.legs[0]).y + ankle(G.legs[1]).y) / 2; p.footX = (Math.abs(ankle(G.legs[0]).x) + Math.abs(ankle(G.legs[1]).x)) / 2;
  for (const b of p.bones) { b.quaternion.fromArray(b.userData.restQuaternion); b.scale.fromArray(b.userData.restScale); }
  if (opts.role === 'child') { p.hd.userData.restScale = p.hd.userData.restScale.map(v => v * CAST_CHILD_HEAD); p.hd.scale.fromArray(p.hd.userData.restScale); }
  p.g.updateMatrixWorld(true);

  // 2. Bone pairs, parents first. Limbs also get a rest alignment: the model's rest limb direction onto the rig's.
  const pairs = [], down = V(0, -1, 0), along = V(0, 1, 0);
  const pair = (P, B, child, Pchild) => {
    const qP0 = castLocalQuat(p, P), qG0 = castLocalQuat(p, B); let align = castQ();
    if (child) { const dG = at(child).sub(at(B)).normalize(), dP = Pchild ? at(Pchild).sub(at(P)).normalize() : down.clone().applyQuaternion(qP0); align.setFromUnitVectors(dG, dP); }
    pairs.push({ P, G: B, qP0inv: qP0.invert(), alignG0: align.multiply(qG0), position: P === p.pv });
  };
  pair(p.pv, G.body); pair(p.sp, G.hips); pair(p.ch, G.torso); pair(p.hd, G.head);
  for (let i = 0; i < 2; i++) {
    const a = p.arms[i], g = G.arms[i], l = p.legs[i], k = G.legs[i];
    // no hand pair: the rig keeps hands pointing down in world space (right for its mittens, a snapped wrist on a real
    // hand under a raised forearm), so the model's hand keeps its rest angle to the forearm: a straight wrist
    pair(a.sh, g.up, g.low, a.el); pair(a.el, g.low, g.hand, a.ha);
    pair(l.hp, k.up, k.low, l.kn); pair(l.kn, k.low, k.end || k.foot, l.ft);
  }
  // Feet are IK bones under the model root: placed at the shin's end, turned with the rig's foot.
  const feet = G.legs.map((k, i) => { const ft = p.legs[i].ft; return { G: k.foot, tip: k.end || null, P: ft, qP0inv: castLocalQuat(p, ft).invert(), qG0: castLocalQuat(p, k.foot), offset: at(k.foot).sub(ankle(k)) }; });

  // 3. Hide the procedural body (keep the face, accessories, props, apron and contact shadow) and the model's painted eyes.
  const keepUnder = new Set([p.fc, p.phone, p.news, p.um]), keepName = /^(Accessory_|Cloth apron|Apron|Contact shadow)/;
  const kept = o => { for (let x = o; x && x !== p.g; x = x.parent) if (keepUnder.has(x) || keepName.test(x.name)) return true; return false; };
  const refs = new Set(); for (const v of Object.values(p)) for (const x of [].concat(v || [])) if (x && x.isObject3D) refs.add(x);
  const drop = []; p.g.traverse(o => { if (!o.isMesh || o === body || kept(o)) return; for (let x = o; x; x = x.parent) if (x === body) return; drop.push(o); });
  for (const o of drop) { o.visible = false; o.userData.castHidden = true; if (!refs.has(o)) o.parent?.remove(o); }
  for (const h of p.v3?.hands || []) for (const m of [h.palm, h.block, h.index]) if (m) m.visible = false;
  p.v3?.nose && (p.v3.nose.visible = false);

  // 4. Materials: skin and top garment private to this person (zombie tint, catalog colour); the rest shared.
  let skin = null, top = null;
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true; o.userData.keepGeo = true;
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if (CAST_HIDE_MATERIAL.test(o.material.name)) { o.visible = false; return; }
    if (CAST_SKIN.test(o.material.name)) { skin = skin || o.material.clone(); o.material = skin; }
    else if (o.material.name === info.top) { top = top || o.material.clone(); o.material = top; }
  });
  if (top && p.shM) { top.color.copy(p.shM.color); p.shM = top; p.sh0 = top.color.clone(); }
  if (skin) { p.skM = skin; p.sk0 = skin.color.clone(); }
  if (opts.role === 'elder' && p.fem) body.traverse(o => { if (o.isMesh && /^Hair/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.set(0x98938b).convertSRGBToLinear(); } });

  // 5. The v3 face on the model's head: measured from the head's skin, mapped from the rig's head design
  //    (chin -.12, crown .251, half width .146, face front .113 in head-bone units).
  const headBox = castHeadBox(p, body, G.head);
  if (headBox) {
    const toHead = v => p.hd.worldToLocal(p.g.localToWorld(v.clone())), lo = toHead(headBox.min), hi = toHead(headBox.max);
    const ky = (hi.y - lo.y) / .371, kx = (hi.x - lo.x) / .292, k = (kx + ky) / 2;
    p.fc.scale.set(kx, ky, k); p.fc.position.set((lo.x + hi.x) / 2, lo.y + .12 * ky, hi.z - .113 * k);
  }
  // These heads are about two thirds of the rig's head, so the graphic eyes, brows and mouth are enlarged to stay
  // readable at film size (eye bones through their rest scale, which poseJointedRig restores every frame).
  for (const sd of ['L', 'R']) { const eb = p.g.getObjectByName('Eye' + sd); if (eb?.userData.restScale) { eb.userData.restScale = eb.userData.restScale.map(v => v * CAST_FACE_FEATURE); eb.scale.fromArray(eb.userData.restScale); } }
  for (const bg of p.v3?.brows || []) bg.scale.multiplyScalar(CAST_FACE_FEATURE);
  p.v3?.mouth?.scale.multiplyScalar(CAST_MOUTH);
  // the backpack straps were shaped around the rig's torso; the pack itself stays
  const pack = p.g.getObjectByName('Accessory_backpack'); if (pack) for (const c of pack.children) if (/^Strap/.test(c.name)) c.visible = false;

  // 6. Fingers curl with the rig's fingers (holding a phone, carrying, pointing). Curl axis at rest: across the palm,
  //    so fingertips (pointing down) move toward the palm side of the body.
  const fingers = [];
  for (let i = 0; i < 2; i++) {
    const sd = sides[i], hx = at(G.arms[i].hand).x, axisChar = V(0, 0, hx < 0 ? 1 : -1);
    const chains = [['Index', 0], ['Middle', 1], ['Ring', 2], ['Pinky', 3], ['Fingers', 1], ['Thumb', -1]];
    for (const [name, src] of chains) {
      const segs = [1, 2, 3].map(n => bone(name + n + sd)).filter(Boolean); if (name === 'Fingers' && bone('Fingers' + sd)) segs.push(bone('Fingers' + sd));
      if (!segs.length) continue;
      const P = src >= 0 ? p.g.getObjectByName('Finger' + (i ? 'R' : 'L') + src) : null;
      fingers.push({ side: i, P, thumb: src < 0, segs: segs.map(b => ({ b, rest: b.quaternion.clone(), axis: axisChar.clone().applyQuaternion(castLocalQuat(p, b).invert()).normalize() })) });
    }
  }
  p.cast = { id, body, pairs, feet, fingers };
  CAST.people.add(p);
  driveCastBody(p);
  return p;
}

// One component of a vertex attribute as a float. Attributes may be interleaved, and normals and weights are quantized
// (KHR_mesh_quantization): in r128 BufferAttribute getters return the raw integers of normalized attributes.
function castAttr(a, i, c) {
  const t = a.isInterleavedBufferAttribute ? a.data.array : a.array, v = a.isInterleavedBufferAttribute ? t[i * a.data.stride + a.offset + c] : t[i * a.itemSize + c];
  if (!a.normalized) return v;
  return t instanceof Int8Array ? Math.max(v / 127, -1) : t instanceof Int16Array ? Math.max(v / 32767, -1) : t instanceof Uint8Array ? v / 255 : t instanceof Uint16Array ? v / 65535 : v;
}
// The model's head skin (vertices mostly weighted to the Head bone, skin material) in the person's frame, at rest.
// Same sum as SkinnedMesh.boneTransform, with dequantized positions and weights.
function castHeadBox(p, body, head) {
  const box = new THREE.Box3(), base = castV(), out = castV(), part = castV(), m = new THREE.Matrix4(); let any = false;
  body.updateMatrixWorld(true);
  body.traverse(o => {
    if (!o.isSkinnedMesh || !CAST_SKIN.test(o.material.name)) return;
    const hi = o.skeleton.bones.indexOf(head); if (hi < 0) return;
    const g = o.geometry.attributes, n = g.position.count;
    for (let i = 0; i < n; i++) {
      let w = 0; for (let c = 0; c < 4; c++) if (castAttr(g.skinIndex, i, c) === hi) w += castAttr(g.skinWeight, i, c);
      if (w < .6) continue;
      base.set(castAttr(g.position, i, 0), castAttr(g.position, i, 1), castAttr(g.position, i, 2)).applyMatrix4(o.bindMatrix); out.set(0, 0, 0);
      for (let c = 0; c < 4; c++) { const wt = castAttr(g.skinWeight, i, c); if (!wt) continue; const b = castAttr(g.skinIndex, i, c); m.multiplyMatrices(o.skeleton.bones[b].matrixWorld, o.skeleton.boneInverses[b]); out.addScaledVector(part.copy(base).applyMatrix4(m), wt); }
      out.applyMatrix4(o.bindMatrixInverse); o.localToWorld(out); box.expandByPoint(p.g.worldToLocal(out)); any = true;
    }
  });
  return any ? box : null;
}

// Copies the rig's current pose onto the glTF skeleton (rotations in the person's frame, the pelvis position too).
function driveCastBody(p) {
  const c = p.cast; if (!c) return;
  const inv = p.g.getWorldQuaternion(castQ()).invert(), qP = castQ(), qT = castQ(), qParent = castQ(), w = castV();
  for (const pr of c.pairs) {
    qP.copy(inv).multiply(pr.P.getWorldQuaternion(qT));
    qT.copy(qP).multiply(pr.qP0inv).multiply(pr.alignG0);
    qParent.copy(inv).multiply(pr.G.parent.getWorldQuaternion(castQ()));
    pr.G.quaternion.copy(qParent.invert().multiply(qT));
    if (pr.position) pr.G.position.copy(pr.G.parent.worldToLocal(pr.P.getWorldPosition(w)));
    pr.G.updateMatrixWorld(true);
  }
  for (const f of c.feet) {
    const delta = castQ().copy(inv).multiply(f.P.getWorldQuaternion(castQ())).multiply(f.qP0inv);
    const ankle = f.tip ? p.g.worldToLocal(f.tip.getWorldPosition(castV())) : castLocalPos(p, f.P);
    const pos = ankle.add(f.offset.clone().applyQuaternion(delta)), rot = delta.multiply(f.qG0);
    f.G.position.copy(f.G.parent.worldToLocal(p.g.localToWorld(pos)));
    f.G.quaternion.copy(castQ().copy(inv).multiply(f.G.parent.getWorldQuaternion(castQ())).invert().multiply(rot));
    f.G.updateMatrixWorld(true);
  }
  // Rig fingers rest at .13 and bend either way for grips (phone -.95, pointing block 1.25): the size of the bend
  // becomes the curl, spread over the segments. The thumb follows the hand's average grip at half strength.
  const grip = [0, 0];
  for (const f of c.fingers) {
    const curl = f.P ? .18 + Math.min(1.5, Math.abs(f.P.rotation.x - .13) * 1.25) : null;
    if (curl !== null) grip[f.side] = Math.max(grip[f.side], curl);
    const k = f.thumb ? .5 * grip[f.side] : curl, per = k / f.segs.length;
    for (const s of f.segs) s.b.quaternion.copy(s.rest).multiply(castQ().setFromAxisAngle(s.axis, per));
  }
}

// A person is no longer in any scene (story rebuilt): free its skeletons' bone textures and its private materials. Geometry is
// shared with the loaded model and stays.
function releaseCastBody(p) {
  const done = new Set();
  p.cast?.body.traverse(o => {
    if (o.isSkinnedMesh && !done.has(o.skeleton)) { done.add(o.skeleton); o.skeleton.dispose(); }
    if (o.isMesh && !done.has(o.material) && [p.skM, p.shM].includes(o.material)) { done.add(o.material); o.material.dispose(); }
  });
}

// Named step of renderFilm and the Asset studio render: every visible cast person takes its final pose.
function syncCastBodies() {
  for (const p of CAST.people) {
    // a rebuilt story detaches the whole old world group, so test for a scene at the top, not for a parent
    let top = p.g, shown = true; for (let x = p.g; x; x = x.parent) { top = x; if (!x.visible) shown = false; }
    if (!top.isScene) { CAST.people.delete(p); releaseCastBody(p); continue; }
    if (shown) driveCastBody(p);
  }
}
