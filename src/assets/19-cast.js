// People cast: Characters PSX 1.2 (elbolilloduro) rebuilt in Blender (tools/blender/build_psx_people.py) and served from Vercel's static CDN
// through public/assets/manifest.json, loaded on demand (only the people a story uses; castLoadMissing). Each model keeps
// its painted face and plays authored clips (Quaternius Universal Animation Library and pack clips, retargeted onto the
// Mixamo rig): walk and run advance with the distance walked, so feet plant instead of gliding.
// buildToyRig still makes the jointed rig the engine's poses, IK and camera read; attachCastBody fits its
// joints to the model, hides it and moves accessories and props onto the model's own bones. poseCastBody (a named step
// at the end of poseJointedRig) records what each person is doing; syncCastBodies (a named step of renderFilm and the
// Asset studio render) picks and crossfades the clips and sets the face just before drawing. Everything is a function
// of the simulation clock (stepCount), so seekFilm and exports stay repeatable. Without the assets, people keep their
// procedural bodies.
const CAST = { ready: false, manifest: null, src: new Map(), clips: {}, modelClips: new Map(), info: new Map(), people: new Set(), loading: new Map(), missing: new Set() };
// Children are made from the adult models: the person's child scale plus a bigger head.
const CAST_CHILD_HEAD = 1.28;
const CAST_SKIN = /^Skin/, CAST_NOT_CLOTH = /^(Skin|Skin_Darker|Hair|HairBase|Hair_.*|Eye|Eyes|Eyebrows|Moustache|Gold|Earrings|Visor|Mouth|Brown|Black)$/;
const CAST_FADE = .25;
// clips played once and held on their last frame
const CAST_ONCE = new Set(['fall', 'sleep', 'sit_enter', 'sit_exit', 'jump_start', 'jump_land', 'hit', 'hit_head', 'pickup', 'roll', 'punch', 'punch_cross', 'death', 'shoot', 'reload', 'sword']);

async function loadCast() {
  try {
    const m = await (await fetch('assets/manifest.json')).json(), P = m.people;
    definePsxCatalog(m.psx); rebuildCatalog();
    // castProgress (20-ui-shell.js) fills the film's loading bar as each file arrives. Only the clip libraries load
    // here; each person's model loads when a story first uses it (castLoadModel), about 100 KB each.
    const total = Object.keys(P.families).length; let done = 0;
    const loader = new THREE.GLTFLoader(), load = u => new Promise((ok, fail) => loader.load('assets/' + u, g => { castProgress(++done, total); ok(g); }, undefined, fail));
    await Promise.all(Object.entries(P.families).map(async ([f, d]) => { CAST.clips[f] = (await load(d.anim)).animations; }));
    CAST.manifest = m; CAST.ready = true;
    // each family's reference model too: castClipsFor fits the clips to every model by comparing it with the reference
    await Promise.all(Object.values(P.families).map(d => castLoadModel(d.reference)));
  } catch (e) { CAST.src.clear(); CAST.ready = false; console.warn('Cast assets did not load; people keep their procedural bodies.', e); }
}

// A role's pool for the person's sex (the other sex's pool when it has none), else the everyday crowd pool.
function castModelFor({ role = 'casual', variant = 0 }, feminine) {
  const P = CAST.manifest.people, r = P.roles[role] || {}, sex = feminine ? 'f' : 'm';
  const list = r[sex]?.length ? r[sex] : r[feminine ? 'm' : 'f']?.length ? r[feminine ? 'm' : 'f'] : feminine ? P.women : P.men;
  return list[variant % list.length];
}

// On-demand models. attachCastBody records a model that is not loaded yet (the person keeps the procedural body
// meanwhile); seekFilm then loads the missing ones and rebuilds the scene once, so every frame, playback or export,
// is drawn as if all models had been there from the start. Loaded models are made matte: these are painted textures,
// and the earlier models' metalness (0.4) made people look like plastic in the sun.
function castLoadModel(id) {
  if (CAST.src.has(id)) return Promise.resolve(CAST.src.get(id));
  if (CAST.loading.has(id)) return CAST.loading.get(id);
  const d = CAST.manifest.people.models[id];
  const p = new Promise(ok => new THREE.GLTFLoader().load('assets/' + d.file, g => {
    g.scene.traverse(o => { if (o.isMesh) for (const mt of [].concat(o.material)) castMatte(mt); });
    CAST.src.set(id, g.scene); castInfo(id); castMergeModel(id); CAST.loading.delete(id); ok(g.scene);
  }, undefined, e => { console.warn('Person model ' + id + ' did not load', e); CAST.loading.delete(id); ok(null); }));
  CAST.loading.set(id, p); return p;
}
function castMatte(m) { if (m.isMeshStandardMaterial) { m.metalness = 0; m.roughness = 1; m.envMapIntensity = 0; } }
// Loads every model the last scene build asked for; true if any was missing (the scene must be built again). The list
// is cleared only once they are in, so a seek that starts while 'Check story' is still downloading also waits.
async function castLoadMissing() {
  if (!CAST.missing.size) return false;
  const ids = [...CAST.missing];
  await Promise.all(ids.map(castLoadModel));
  for (const id of ids) CAST.missing.delete(id);
  return true;
}
// After a build outside a seek (Check story): fetch the missing people, then redraw at the same time with them.
function castFetchAfterBuild() {
  if (!CAST.missing.size) return;
  Promise.all([...CAST.missing].map(castLoadModel)).then(() => { if (sceneReady && !seeking && !recording && CAST.missing.size) seekFilm(T); });
}

