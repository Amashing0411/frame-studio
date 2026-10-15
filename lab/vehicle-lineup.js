// Vehicle lineup: candidate vehicles parked side by side across the loaded city's avenue, in a three-quarter view,
// with a cast person for scale, under the film's lights and fog. The story's own people and vehicles are hidden while
// the shots render. Usage from a test tool: inject, then `await VehicleLineup.run(rows, { w, h })` with
//   rows = [{ name, items: [{ url | make, label, length, height, flip }] }]
//   length: metres along the vehicle (longest horizontal side); height: metres (people); flip: the model faces -Z;
//   make: a JavaScript expression that builds the object in the page (current code-built vehicles).
(() => {
  const L = (window.VehicleLineup = {});
  const loader = new THREE.GLTFLoader(), load = url => new Promise((ok, fail) => loader.load(url, ok, undefined, fail));

  async function place(it) {
    const root = it.make ? (0, eval)(it.make) : THREE.SkeletonUtils.clone((await load(it.url)).scene), wrap = new THREE.Group(), turn = new THREE.Group();
    turn.add(root); wrap.add(turn);
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
    wrap.updateMatrixWorld(true); let b = new THREE.Box3().setFromObject(wrap); const sz = b.getSize(new THREE.Vector3());
    if (sz.x > sz.z && !it.height) turn.rotation.y = Math.PI / 2;  // long side along Z (forward)
    if (it.flip) turn.rotation.y += Math.PI;
    const s = it.height ? it.height / sz.y : it.length ? it.length / Math.max(sz.x, sz.z) : 1; turn.scale.setScalar(s);
    wrap.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(wrap);
    root.position.y -= b.min.y / s;  // wheels on the ground
    const c = b.getCenter(new THREE.Vector3()); root.position.x -= c.x / s; root.position.z -= c.z / s;
    wrap.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(wrap);
    return { wrap, box: b, label: it.label };
  }

  L.run = async (rows, { w = 1600, h = 900 } = {}) => {
    const hidden = []; for (const list of [ppl, veh, typeof resc !== 'undefined' ? resc : []]) for (const o of list) if (o.g && o.g.visible) { o.g.visible = false; hidden.push(o.g); }
    const shots = {}, base = new THREE.Vector3(0, CITY_TOP.road, 46), yaw = -.55;
    const cam = new THREE.PerspectiveCamera(30, w / h, .1, 600);
    for (const r of rows) {
      const row = new THREE.Group(); row.name = 'VehicleLineup'; scene.add(row);
      const placed = []; for (const it of r.items) placed.push(await place(it));
      // park side by side along X, each turned three-quarters toward the camera, gaps proportional to widths
      let x = 0;
      placed.forEach((p, i) => {
        const half = Math.max(p.box.max.x - p.box.min.x, p.box.max.z - p.box.min.z) * .5 * Math.abs(Math.sin(yaw)) + (p.box.max.x - p.box.min.x) * .5 * Math.abs(Math.cos(yaw));
        if (i) x += half + .8; p.wrap.position.set(x, 0, 0); p.wrap.rotation.y = yaw; row.add(p.wrap); p.x = x; x += half;
      });
      row.position.set(base.x - x / 2, base.y, base.z); row.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(row), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      const fit = Math.max(size.x / cam.aspect, size.y * 1.6) / (2 * Math.tan(cam.fov * Math.PI / 360));
      cam.position.set(c.x, Math.max(1.6, size.y * .7), c.z + fit + size.z * .5); cam.lookAt(c.x, size.y * .38, c.z); cam.updateProjectionMatrix();
      camera.position.copy(cam.position); camera.quaternion.copy(cam.quaternion); camera.updateMatrixWorld();
      if (typeof syncCastBodies === 'function') syncCastBodies();
      renderer.setSize(w, h, false); renderer.render(scene, cam);
      const tags = placed.map(p => { p.wrap.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(p.wrap), v = new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2).project(cam); return { label: p.label, x: v.x * .5 + .5, y: -v.y * .5 + .5 }; });
      shots[r.name] = { png: renderer.domElement.toDataURL('image/png'), tags };
      scene.remove(row);
    }
    for (const g of hidden) g.visible = true;
    configureRender();
    return { shots };
  };
  return 'VehicleLineup ready';
})();
