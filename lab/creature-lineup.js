// Step 8 creature lineup: candidate creature models next to cast people, in the loaded story's world (the market), with
// the film's renderer, lights and fog, at their real-world sizes. Each group is one row and one shot, framed to fit
// the row (people end up near the size they have in a wide film shot).
// Usage from a test tool: inject, then `await CreatureLineup.run(groups)` with
//   groups = [{ name, items: [{ url, label, height | length, side, lift, clip, tint }] }]
//   height / length: metres (length = largest horizontal extent); side: true turns it side-on; lift: metres above the
//   ground (birds, fish); clip: regular expression source of a clip to pose it with; tint: hex colour for every material.
(() => {
  const L = (window.CreatureLineup = {});
  const loader = new THREE.GLTFLoader(), load = url => new Promise((ok, fail) => loader.load(url, ok, undefined, fail));

  function anchor() {
    const item = catalogInstances.find(a => /^human\.vendor/.test(a.object.userData.catalogId || '') && a.object.visible) || catalogInstances[0];
    item.object.updateMatrixWorld(true); const b = visibleBox(item.object); return b.getCenter(new THREE.Vector3()).setY(b.min.y);
  }

  async function place(it) {
    const gltf = await load(it.url), root = THREE.SkeletonUtils.clone(gltf.scene), wrap = new THREE.Group(); wrap.add(root);
    const clip = it.clip ? gltf.animations.find(c => new RegExp(it.clip, 'i').test(c.name)) : null;
    if (clip || gltf.animations[0]) { const m = new THREE.AnimationMixer(root); m.clipAction(clip || gltf.animations[0]).play(); m.setTime(.5); }
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; if (it.tint) { o.material = o.material.clone(); o.material.color.set(it.tint).convertSRGBToLinear(); } } });
    wrap.updateMatrixWorld(true); let b = new THREE.Box3().setFromObject(wrap); const sz = b.getSize(new THREE.Vector3());
    const s = it.height ? it.height / sz.y : it.length / Math.max(sz.x, sz.z); root.scale.multiplyScalar(s);
    if (it.side) root.rotation.y += Math.PI / 2 * (sz.z > sz.x ? 1 : 0);
    wrap.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(wrap);
    return { wrap, box: b, label: it.label };
  }

  L.run = async groups => {
    const at = anchor(), camPos = camera.getWorldPosition(new THREE.Vector3()), toCam = camPos.clone().sub(at).setY(0).normalize(), right = new THREE.Vector3(toCam.z, 0, -toCam.x), yaw = Math.atan2(toCam.x, toCam.z);
    // stand the row a few metres toward the camera, clear of the market stalls
    const base = at.clone().addScaledVector(toCam, 7).addScaledVector(right, -4);
    const shots = {}, cam = new THREE.PerspectiveCamera(camera.fov, 9 / 16, .1, 600);
    for (const g of groups) {
      const row = new THREE.Group(); row.name = 'CreatureLineup'; scene.add(row);
      const placed = []; for (const it of g.items) placed.push({ ...(await place(it)), it });
      // lay out left to right with a gap proportional to the neighbours' widths
      let x = 0, maxH = 0;
      placed.forEach((p, i) => {
        const w = p.box.max.x - p.box.min.x, d = p.box.max.z - p.box.min.z, half = Math.max(w, d) / 2;
        if (i) x += half + .45; p.wrap.rotation.y = yaw; row.add(p.wrap);
        p.wrap.position.copy(base).add(right.clone().multiplyScalar(x)); p.wrap.position.y = base.y - p.box.min.y + (p.it.lift || 0);
        x += half; maxH = Math.max(maxH, p.box.max.y - p.box.min.y + (p.it.lift || 0));
      });
      row.updateMatrixWorld(true);
      const mid = base.clone().add(right.clone().multiplyScalar(x / 2)), t = Math.tan((cam.fov * Math.PI) / 360);
      const dist = Math.max((x + 2) / 0.9 / (2 * t * 9 / 16), maxH * 1.6 / (2 * t));
      cam.near = Math.max(.1, dist - 4); cam.updateProjectionMatrix();
      cam.position.copy(mid).add(toCam.clone().multiplyScalar(dist)).setY(base.y + 1.1); cam.lookAt(mid.clone().setY(base.y + Math.min(maxH, 3) * .45)); cam.updateMatrixWorld(true);
      renderer.render(scene, cam);
      const tags = placed.map(p => { const b = new THREE.Box3().setFromObject(p.wrap), q = b.getCenter(new THREE.Vector3()).setY(b.min.y).project(cam); return { label: p.label, x: (q.x + 1) / 2, y: (1 - q.y) / 2 }; });
      shots[g.name] = { png: renderer.domElement.toDataURL('image/png'), tags, personPx: Math.round(960 * 1.75 / (2 * dist * t)) };
      scene.remove(row);
    }
    return { shots };
  };
})();
'CreatureLineup ready';