// Per source model, measured once: which material is the top garment (it takes the person's palette colour).
function castInfo(id) {
  let info = CAST.info.get(id); if (info) return info;
  const src = CAST.src.get(id); src.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(src), h = box.max.y - box.min.y, mats = new Map();
  src.traverse(o => {
    if (!o.isMesh || CAST_NOT_CLOTH.test(o.material.name)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const c = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).getCenter(V()), rel = (c.y - box.min.y) / h;
    if (rel > .45 && rel < .85) mats.set(o.material.name, (mats.get(o.material.name) || 0) + o.geometry.attributes.position.count);
  });
  info = { h, top: [...mats].sort((a, b) => b[1] - a[1])[0]?.[0] || null }; CAST.info.set(id, info); return info;
}

// Each model arrives as one skinned mesh per material (shirt, pants, shoes, hair, eyes...), so a person cost 6-18 draw
// calls. Merged once per model at load: the pieces whose material a person changes stay apart (skin: zombie tint; top
// garment: palette colour; mouth: drawn with a depth offset; hair on women's models: grey for elders), and everything
// else becomes one mesh whose material colours are stored per vertex under one shared material. The materials are
// plain colours (no textures), so the picture is unchanged; pieces without the face morphs get zero morph offsets so
// a role never splits in two. A person now costs 3-5 draw calls.
function castMergeModel(id) {
  const src = CAST.src.get(id), info = castInfo(id), women = new Set(CAST.manifest.people.women);
  const role = m => CAST_SKIN.test(m.name) ? 'skin' : m.name === info.top ? 'top' : m.name === 'Mouth' ? 'mouth' : women.has(id) && /^Hair/.test(m.name) ? 'hair' : 'other';
  const groups = new Map(); src.updateMatrixWorld(true);
  src.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const key = [role(o.material), o.material.roughness.toFixed(2), o.material.metalness.toFixed(2), o.matrixWorld.elements.map(v => v.toFixed(4)).join(), o.bindMatrix.elements.map(v => v.toFixed(4)).join()].join('|');
    (groups.get(key) || groups.set(key, []).get(key)).push(o);
  });
  // values of a (possibly quantized, normalized) attribute as floats
  const unit = a => !a.normalized ? 1 : ({ Int8Array: 127, Uint8Array: 255, Int16Array: 32767, Uint16Array: 65535 })[a.array.constructor.name] || 1;
  const read = (a, i, out) => { const k = unit(a); for (let c = 0; c < a.itemSize; c++) out[c] = Math.max(-1, a.getComponent ? a.getComponent(i, c) / k : [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)][c] / k); return out; };
  for (const [key, list] of groups) {
    if (list.length < 2 && !key.startsWith('other')) continue;
    const first = list[0], merged = new THREE.BufferGeometry(), total = list.reduce((n, o) => n + o.geometry.attributes.position.count, 0);
    // morph target names live in the mesh's dictionary (GLTFLoader leaves the attributes unnamed)
    const morphed = list.find(o => o.geometry.morphAttributes.position && o.morphTargetDictionary), targets = morphed?.geometry.morphAttributes;
    const names = morphed ? Object.entries(morphed.morphTargetDictionary).sort((a, b) => a[1] - b[1]).map(e => e[0]) : [];
    const withNormals = !!targets?.normal, colour = key.startsWith('other') || list.some(o => o.geometry.attributes.color);
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), idx = new Uint16Array(total * 4), wgt = new Float32Array(total * 4), col = colour ? new Float32Array(total * 3) : null;
    const mp = names.map(() => new Float32Array(total * 3)), mn = withNormals ? names.map(() => new Float32Array(total * 3)) : [], index = [], tmp = [0, 0, 0, 0];
    let base = 0;
    for (const o of list) {
      const g = o.geometry, A = g.attributes, n = A.position.count, c = o.material.color, own = key.startsWith('other');
      for (let i = 0; i < n; i++) {
        const v = base + i;
        read(A.position, i, tmp); pos.set(tmp.slice(0, 3), v * 3);
        read(A.normal, i, tmp); nor.set(tmp.slice(0, 3), v * 3);
        for (let k = 0; k < 4; k++) idx[v * 4 + k] = A.skinIndex.getComponent ? A.skinIndex.getComponent(i, k) : [A.skinIndex.getX(i), A.skinIndex.getY(i), A.skinIndex.getZ(i), A.skinIndex.getW(i)][k];
        read(A.skinWeight, i, tmp); wgt.set(tmp, v * 4);
        if (col) { const vc = A.color ? read(A.color, i, [0, 0, 0, 0]) : [1, 1, 1]; col.set(own ? [c.r * vc[0], c.g * vc[1], c.b * vc[2]] : vc.slice(0, 3), v * 3); }
        names.forEach((name, t) => {
          const j = o.morphTargetDictionary?.[name], P = j !== undefined ? g.morphAttributes.position?.[j] : null, N = j !== undefined ? g.morphAttributes.normal?.[j] : null;
          if (P) { read(P, i, tmp); mp[t].set(tmp.slice(0, 3), v * 3); }
          if (N && withNormals) { read(N, i, tmp); mn[t].set(tmp.slice(0, 3), v * 3); }
        });
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) index.push(base + g.index.getX(i)); else for (let i = 0; i < n; i++) index.push(base + i);
      base += n;
    }
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    merged.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4)); merged.setAttribute('skinWeight', new THREE.BufferAttribute(wgt, 4));
    if (col) merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
    merged.setIndex(total > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
    if (names.length) {
      merged.morphAttributes.position = mp.map((a, t) => Object.assign(new THREE.BufferAttribute(a, 3), { name: names[t] }));
      if (withNormals) merged.morphAttributes.normal = mn.map((a, t) => Object.assign(new THREE.BufferAttribute(a, 3), { name: names[t] }));
      merged.morphTargetsRelative = true;
    }
    merged.computeBoundingBox(); merged.computeBoundingSphere();
    let mat = (list.find(o => o.geometry.morphAttributes.position) || first).material;
    if (key.startsWith('other')) mat = new THREE.MeshStandardMaterial({ name: 'CastMerged', color: 0xffffff, vertexColors: true, roughness: first.material.roughness, metalness: first.material.metalness });
    else if (col && !mat.vertexColors) { mat = mat.clone(); mat.vertexColors = true; }
    if (names.length && !mat.morphTargets) { mat = mat === first.material || list.some(o => o.material === mat) ? mat.clone() : mat; mat.morphTargets = true; mat.morphNormals = withNormals; }
    mat.skinning = true;
    const mesh = new THREE.SkinnedMesh(merged, mat); mesh.name = first.name; mesh.position.copy(first.position); mesh.quaternion.copy(first.quaternion); mesh.scale.copy(first.scale);
    first.parent.add(mesh); mesh.bind(first.skeleton, first.bindMatrix);
    for (const o of list) { o.parent.remove(o); o.geometry.dispose(); }
  }
}

