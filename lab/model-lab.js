// Model Lab (Step 6): renders turntables of the vendor and the octopus in three directions under identical lights.
//   A = the current procedural models with quick fixes, B = a new procedural build from design/design-tokens.json,
//   C = downloaded models (public/models). Runs inside the studio page (it uses the engine's builders for A).
// Usage from a test tool: inject this file, then `await ModelLab.setup(tokens)`, `await ModelLab.render(name)`.
(() => {
  const LAB = (window.ModelLab = {});
  let R, scene, cam, tok, stage;
  const col = h => new THREE.Color(h).convertSRGBToLinear();
  const std = (hex, rough = .7, extra = {}) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: rough, metalness: 0, ...extra });

  LAB.setup = async tokens => {
    tok = tokens.target;
    const c = document.createElement('canvas'); c.width = 720; c.height = 960;
    R = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
    R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = tok.shading.lighting.exposure;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(col('#e3d7be'));
    scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(28, 720 / 960, .05, 100);
    const L = tok.shading.lighting, key = new THREE.DirectionalLight(col(L.keyColour), L.keyIntensity * 2.2);
    key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 }); key.shadow.bias = -.0004;
    const rimAz = (140 * Math.PI) / 180, rim = new THREE.DirectionalLight(col(L.rimColour), L.keyIntensity * 2.2 * .42);
    rim.position.set(Math.sin(rimAz) * 4, 3.5, Math.cos(rimAz) * -4);
    scene.add(key, rim, new THREE.HemisphereLight(col('#fff4e6'), col('#b9a98e'), .55 * 1.6));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64).rotateX(-Math.PI / 2), std('#ddc5a1', .9)); ground.receiveShadow = true; scene.add(ground);
  };

  // ---------- shared helpers for the B build ----------
  // A smooth tapered capsule along +Y: radius r0 at the base, r1 at the top, length len.
  function capsule(r0, r1, len, seg = 14) {
    const pts = [], n = 5;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
    for (let i = 1; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(Math.cos(a) * r1, len + Math.sin(a) * r1)); }
    return new THREE.LatheGeometry(pts, seg);
  }
  // A limb from point a to point b as a tapered capsule.
  function limb(group, a, b, r0, r1, mat) {
    const d = b.clone().sub(a), m = new THREE.Mesh(capsule(r0, r1, d.length()), mat);
    m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.castShadow = true; group.add(m); return m;
  }
  // A tapered tube along a curve (radius from r0 to r1), smooth normals: used for tentacles, brows and mouths.
  function taperTube(curve, r0, r1, steps = 64, radial = 14) {
    const frames = curve.computeFrenetFrames(steps, false), pos = [], idx = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, p = curve.getPointAt(u), r = r0 + (r1 - r0) * u, N = frames.normals[i], B = frames.binormals[i];
      for (let j = 0; j <= radial; j++) { const v = (j / radial) * Math.PI * 2; pos.push(p.x + r * (Math.cos(v) * N.x + Math.sin(v) * B.x), p.y + r * (Math.cos(v) * N.y + Math.sin(v) * B.y), p.z + r * (Math.cos(v) * N.z + Math.sin(v) * B.z)); }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // round the tip
    return g;
  }
  const ball = (group, r, p, mat, s = [1, 1, 1], seg = [16, 10]) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ...seg), mat); m.position.copy(p); m.scale.set(...s); m.castShadow = true; group.add(m); return m; };

  // Face from the style sheet, placed on an ellipsoid head of half-sizes hw, hh, hd centred at c.
  function face(g, c, hw, hh, hd, hairHex, opts = {}) {
    const H = hh * 2, W = hw * 2, F = tok.face, onHead = (x, y) => { const z = hd * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2 - (y / hh) ** 2)); return new THREE.Vector3(c.x + x, c.y + y, c.z + z); };
    const eyeH = F.eye.heightToHeadHeight * H * (opts.eyeScale || 1), eyeW = eyeH / F.eye.heightToWidth, ex = (F.eye.spacingToHeadWidth * W) / 2, ey = -hh + F.eye.centreFromChinToHeadHeight * H;
    const eyeMat = std(tok.palette.face.eye, .2), hi = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const s of [-1, 1]) {
      const p = onHead(s * ex, ey); const e = ball(g, 1, p, eyeMat, [eyeW / 2, eyeH / 2, eyeW * .28]); e.lookAt(p.clone().add(p.clone().sub(c).normalize()));
      const h1 = ball(g, eyeW * F.highlight.mainDiameterToEyeWidth / 2, p.clone().add(new THREE.Vector3(eyeW * .18, eyeH * .2, eyeW * .2)), hi, [1, 1, 1], [10, 8]);
      ball(g, eyeW * F.highlight.secondDiameterToEyeWidth / 2, p.clone().add(new THREE.Vector3(-eyeW * .12, -eyeH * .18, eyeW * .2)), hi, [1, 1, 1], [8, 6]); h1.castShadow = false;
      const by = ey + eyeH / 2 + F.brow.gapAboveEyeToEyeHeight * eyeH, bl = F.brow.lengthToEyeWidth * eyeW;
      const bT = F.brow.thicknessToEyeHeight * eyeH, brow = new THREE.CatmullRomCurve3([onHead(s * ex - bl / 2, by - bT * .3), onHead(s * ex, by + bT * .35), onHead(s * ex + bl / 2, by - bT * .15)].map(v => v.add(v.clone().sub(c).normalize().multiplyScalar(bT * .45))));
      const bMat = std(hairHex, .6); g.add(new THREE.Mesh(taperTube(brow, bT / 2, bT / 2.6, 12, 6), bMat)); ball(g, bT / 2, brow.getPointAt(0), bMat, [1, 1, 1], [8, 6]); ball(g, bT / 2.6, brow.getPointAt(1), bMat, [1, 1, 1], [8, 6]);
    }
    const sh = F.mouth.shapes[opts.mouth || 'happy'], my = -hh + F.mouth.centreFromChinToHeadHeight * H, mw = sh.widthToHeadWidth * W, lift = sh.cornerLift * H * .05;
    const mT = F.mouth.lineThicknessToHeadHeight * H * (opts.mouthScale || 1), mouth = new THREE.CatmullRomCurve3([onHead(-mw / 2, my + lift), onHead(0, my - lift * .4), onHead(mw / 2, my + lift)].map(v => v.add(v.clone().sub(c).normalize().multiplyScalar(mT * .3))));
    const mMat = std(opts.mouthHex || tok.palette.face.mouthInside, .5); g.add(new THREE.Mesh(taperTube(mouth, mT / 2, mT / 2, 16, 6), mMat)); for (const u of [0, 1]) ball(g, mT / 2, mouth.getPointAt(u), mMat, [1, 1, 1], [8, 6]);
    if (opts.blush !== false) for (const s of [-1, 1]) { const p = onHead(s * ex * 1.12, ey - eyeH * .9), b = new THREE.Mesh(new THREE.CircleGeometry(eyeW * .6, 20), std(tok.palette.face.blush, .7, { transparent: true, opacity: tok.face.blush.opacityMax, depthWrite: false })); b.position.copy(p.add(p.clone().sub(c).normalize().multiplyScalar(.004))); b.lookAt(b.position.clone().add(b.position.clone().sub(c))); g.add(b); }
  }

  // ---------- B: vendor ----------
  function vendorB() {
    const P = tok.proportions.adult, Hh = P.height * P.headToHeight, g = new THREE.Group();
    const skin = std(tok.palette.skin.caramel, .6), top = std(tok.palette.tops.tomato, .8), apron = std(tok.palette.tops.cloud, .8), pants = std(tok.palette.bottoms.cocoa, .8),
      shoe = std('#f1ebe0', .6), hairHex = tok.palette.hair.darkBrown, hair = std(hairHex, .6);
    const legLen = P.height * P.legToHeight, hipY = legLen, torsoTop = P.height - Hh - .04, hw = Hh * .46, hh = Hh / 2, hd = Hh * .44, headC = new THREE.Vector3(0, P.height - hh, 0);
    const thighR = P.height * tok.proportions.limbs.thighRadiusToHeight, ankleR = thighR * .6, armR = P.height * tok.proportions.limbs.upperArmRadiusToHeight, shoulderW = hw * 2 * P.shoulderToHeadWidth / 2;
    const tH = torsoTop - hipY + .04;
    // torso: one smooth lathe from the hips to the neck, shoulders rounded into it (no shelf)
    const sW = Math.min(shoulderW * .72, .2), prof = [[0, 0], [.165, 0], [.182, .06], [.172, tH * .45], [.185, tH * .7], [sW, tH * .84], [sW * .78, tH * .95], [.07, tH * 1.02], [0, tH * 1.02]];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(prof.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(18), 24), top);
    torso.position.y = hipY - .04; torso.scale.z = .7; torso.castShadow = true; g.add(torso);
    // apron: a front section of the torso profile pushed out a little, from mid-thigh to the chest, with a neck strap and a waist tie
    const apProf = [[.19, -.2], [.195, -.06], [.188, .06], [.18, tH * .45], [.17, tH * .7]].map(p => new THREE.Vector2(p[0] * 1.05, p[1]));
    const ap = new THREE.Mesh(new THREE.LatheGeometry(new THREE.SplineCurve(apProf).getPoints(10), 12, -.85, 1.7), apron);
    ap.position.y = hipY - .04; ap.scale.z = .74; g.add(ap);
    const strap = new THREE.CatmullRomCurve3([new THREE.Vector3(-.09, hipY - .04 + tH * .7, .1), new THREE.Vector3(-.06, torsoTop + .02, .02), new THREE.Vector3(0, torsoTop + .04, -.05), new THREE.Vector3(.06, torsoTop + .02, .02), new THREE.Vector3(.09, hipY - .04 + tH * .7, .1)]);
    g.add(new THREE.Mesh(taperTube(strap, .012, .012, 20, 5), apron));
    for (const s of [-1, 1]) { const bow = ball(g, 1, new THREE.Vector3(s * .035, hipY + .1, -.135), apron, [.035, .022, .012]); bow.rotation.z = s * .4; }
    for (const s of [-1, 1]) {
      limb(g, new THREE.Vector3(s * .085, .08, .01), new THREE.Vector3(s * .095, hipY, 0), ankleR, thighR, pants);
      ball(g, 1, new THREE.Vector3(s * .085, .045, .045), shoe, [.07, .048, .125]);
      // arms: a short sleeve over a rounded shoulder, then one continuous skin arm and a rounded hand with a thumb
      const ax = sW * .92, sh = new THREE.Vector3(s * ax, torsoTop - .08, 0), el = new THREE.Vector3(s * (ax + .05), torsoTop - .34, .02), wr = new THREE.Vector3(s * (ax + .045), torsoTop - .59, .07);
      ball(g, armR * 1.15, sh, top);
      limb(g, sh, sh.clone().lerp(el, .55), armR * 1.2, armR * 1.12, top);
      limb(g, sh.clone().lerp(el, .3), el, armR * .92, armR * .82, skin); limb(g, el, wr, armR * .82, armR * .62, skin);
      const hand = ball(g, 1, wr.clone().add(new THREE.Vector3(0, -.055, .01)), skin, [.042, .066, .036]); hand.rotation.z = s * .12;
      ball(g, 1, wr.clone().add(new THREE.Vector3(-s * .028, -.035, .03)), skin, [.015, .028, .015]);
    }
    ball(g, .048, new THREE.Vector3(0, torsoTop + .03, 0), skin, [1.1, 1.1, 1]);
    // head: egg-shaped lathe, narrower chin
    const headPts = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (i / 16) * Math.PI, w = Math.cos(a) * (a < 0 ? (.82 + .18 * (1 + Math.sin(a))) : 1); headPts.push(new THREE.Vector2(Math.max(.0001, w * hw), Math.sin(a) * hh)); }
    const head = new THREE.Mesh(new THREE.LatheGeometry(headPts, 28), skin); head.position.copy(headC); head.scale.z = hd / hw; head.castShadow = true; g.add(head);
    // hair: a cap, a fringe sweep and a bun
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), hair); hairCap.position.copy(headC).add(new THREE.Vector3(0, hh * .06, -hd * .05)); hairCap.scale.set(hw * 1.07, hh * 1.03, hd * 1.1); hairCap.rotation.x = -.6; g.add(hairCap);
    const fringe = ball(g, 1, headC.clone().add(new THREE.Vector3(-hw * .3, hh * .72, hd * .5)), hair, [hw * .6, hh * .18, hd * .32]); fringe.rotation.set(.5, 0, -.3);
    ball(g, hw * .4, headC.clone().add(new THREE.Vector3(0, hh * .5, -hd * .9)), hair);
    for (const s of [-1, 1]) ball(g, 1, headC.clone().add(new THREE.Vector3(s * hw * .97, -hh * .05, 0)), skin, [.033, .052, .028]);
    face(g, headC, hw, hh, hd, hairHex, { mouth: 'happy' });
    return g;
  }

  // ---------- B: octopus ----------
  // A tube along points with smooth frames; vertex colours split top/underside by a per-point "underside" direction.
  function armTube(pts, under, r0, r1, radial, topCol, underCol) {
    const curve = new THREE.CatmullRomCurve3(pts), steps = pts.length * 2, pos = [], cols = [], idx = [];
    const fr = curve.computeFrenetFrames(steps, false);
    for (let i = 0; i <= steps; i++) {
      const u = i / steps, p = curve.getPointAt(u), r = r0 + (r1 - r0) * Math.pow(u, .85), N = fr.normals[i], B = fr.binormals[i], U = under(curve, u);
      for (let j = 0; j <= radial; j++) { const v = (j / radial) * Math.PI * 2, n = N.clone().multiplyScalar(Math.cos(v)).add(B.clone().multiplyScalar(Math.sin(v)));
        pos.push(p.x + r * n.x, p.y + r * n.y, p.z + r * n.z); const c = n.dot(U) > .6 ? underCol : topCol; cols.push(c.r, c.g, c.b); }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < radial; j++) { const a = i * (radial + 1) + j, b = a + radial + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.setIndex(idx); g.computeVertexNormals();
    return { geometry: g, curve };
  }
  function octopusB() {
    const O = tok.creature?.octopus || {}, g = new THREE.Group(), P = tok.palette.octopus, topC = col(P.body), underC = col(P.body).lerp(col(P.underside), .6);
    const body = std(P.body, .5), armMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .5, metalness: 0 }), sucker = std(P.underside, .55);
    const mw = .46, mh = .46, md = .45, C = new THREE.Vector3(0, .64, 0), up = new THREE.Vector3(0, 1, 0);
    const mantle = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), body); mantle.position.copy(C); mantle.scale.set(mw, mh, md); mantle.castShadow = true; g.add(mantle);
    face(g, C, mw, mh, md, P.brow, { mouth: 'happy', eyeScale: 1.2, mouthHex: P.brow, mouthScale: 1.6 });
    const n = O.tentacles || 8, tipK = Math.max(.28, O.tipToBaseRadius || .18), r0 = .115, discs = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n, dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const L = .42 + .08 * Math.sin(i * 2.1), rr = .1 + .025 * Math.cos(i * 1.7), base = C.clone().add(dir.clone().multiplyScalar(mw * .55)).add(new THREE.Vector3(0, -mh * .7, 0));
      // path in the plane (dir, up): out and down onto the ground, along it, then the tip rolls up and back toward the body
      const pl = [], M = 14;
      for (let k = 0; k <= M; k++) { const u = k / M; let x, y;
        if (u < .25) { const t = u / .25; x = t * .22; y = (1 - t) * (base.y - r0) + r0 * .9; }
        else if (u < .65) { const t = (u - .25) / .4; x = .22 + t * L; y = r0 * .9 * (1 - t * .45); }
        else { const t = (u - .65) / .35, th = t * Math.PI * 1.35, rad = rr * (1 - t * .35); x = .22 + L + Math.sin(th) * rad; y = r0 * .5 + rad - Math.cos(th) * rad; }
        pl.push([x, y]); }
      const pts = pl.map(([x, y]) => base.clone().setY(0).add(dir.clone().multiplyScalar(x)).add(new THREE.Vector3(0, y, 0))); pts[0].copy(base);
      // underside: away from the roll's centre, so the ground side on the flat part and the outer side on the roll
      const under = (cu, u) => { const t = cu.getTangentAt(Math.min(.999, u)); return dir.clone().multiplyScalar(t.y).add(up.clone().multiplyScalar(-t.dot(dir))).normalize(); };
      const { geometry, curve } = armTube(pts, under, r0, r0 * tipK, 9, topC, underC), arm = new THREE.Mesh(geometry, armMat); arm.castShadow = true; g.add(arm);
      ball(g, r0 * tipK, curve.getPointAt(1), body, [1, 1, 1], [8, 6]);
      for (let k = 0; k < 6; k++) { const u = .4 + k * .095, p = curve.getPointAt(u), r = r0 + (r0 * tipK - r0) * Math.pow(u, .85), U = under(curve, u);
        discs.push({ p: p.clone().add(U.clone().multiplyScalar(r * 1.01)), n: U, r: r * .42 }); }
    }
    const inst = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10), sucker, discs.length), m = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1);
    discs.forEach((d, i) => { q.setFromUnitVectors(z, d.n); m.compose(d.p, q, new THREE.Vector3(d.r, d.r, d.r)); inst.setMatrixAt(i, m); }); g.add(inst);
    return g;
  }

  // ---------- A: current models with the quick fixes listed in DESIGN.md ----------
  function fixA(root, kind) {
    root.traverse(o => {
      if (!o.isMesh) return;
      const mats = [].concat(o.material);
      // blush and highlights stay readable but the blush is lit, so it no longer glows in shade
      mats.forEach((mat, i) => { if (mat.isMeshBasicMaterial && mat.transparent && mat.opacity < .5) { const lit = std('#ff8a86', .7, { transparent: true, opacity: .3, depthWrite: false }); if (Array.isArray(o.material)) o.material[i] = lit; else o.material = lit; } });
      if (/Mitten fingers|Mitten palm/.test(o.name)) { o.geometry = new THREE.SphereGeometry(.04, 20, 14); o.scale.set(1, 1.15, .8); }
      if (kind === 'octopus' && /^Arm\d+Part\d+/.test(o.name)) { o.material = std(tok.palette.octopus.body, .5); o.scale.multiplyScalar(1.18); }
      if (kind === 'octopus' && /^(Body|Mantle|Head)/.test(o.name)) o.material = std(tok.palette.octopus.body, .5);
      if (o.material?.flatShading) { o.material = o.material.clone(); o.material.flatShading = false; o.material.needsUpdate = true; }
      o.castShadow = true;
    });
    return root;
  }
  function currentA(id, kind) {
    const root = buildCatalogModel(id, {}); const sh = root.getObjectByName('Contact shadow'); if (sh) sh.parent.remove(sh);
    try { applyCatalogPose(root, 'idle', .6, 'happy', 1) } catch {}
    root.updateMatrixWorld(true); return fixA(root, kind);
  }

  // ---------- C: downloaded models ----------
  const loadGLB = url => new Promise((ok, fail) => new THREE.GLTFLoader().load(url, ok, undefined, fail));
  async function fromGLB(url, height, clipRe = /idle/i) {
    const gltf = await loadGLB(url), root = gltf.scene;
    const clip = gltf.animations.find(c => clipRe.test(c.name)) || gltf.animations[0];
    if (clip) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); mixer.setTime(.6); }
    root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(root), s = height / Math.max(.001, box.max.y - box.min.y);
    root.scale.setScalar(s); root.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(root); root.position.y -= b2.min.y;
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    root.userData.clips = gltf.animations.map(c => c.name); return root;
  }

  LAB.builders = {
    'vendor-A': async () => currentA('human.vendor', 'human'),
    'vendor-B': async () => vendorB(),
    // direction C as built for the film (Step 7 cast): the Woman, without animation clips
    'vendor-C': async () => fromGLB('/assets/people/u-woman.glb', 1.75),
    'octopus-A': async () => currentA('extension.market_octopus', 'octopus'),
    'octopus-B': async () => octopusB(),
    'octopus-C': async () => fromGLB('/models/poly-octopus.glb', 1.3),
  };

  function stats(root) {
    let tris = 0, meshes = 0; const mats = new Set();
    root.traverse(o => { if (!o.isMesh || !o.visible) return; let v = true; for (let p = o; p; p = p.parent) if (!p.visible) { v = false; break; } if (!v) return;
      meshes++; [].concat(o.material).forEach(m => mats.add(m)); const g = o.geometry, count = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += count * (o.isInstancedMesh ? o.count : 1); });
    return { triangles: Math.round(tris), drawCalls: meshes, materials: mats.size };
  }

  // Render one candidate: front, three-quarter, side, back and a close-up, all framed from the model's bounds.
  LAB.render = async name => {
    if (stage) { scene.remove(stage); }
    stage = await LAB.builders[name](); scene.add(stage); stage.updateMatrixWorld(true);
    const box = visibleBox(stage), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const out = {}, views = { front: 0, threeQuarter: .65, side: Math.PI / 2, back: Math.PI };
    const shoot = (yaw, target, dist) => { stage.rotation.y = yaw; stage.updateMatrixWorld(true); cam.position.set(target.x, target.y + dist * .08, target.z + dist); cam.lookAt(target); R.render(scene, cam); return R.domElement.toDataURL('image/png'); };
    const fit = Math.max(size.y, size.x * 960 / 720) / 2 / Math.tan((cam.fov * Math.PI) / 360) * 1.12;
    for (const [v, yaw] of Object.entries(views)) out[v] = shoot(yaw, ctr, fit);
    const human = name.startsWith('vendor'), closeT = human ? new THREE.Vector3(ctr.x, box.max.y - size.y * .2, ctr.z) : new THREE.Vector3(ctr.x, box.max.y - size.y * .4, ctr.z);
    out.closeup = shoot(.25, closeT, fit * (human ? .34 : .55));
    stage.rotation.y = 0; return { images: out, stats: stats(stage), clips: stage.userData.clips || null };
  };
})();
'ModelLab ready';
