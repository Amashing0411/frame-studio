// Step 7 lineup: candidate glTF people standing in a row in the loaded story's world, next to the current vendor,
// rendered with the film's own renderer, lights and fog. Two shots: "film" (figures about 1/6 of the 9:16 frame tall,
// the size they usually have in a film) and "medium" (faces readable).
// Usage from a test tool: inject, then `await Lineup.run(models)` with models = [{ url, label, clip }] (clip: a regular expression source for the pose clip).
(() => {
  const L = (window.Lineup = {});
  const loader = new THREE.GLTFLoader(), load = url => new Promise((ok, fail) => loader.load(url, ok, undefined, fail));
  let row = null;

  // The current vendor: the visible catalog instance built from a human.vendor archetype (any variant).
  function vendor() {
    const item = catalogInstances.find(a => /^human\.vendor/.test(a.object.userData.catalogId || '') && a.object.visible);
    return item ? item.object : null;
  }

  L.run = async (models, { spacing = 0.95 } = {}) => {
    if (row) scene.remove(row);
    row = new THREE.Group(); row.name = 'Lineup'; scene.add(row);
    const ref = vendor(); if (!ref) throw new Error('no vendor in this story');
    ref.updateMatrixWorld(true);
    const refBox = visibleBox(ref), height = refBox.max.y - refBox.min.y, base = refBox.getCenter(new THREE.Vector3()).setY(refBox.min.y);
    // face the row toward the film camera, laid out along the camera's right vector, starting beside the vendor
    const camPos = camera.getWorldPosition(new THREE.Vector3()), toCam = camPos.clone().sub(base).setY(0).normalize(), right = new THREE.Vector3(toCam.z, 0, -toCam.x);
    const yaw = Math.atan2(toCam.x, toCam.z), out = [];
    models.forEach((m, i) => out.push({ ...m, i: i + 1 }));
    const items = [{ label: 'current vendor', object: ref }];
    for (const m of out) {
      const gltf = await load(m.url), root = THREE.SkeletonUtils.clone(gltf.scene), clip = gltf.animations.find(c => new RegExp(m.clip, "i").test(c.name)) || gltf.animations[0];
      const wrap = new THREE.Group(); wrap.add(root); row.add(wrap);
      if (clip) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(clip).play(); mixer.setTime(0.7); }
      // child proportions from an adult model: bone scales (the clips only animate position and rotation, so these hold)
      for (const [bone, k] of Object.entries(m.boneScale || {})) root.getObjectByName(bone)?.scale.setScalar(k);
      root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
      wrap.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(wrap), s = height * (m.heightScale || 1) / (b.max.y - b.min.y);
      root.scale.multiplyScalar(s); wrap.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(wrap);
      wrap.position.copy(base).add(right.clone().multiplyScalar(spacing * m.i)); wrap.position.y = base.y - b2.min.y; wrap.rotation.y = yaw;
      items.push({ label: m.label, object: wrap, clip: clip?.name });
    }
    row.updateMatrixWorld(true);
    // cameras: aim at the middle of the row, at chest height, from the film camera's side
    const cam = new THREE.PerspectiveCamera(camera.fov, 9 / 16, .1, 400);
    const shots = {};
    // frame the figures from index a to b (0 = the current vendor) so each is about figureFraction of the frame tall, or the row fits
    const shoot = (name, figureFraction, a = 0, b = models.length) => {
      const mid = base.clone().add(right.clone().multiplyScalar(spacing * (a + b) / 2)), vh = height / figureFraction, d = vh / 2 / Math.tan((cam.fov * Math.PI) / 360), rowW = spacing * (b - a + 1);
      const dist = Math.max(d, rowW / 0.92 / (2 * Math.tan((cam.fov * Math.PI) / 360) * 9 / 16));
      // the near plane starts just in front of the row, so stalls and posts between the camera and the row never block it
      cam.near = Math.max(.1, dist - 2.5); cam.updateProjectionMatrix();
      cam.position.copy(mid).add(toCam.clone().multiplyScalar(dist)).setY(base.y + height * .62); cam.lookAt(mid.clone().setY(base.y + height * .55)); cam.updateMatrixWorld(true);
      renderer.render(scene, cam);
      // where each figure's feet land in the frame (0..1), for name tags
      const tags = items.map(it => { const b = visibleBox(it.object), p = b.getCenter(new THREE.Vector3()).setY(b.min.y).project(cam); return { label: it.label, x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; });
      shots[name] = { png: renderer.domElement.toDataURL('image/png'), tags, figurePx: Math.round(1920 * height / (2 * dist * Math.tan((cam.fov * Math.PI) / 360))) };
    };
    shoot('film', 1 / 6);
    shoot('medium', 0.42, 0, Math.min(3, models.length));
    const labels = items.map(it => it.label);
    return { shots, labels, height, canvas: [renderer.domElement.width, renderer.domElement.height] };
  };
})();
'Lineup ready';