// Rest heights of a loaded model: pelvis bone (local position and height) and the lower foot bone.
function castRest(scene) {
  scene.updateMatrixWorld(true); const b = scene.getObjectByName('Body'), y = n => scene.getObjectByName(n)?.getWorldPosition(V()).y ?? 0;
  return { local: b.position.clone(), body: b.getWorldPosition(V()).y, foot: Math.min(y('FootL'), y('FootR')) };
}
// The family's clips for one model. The clips were baked on the family's reference model, so:
// - only rotations and the pelvis position play: every other bone keeps this model's own joint offsets (the baked
//   offsets would pull this model's joints to the reference's proportions and detach feet from shins);
// - a bone whose rest orientation differs from the reference's (some models roll their legs 90° differently) gets its
//   rotation re-expressed so the bone deforms its mesh the same way as on the reference: q' = Kparent^-1 q Kbone,
//   K = reference rest world rotation^-1 * this model's;
// - the pelvis keeps this model's rest position and moves by its leg length (pelvis to foot) relative to the
//   reference's, so stance feet land at the model's own sole height.
function castClipsFor(id) {
  let clips = CAST.modelClips.get(id); if (clips) return clips;
  const d = CAST.manifest.people.models[id], ref = CAST.manifest.people.families[d.family].reference;
  const ms = CAST.src.get(id), rs = CAST.src.get(ref), m = castRest(ms), r = castRest(rs), k = (m.body - m.foot) / (r.body - r.foot);
  const K = new Map(), wq = o => o.getWorldQuaternion(new THREE.Quaternion());
  const rest = name => {  // [K of the bone, K of its parent] (null when both are identity)
    if (K.has(name)) return K.get(name);
    const a = ms.getObjectByName(name), b = rs.getObjectByName(name); let v = null;
    if (a && b && id !== ref) {
      const kb = wq(b).invert().multiply(wq(a)), kp = a.parent && b.parent ? wq(b.parent).invert().multiply(wq(a.parent)) : new THREE.Quaternion();
      if (1 - Math.abs(kb.w) > 1e-5 || 1 - Math.abs(kp.w) > 1e-5) v = [kb, kp.invert()];
    }
    K.set(name, v); return v;
  };
  clips = CAST.clips[d.family].map(c => {
    const tracks = [];
    for (const src of c.tracks) {
      const [bone, prop] = [src.name.slice(0, src.name.lastIndexOf('.')), src.name.slice(src.name.lastIndexOf('.') + 1)];
      if (prop === 'scale' || (prop === 'position' && bone !== 'Body')) continue;
      const kk = rest(bone);
      if (prop === 'position') {
        if (id === ref) { tracks.push(src); continue; }
        const tr = src.clone(), v = new THREE.Vector3(); tr.values = src.values.slice();
        for (let i = 0; i < tr.values.length; i += 3) {
          v.fromArray(tr.values, i).sub(r.local).multiplyScalar(k); if (kk) v.applyQuaternion(kk[1]);
          v.add(m.local).toArray(tr.values, i);
        }
        tracks.push(tr);
      } else if (prop === 'quaternion' && kk) {
        const tr = src.clone(), q = new THREE.Quaternion(); tr.values = src.values.slice();
        for (let i = 0; i < tr.values.length; i += 4) q.fromArray(tr.values, i).premultiply(kk[1]).multiply(kk[0]).toArray(tr.values, i);
        tracks.push(tr);
      } else tracks.push(src);
    }
    return new THREE.AnimationClip(c.name, c.duration, tracks);
  });
  CAST.modelClips.set(id, clips); return clips;
}

const castV = () => new THREE.Vector3();
function castLocalPos(p, o, out = castV()) { return p.g.worldToLocal(o.getWorldPosition(out)); }

function attachCastBody(p, opts = {}) {
  const id = castModelFor(opts, p.fem), src = CAST.src.get(id); if (!src) { CAST.missing.add(id); return p; }
  const info = castInfo(id), body = THREE.SkeletonUtils.clone(src);
  body.name = 'Cast body ' + id; body.userData.castId = id; p.g.add(body);
  // no shadow-map shadows: at the sun map's ~30 cm texels a body only smudged the ground at its feet, and its skinned
  // meshes were a third of the shadow pass (pp keeps buildBaseWorld from turning them back on)
  body.traverse(o => { if (o.isMesh) { o.castShadow = false; o.userData.pp = true; } });
  // GLTFLoader and SkeletonUtils.clone give every skinned mesh its own Skeleton (and bone texture, updated each frame).
  // A body's meshes use the same bones, so they share one skeleton per distinct bind.
  const shared = [];
  body.traverse(o => {
    if (!o.isSkinnedMesh) return; const sk = o.skeleton;
    const same = shared.find(s => s.bones.length === sk.bones.length && s.bones.every((b, i) => b === sk.bones[i]) && s.boneInverses.every((m, i) => m.equals(sk.boneInverses[i])));
    if (same) o.bind(same, o.bindMatrix); else shared.push(sk);
  });
  const bone = n => body.getObjectByName(n);
  const G = { body: bone('Body'), hips: bone('Hips'), torso: bone('Torso'), chest: bone('Chest') || bone('Torso'), head: bone('Head'), arms: [], legs: [] };
  body.updateMatrixWorld(true);
  // the rig's arms[0]/legs[0] are on -x; the models name sides from the character's view (".L" on +x)
  const sides = bone('UpperLegL') && castLocalPos(p, bone('UpperLegL')).x > 0 ? ['R', 'L'] : ['L', 'R'];
  for (const sd of sides) {
    G.arms.push({ up: bone('UpperArm' + sd), low: bone('LowerArm' + sd), hand: bone('Palm' + sd) || bone('Wrist' + sd) });
    G.legs.push({ up: bone('UpperLeg' + sd), low: bone('LowerLeg' + sd), foot: bone('Foot' + sd) });
  }
  if (!G.body || !G.hips || !G.torso || !G.head || G.arms.some(a => !a.up || !a.low || !a.hand) || G.legs.some(l => !l.up || !l.low || !l.foot)) { p.g.remove(body); return p; }
  const bigHead = opts.role === 'child' && CAST.manifest.people.models[id].family !== 'x';  // painted PSX bodies: smaller scale only, the bigger head floated on them
  if (bigHead) G.head.scale.setScalar(CAST_CHILD_HEAD);
  p.g.updateMatrixWorld(true);

  // 1. Fit the rig to the model: same joint positions and limb lengths, so the engine's IK, head point and props
  //    line up with the body (the rig is no longer drawn).
  const at = o => castLocalPos(p, o), len = (a, b) => at(a).distanceTo(at(b));
  const set = (b, v) => { b.position.copy(v); b.userData.restPosition = v.toArray(); };
  set(p.pv, at(G.body)); set(p.sp, at(G.hips).sub(at(G.body))); set(p.ch, at(G.torso).sub(at(G.hips))); set(p.hd, at(G.head).sub(at(G.torso)));
  for (let i = 0; i < 2; i++) {
    const a = p.arms[i], g = G.arms[i], l = p.legs[i], k = G.legs[i];
    set(a.sh, at(g.up).sub(at(G.torso))); set(a.el, V(0, -len(g.up, g.low), 0)); set(a.ha, V(0, -len(g.low, g.hand), 0));
    set(l.hp, at(k.up).sub(at(G.body))); set(l.kn, V(0, -len(k.up, k.low), 0)); set(l.ft, V(0, -len(k.low, k.foot), 0));
  }
  p.ankleY = (at(G.legs[0].foot).y + at(G.legs[1].foot).y) / 2; p.footX = (Math.abs(at(G.legs[0].foot).x) + Math.abs(at(G.legs[1].foot).x)) / 2;
  for (const b of p.bones) { b.quaternion.fromArray(b.userData.restQuaternion); b.scale.fromArray(b.userData.restScale); }
  if (bigHead) { p.hd.userData.restScale = p.hd.userData.restScale.map(v => v * CAST_CHILD_HEAD); p.hd.scale.fromArray(p.hd.userData.restScale); }
  p.g.updateMatrixWorld(true);

  // 2. Accessories, held props and the apron move onto the model's bones (same place at rest).
  const onto = new Map([[p.hd, G.head], [p.fc, G.head], [p.ch, G.chest], [p.sp, G.hips], [p.pv, G.body]]);
  for (let i = 0; i < 2; i++) { onto.set(p.arms[i].ha, G.arms[i].hand); onto.set(p.arms[i].el, G.arms[i].low); onto.set(p.arms[i].sh, G.arms[i].up); }
  const movable = o => /^(Accessory_|Cloth apron|Apron|HeldPhone|HeldParcel)/.test(o.name);
  for (const [from, to] of onto) for (const c of [...from.children]) if (movable(c)) to.attach(c);
  const um = p.g.getObjectByName('Accessory_umbrella'); if (um) G.arms[1].hand.attach(um);
  // glasses and masks were placed for the rig's head: move them onto this model's eyes and mouth
  const anchors = castFaceAnchors(body), fwd = V(0, 0, 1).applyQuaternion(p.g.getWorldQuaternion(new THREE.Quaternion()));
  for (const [name, anchor, up] of [['Accessory_glasses', anchors.eye, 0], ['Accessory_mask', anchors.mouth || anchors.eye, anchors.mouth ? .012 : -.05]]) {
    const acc = p.g.getObjectByName(name); if (!acc || !anchor) continue;
    const box = new THREE.Box3().setFromObject(acc), now = box.getCenter(V()), want = anchor.clone().add(V(0, up, 0)).addScaledVector(fwd, .012);
    acc.position.add(acc.parent.worldToLocal(want.clone()).sub(acc.parent.worldToLocal(now.clone())));
  }
  const pack = p.g.getObjectByName('Accessory_backpack'); if (pack) for (const c of pack.children) if (/^Strap/.test(c.name)) c.visible = false;
  // painted models come dressed (uniforms, caps, helmets, masks are in their texture): the rig's worn accessories stay hidden
  // no accessories on painted models (owner's call, 2026-10-22): backpacks, bags, umbrellas, caps, helmets, glasses,
  // masks, vests and aprons all stay hidden; the phone and parcel that the phone and carry actions hold remain
  if (CAST.manifest.people.models[id].family === 'x') p.g.traverse(o => { if (/^(Accessory_|Cloth apron|Apron)/.test(o.name)) { o.visible = false; o.userData.castHidden = true; } });

  // 3. Hide the rig's body and its face (the model's own face is used); keep accessories, props, apron, shadow.
  const keepName = /^(Accessory_|Cloth apron|Apron|Contact shadow|HeldPhone|HeldParcel|Phone|Lit phone|Screen message|Parcel|Tote|Backpack|Cap|Brim|Helmet|Mask|Vest|Bridge|Handle|Canopy)/;
  const kept = o => { for (let x = o; x && x !== p.g; x = x.parent) { if (x === body) return true; if (keepName.test(x.name)) return true; } return false; };
  const refs = new Set(); for (const v of Object.values(p)) for (const x of [].concat(v || [])) if (x && x.isObject3D) refs.add(x);
  const drop = []; p.g.traverse(o => { if (o.isMesh && !kept(o)) drop.push(o); });
  for (const o of drop) { o.visible = false; o.userData.castHidden = true; if (!refs.has(o) && !o.isBone) o.parent?.remove(o); }
  p.fc.visible = false; p.fc.userData.castHidden = true;
  // the rig's flat contact-shadow disc: the body casts real shadows (and the disc tipped over with falls)
  const disc = p.g.getObjectByName('Contact shadow'); if (disc) disc.visible = false;

  // 4. Materials: skin and top garment private to this person (zombie tint, catalog colour); the rest shared.
  let skin = null, top = null; const morphs = [];
  body.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = o.material.name !== 'Mouth'; o.userData.keepGeo = true;
    if (o.morphTargetDictionary) morphs.push(o);
    // a painted (textured) body has its skin and clothes in one picture: it becomes the private skin material (the
    // zombie tint greys and greens it) and never takes a palette colour
    if (CAST_SKIN.test(o.material.name) || o.material.map) { skin = skin || o.material.clone(); o.material = skin; }
    else if (o.material.name === info.top) { top = top || o.material.clone(); o.material = top; }
    if (o.material.name === 'Mouth') { o.material = o.material.clone(); o.material.polygonOffset = true; o.material.polygonOffsetFactor = -4; o.material.polygonOffsetUnits = -60; }
  });
  if (top && p.shM) { top.color.copy(p.shM.color); p.shM = top; p.sh0 = top.color.clone(); }
  if (skin) { p.skM = skin; p.sk0 = skin.color.clone(); }
  if (opts.role === 'elder' && p.fem) body.traverse(o => { if (o.isMesh && /^Hair/.test(o.material.name)) { o.material = o.material.clone(); o.material.color.set(0x98938b).convertSRGBToLinear(); } });

  // 5. Clips.
  const mixer = new THREE.AnimationMixer(body), actions = {};
  for (const c of castClipsFor(id)) { const a = mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); actions[c.name] = a; }
  // ground points: the back of each heel and the tip of each toe on the sole (measured by the Blender build around the
  // ankle joint), so neither the heel nor the rolling toe goes through the floor
  const feet = [G.legs[0].foot, G.legs[1].foot], fm = CAST.manifest.people.models[id].feet || { heel: .05, toe: .17 }, ground = [];
  for (const f of feet) {
    const at0 = p.g.worldToLocal(f.getWorldPosition(V()));
    for (const [name, dz] of [['Heel', -fm.heel], ['Toe', fm.toe]]) {
      const o = new THREE.Object3D(); o.name = name; p.g.add(o); o.position.set(at0.x, .012, at0.z + dz); o.updateMatrixWorld(true); f.attach(o);
      ground.push({ o, rest: .012 });
    }
  }
  // height as drawn (the person's scale: child .74, elder .96), for stride lengths
  // body points for lying clips (fall, sleep, roll): none may go below the floor
  const lying = [G.head, G.hips, G.chest, G.body, G.arms[0].hand, G.arms[1].hand, G.arms[0].low, G.arms[1].low, feet[0], feet[1], G.legs[0].low, G.legs[1].low];
  p.cast = { id, body, mixer, actions, morphs, ground, lying, head: G.head, family: CAST.manifest.people.models[id].family, height: CAST.manifest.people.models[id].height * (p.sc || 1) };
  p.castAnim = { tick: -1, pending: null, clip: 'idle', time: 0, since: 0, prev: null, expression: 'neutral', talk: false, t: 0 };
  CAST.people.add(p);
  castApply(p);
  return p;
}

// World centres of the model's eyes (the vertices its blink morph moves) and of its mouth mesh, at rest.
function castFaceAnchors(body) {
  const eye = V(), mouth = V(), v = V(); let ne = 0, nm = 0;
  body.updateMatrixWorld(true);
  body.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    if (o.material.name === 'Mouth') { for (let i = 0; i < pos.count; i++) { mouth.add(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)); nm++; } return; }
    const k = o.morphTargetDictionary?.blink, d = k !== undefined ? o.geometry.morphAttributes.position?.[k] : null; if (!d) return;
    for (let i = 0; i < pos.count; i++) if (Math.abs(d.getY(i)) > 1e-5) { eye.add(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)); ne++; }
  });
  return { eye: ne ? eye.divideScalar(ne) : null, mouth: nm ? mouth.divideScalar(nm) : null };
}

// engine pose state -> clip
function castClipFor(p, state, speed) {
  const has = n => p.cast.actions[n] ? n : null;
  switch (state) {
    case 'walk': return 'walk';
    case 'run': return speed > 4.6 ? has('sprint') || 'run' : 'run';
    case 'zombie': return has('zombie') || 'walk';
    case 'carry': return speed > .1 ? has('carry') || 'walk' : has('carry_idle') || 'idle';
    case 'climb': return has('crouch_walk') || 'walk';
    case 'swim': return speed > .1 ? has('swim') || 'walk' : has('swim_idle') || has('swim') || 'idle';
    case 'crouch': return has('crouch') || 'idle';
    case 'jog': return has('jog') || 'run';
    case 'death': return has('death') || 'fall';
    default: return has(state) || 'idle';
  }
}

// Named step at the end of poseJointedRig: poses the body for this simulation tick (clips are evaluated here, inside
// step(), so the camera, balloons and safe-zone checks see where the model's head really is). Catalog actors with a
// cast body skip the catalog's own two-pose blend (updateCatalogInstances) and crossfade here instead. A second call
// with 'talk' in the same tick is the talking layer of 13-talking.js: it adds lip-sync and keeps the current clip.
function poseCastBody(p, state, t, expression, distance, speed) {
  const a = p.castAnim; if (!a) return;
  // the film's clock in a film; in Model studio (not in the film scene) the preview's own time, since stepCount stands
  // still there (otherwise one-shot clips never played and a 'talk' preview kept the previous clip)
  let top = p.g; while (top.parent) top = top.parent;
  const clock = typeof stepCount === 'number' && top === scene ? stepCount / 60 : t;
  if (state === 'talk' && a.tick === clock && a.clip !== 'talk') { a.talk = true; a.expression = expression || a.expression; castFace(p); return; }
  a.tick = clock; a.pending = { state, t, expression, distance, speed, clock };
  // the ambient crowd and extras are posed at render time when on screen (the camera never aims at them); the state
  // is still committed every tick, so the result is the same whether a frame is reached by playing or by seeking
  if (castDeferred(p)) { castCommit(p, a.pending); a.dirty = true; return; }
  castApply(p);
  // the rig's head follows the model's head (read by shotCam, talking balloons and checkSafeZoneSubjects)
  const h = p.cast.head.getWorldPosition(V()); p.hd.position.copy(p.hd.parent.worldToLocal(h)); p.hd.updateMatrixWorld(true);
}

// Ambient crowd (workshopCrowd) and engine extras other than the current hero: posed only when drawn.
function castDeferred(p) {
  if (p.castKind === undefined) p.castKind = typeof workshopCrowd !== 'undefined' && workshopCrowd.some(a => a.p === p) ? 'crowd' : typeof ppl !== 'undefined' && ppl.includes(p) ? 'ppl' : 'actor';
  if (p.castKind === 'crowd') return true;
  return p.castKind === 'ppl' && !(typeof curHero !== 'undefined' && p === curHero);
}

function castCommit(p, c) {
  const a = p.castAnim, P = CAST.manifest.people;
  if (c.clock < a.since - 1e-6) { a.prev = null; a.since = c.clock; }  // a seek restarted the clock
  // a person the crowd LOD skipped for a while was not playing its old clip on the previous tick: no fade from it
  const gap = c.clock - (a.last ?? -1), fresh = gap > 0 && gap < 1.5 / 60; a.last = c.clock;
  const clip = castClipFor(p, c.state, c.speed || 0), act = p.cast.actions[clip], dur = act ? act.getClip().duration : 1;
  if (clip !== a.clip) {
    a.prev = simulating && fresh && a.clip ? { clip: a.clip, time: a.time, at: c.clock } : null;
    a.clip = clip; a.since = c.clock;
  }
  const S = P.stride[p.cast.family], stride = S && S[clip];
  if (stride && c.distance != null) a.time = ((c.distance / (stride * p.cast.height / S.refHeight)) % 1) * dur;
  // engine people fall over and (as zombies) get back up: the fall clip follows the fall amount, so rising plays it back
  else if (clip === 'fall' && p.fall > 0) a.time = Math.min(1, p.fall) * (dur - 1e-3);
  else if (CAST_ONCE.has(clip)) a.time = Math.min(dur - 1e-3, Math.max(0, c.clock - a.since));
  else a.time = (c.t + (p.variant || 0) * .37) % dur;
  a.expression = c.expression || 'neutral'; a.talk = c.state === 'talk'; a.t = c.t;
  a.pending = null;
}

// Expression -> morph weights (blink, brow_up, brow_angry, brow_sad, open, wide, round, smile, frown).
const CAST_FACE = {
  neutral: {}, happy: { smile: 1, brow_up: .25 }, sad: { frown: .7, brow_sad: 1 }, angry: { frown: .6, brow_angry: 1 },
  fear: { brow_sad: .7, brow_up: .4, round: .35, open: .3 }, surprised: { brow_up: 1, round: .6, open: .4 }, determined: { brow_angry: .55, frown: .2 },
  relief: { smile: .55, brow_sad: .3 }, sleepy: { blink: .85, frown: .1 }, shock: { brow_up: 1, open: .6, round: .45 }, zombie: { brow_angry: .7, open: .75 },
};
function castFace(p) {
  const a = p.castAnim, w = { ...(CAST_FACE[a.expression] || CAST_FACE.neutral) }, t = Math.max(0, a.t);
  const ph = (t + (p.variant || 0) * .37) % 4.3; if (ph > 4.12) w.blink = Math.max(w.blink || 0, Math.sin((ph - 4.12) / .18 * Math.PI));
  if (a.expression === 'sleepy' || a.clip === 'sleep') w.blink = 1;
  if (a.talk) { const m = talkMouth3(t, p.talkSeed || p.variant || 0); w.open = Math.max(w.open || 0, m.o); w.round = Math.max(w.round || 0, m.r * m.o); if (m.w) w.wide = Math.max(w.wide || 0, Math.min(1, Math.max(0, (m.w - .06) / .025)) * m.o); w.smile = (w.smile || 0) * .5; }
  for (const o of p.cast.morphs) {
    const d = o.morphTargetDictionary, inf = o.morphTargetInfluences; inf.fill(0);
    for (const k in w) if (d[k] !== undefined) inf[d[k]] = w[k];
  }
}

// Sets the clip weights and times and the face for the current state.
function castApply(p) {
  const a = p.castAnim, c = p.cast; if (a.pending) castCommit(p, a.pending);
  const fade = a.prev ? Math.min(1, (a.tick - a.since) / CAST_FADE) : 1, k = fade * fade * (3 - 2 * fade);
  // only the current and the fading clip stay enabled, so the mixer evaluates two clips, not thirty
  for (const n in c.actions) { c.actions[n].enabled = false; c.actions[n].setEffectiveWeight(0); }
  const cur = c.actions[a.clip] || c.actions.idle; cur.enabled = true; cur.time = a.time; cur.setEffectiveWeight(k);
  if (a.prev && k < 1) {
    const pa = c.actions[a.prev.clip];
    if (pa) { pa.enabled = true; const dur = pa.getClip().duration; pa.time = CAST_ONCE.has(a.prev.clip) ? Math.min(dur - 1e-3, a.prev.time) : (a.prev.time + Math.max(0, a.tick - a.prev.at)) % dur; pa.setEffectiveWeight(1 - k); }
  } else a.prev = null;
  c.mixer.update(0);
  castGround(p);
  castFace(p);
}

// clips whose feet stand on the floor
const CAST_FLOAT = new Set(['sit', 'sit_talk', 'sit_enter', 'sit_exit', 'swim', 'swim_idle', 'jump', 'jump_start', 'jump_land', 'drive']);
// clips that end on the ground
const CAST_LIE = new Set(['fall', 'sleep', 'roll', 'death', 'dead']);
// Puts the lower foot on the floor (at its rest height) for grounded clips: no sinking or floating whatever the model.
// Uses the heel and toe points (getWorldPosition updates only each point's chain of parents, not the whole body).
function castGround(p) {
  const c = p.cast, a = p.castAnim; c.body.position.y = 0;
  if (CAST_LIE.has(a.clip)) {
    // lying: lift the body so its lowest joint keeps about half a limb's thickness above the floor
    let low = Infinity; const v = V(); for (const b of c.lying) low = Math.min(low, p.g.worldToLocal(b.getWorldPosition(v)).y);
    if (low < .06) c.body.position.y = .06 - low;
    return;
  }
  if (CAST_FLOAT.has(a.clip) || (a.prev && CAST_FLOAT.has(a.prev.clip))) return;
  let dy = Infinity; const v = V();
  for (const g of c.ground) dy = Math.min(dy, p.g.worldToLocal(g.o.getWorldPosition(v)).y - g.rest);
  c.body.position.y = -dy;
}

// cloneModel (Model studio, scene previews) copies a person: the copy gets its own mixer, actions and ground points on
// its own cloned body. Without this the copy kept the original's cast, so previews animated the original, off screen,
// while the visible copy stood still and only its rig moved.
function cloneCastBody(p, q, map) {
  const c = p.cast, body = c && map.get(c.body); if (!body) return;
  const mixer = new THREE.AnimationMixer(body), actions = {};
  for (const clip of castClipsFor(c.id)) { const a = mixer.clipAction(clip); a.play(); a.setEffectiveWeight(0); actions[clip.name] = a; }
  q.cast = { ...c, body, mixer, actions, head: map.get(c.head), morphs: c.morphs.map(m => map.get(m)).filter(Boolean),
    ground: c.ground.map(g => ({ o: map.get(g.o), rest: g.rest })).filter(g => g.o), lying: c.lying.map(b => map.get(b)).filter(Boolean) };
  q.castAnim = { ...p.castAnim, prev: null, pending: null, dirty: false, tick: undefined, last: undefined, since: 0 };
  q.castKind = 'actor'; CAST.people.add(q);
}

// A person is no longer in any scene (story rebuilt): free its skeleton's bone texture and its private materials.
// Geometry is shared with the loaded model and stays.
function releaseCastBody(p) {
  const done = new Set();
  p.cast?.mixer.stopAllAction();
  p.cast?.body.traverse(o => {
    if (o.isSkinnedMesh && !done.has(o.skeleton)) { done.add(o.skeleton); o.skeleton.dispose(); }
    if (o.isMesh && !done.has(o.material) && ([p.skM, p.shM].includes(o.material) || o.material.name === 'Mouth')) { done.add(o.material); o.material.dispose(); }
  });
}

// Named step of renderFilm and the Asset studio render: deferred people on screen take their pose, and people that left
// every scene are released (everyone else is posed in poseCastBody, inside step()).
const castFrustum = new THREE.Frustum(), castProj = new THREE.Matrix4(), castSphere = new THREE.Sphere(V(), 2.2);
function syncCastBodies() {
  camera.updateMatrixWorld(); castFrustum.setFromProjectionMatrix(castProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const p of CAST.people) {
    // a rebuilt story detaches the whole old world group, so test for a scene at the top, not for a parent
    let top = p.g, shown = true; for (let x = p.g; x; x = x.parent) { top = x; if (!x.visible) shown = false; }
    if (!top.isScene) { CAST.people.delete(p); releaseCastBody(p); continue; }
    if (!p.castAnim.dirty || !shown) continue;
    p.g.getWorldPosition(castSphere.center); castSphere.center.y += .9;
    if (top !== scene || castFrustum.intersectsSphere(castSphere)) { castApply(p); p.castAnim.dirty = false; }
  }
}
