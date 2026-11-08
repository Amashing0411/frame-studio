// PSX city (Phase 3 of design/overhaul-plan.md, first part): the engine's own city (06-world.js) is built from the PSX
// catalog instead of procedural boxes. tower() places a skyscraper or a city block fitted to its lot, house() a town
// house, mkVeh() a PSX car, palm()/tree()/bush() PSX trees, and the road, pavement and plaza slabs take the Roads
// pack's textures (tools/build-psx-city.mjs). The buildings keep the record the hazards use (blds: tilt, damage and the
// night glow on their own private materials), so the earthquake and the power cut still work. Every model loads on
// demand through buildPsxModel (an invisible box of the model's size until the file arrives, which seekFilm waits for).
// The old procedural builders stay as the fallback when the catalog did not load.
const PSX_CITY = {
  // skyscrapers for tall lots, city blocks for low ones (sizes in the manifest's psx section)
  towers: ['building.office', 'building.tower_01_2', 'building.tower_02_1', 'building.tower_02_2', 'building.tower_03_1', 'building.tower_03_2', 'building.tower_04_1', 'building.tower_04_2', 'building.tower_05_1', 'building.tower_05_2', 'building.tower_06_1', 'building.tower_06_2', 'building.tower_07_1', 'building.tower_07_2'],
  blocks: ['building.apartment', 'building.shop', 'building.block_04', 'building.block_05', 'building.block_06', 'building.block_07', 'building.block_08', 'building.block_09', 'building.block_10'],
  houses: ['building.house', 'building.house_02', 'building.house_03', 'building.house_04', 'building.house_05', 'building.house_06', 'building.house_07', 'building.house_08', 'building.house_09'],
  // the engine's traffic types: no PSX bus, jeepney or tricycle exists, so the van, the minivan and the compact stand in
  cars: { car: ['vehicle.sedan', 'vehicle.compact', 'vehicle.wagon', 'vehicle.vintage', 'vehicle.cruiser'], taxi: ['vehicle.taxi'], bus: ['vehicle.van'], jeep: ['vehicle.minivan'], trike: ['vehicle.compact'] },
  trees: { palm: ['tree.birch', 'tree.maple'], tree: ['tree.oak', 'tree.maple', 'tree.birch'], bush: ['tree.sapling'] },
  // street surface -> texture and size of one repeat (m)
  // (the slabs picture is near white, so the pavement takes a warm grey tint)
  surfaces: { road: ['asphalt', 4, 0xffffff], pavement: ['slabs', 2.4, 0xb9b0a1], plaza: ['stone', 3, 0xe6ddd0] },
};
// The PSX catalog is there (loadCast read the manifest): otherwise the city keeps its procedural builders.
function psxCityReady() { return !!PSX_CAT.meta['building.office'] && !!PSX_CAT.meta['vehicle.sedan']; }
const psxCitySize = id => PSX_CAT.meta[id].size;

// A building on a lot of w x d metres with a target height: the model is scaled to the lot (uniformly, so it keeps its
// proportions) and turned a quarter turn at random. The model sits in a holder that the hazards move (resetWorld zeroes
// the holder's rotation, the earthquake tilts it), so the model's own turn survives a reset. opts.pool: the models to
// pick from; opts.yaw: a fixed turn (the market's shop fronts face the walkway); opts.width: scale to this width along
// the model's x instead of fitting the lot. Returns the blds record the hazards read.
function psxCityBuilding(cx, cz, w, d, h, town, opts = {}) {
  const pool = opts.pool || (town ? PSX_CITY.houses : h > 30 ? PSX_CITY.towers : PSX_CITY.blocks);
  // of three seeded candidates, the one whose fitted height is closest to the target
  let best = null;
  for (let k = 0; k < 3; k++) {
    const id = pool[Math.floor(R() * pool.length)], [sx, sy, sz] = psxCitySize(id), s = opts.width ? opts.width / sx : Math.min(w / sx, d / sz) * (.9 + R() * .08), err = Math.abs(sy * s - h);
    if (!best || err < best.err) best = { id, s, err };
  }
  const [sx, sy, sz] = psxCitySize(best.id), holder = new THREE.Group(), root = buildPsxModel(best.id), yaw = opts.yaw ?? Math.floor(R() * 4) * Math.PI / 2;
  root.scale.setScalar(best.s); root.rotation.y = yaw; holder.add(root); holder.position.set(cx, 0, cz);
  const quarter = Math.abs(Math.sin(yaw)) > .5, rec = { m: holder, x: cx, z: cz, w: (quarter ? sz : sx) * best.s, d: (quarter ? sx : sz) * best.s, h: sy * best.s, mats: [], s: R() * 9, tilt: 0, dmg: 0, lit: true, c0: [] };
  holder.name = (opts.name || (town ? 'House ' : 'Tower ')) + best.id.replace('building.', ''); holder.userData.psxCity = true; root.userData.cityBuilding = rec;
  if (root.getObjectByName('PSX model')) psxCityOwnMaterials(root); else root.userData.psxOnAttach = psxCityOwnMaterials;
  world.add(holder); blds.push(rec); return rec;
}
// A building's own copies of its materials (the earthquake darkens them, the power cut turns off their glow), with a
// faint warm glow of the building's own picture after dark (EI: .15 by day, .7 golden hour, 1.7 at night).
function psxCityOwnMaterials(root) {
  const rec = root.userData.cityBuilding; if (!rec) return; const copies = new Map();
  root.getObjectByName('PSX model')?.traverse(o => {
    if (!o.isMesh) return;
    const own = m => { if (!copies.has(m)) { const c = m.clone(); c.userData = { ...c.userData, psxShared: false }; if (c.map) { c.emissiveMap = c.map; c.emissive = new THREE.Color(1, .82, .55); c.emissiveIntensity = rec.lit ? EI * .2 : 0; } copies.set(m, c); rec.mats.push(c); rec.c0.push(c.color.clone()); } return copies.get(m); };
    o.material = Array.isArray(o.material) ? o.material.map(own) : own(o.material);
  });
  // a building already damaged before its file arrived takes the same look
  for (let i = 0; i < rec.dmg; i++) for (const m of rec.mats) m.color.lerp(new THREE.Color(0x7d7260), .35);
}
// A car for the engine's traffic: the same group layout mkVeh returns (body inside, length, no wheels to spin).
function psxCityVehicle(type) {
  const pool = PSX_CITY.cars[type] || PSX_CITY.cars.car, id = pool[Math.floor(R() * pool.length)], g = new THREE.Group(), body = new THREE.Group();
  const car = buildPsxModel(id); body.add(car); g.add(body);
  g.userData.L = psxCitySize(id)[2]; g.userData.wheels = []; g.userData.body = body; g.name = type.charAt(0).toUpperCase() + type.slice(1);
  return g;
}
// A tree for a plaza or a park: seeded size and turn, standing still (the PSX trees have no crown parts to sway).
function psxCityTree(x, z, kind) {
  const pool = PSX_CITY.trees[kind], id = pool[Math.floor(R() * pool.length)], root = buildPsxModel(id);
  root.position.set(x, 0, z); root.rotation.y = R() * Math.PI * 2; root.scale.setScalar(kind === 'bush' ? .45 + R() * .2 : .7 + R() * .35);
  root.userData.assetCategory = 'vegetation'; root.name = kind === 'bush' ? 'Shrub' : 'Tree'; world.add(root);
  return root;
}
// The street slabs take the Roads pack's textures, mapped in world space (one repeat per few metres on every slab,
// whatever its size). Markings and other slabs keep their colours. Called at the end of buildBaseWorld for the city.
function psxCitySurfaces() {
  psxDebrisPreload();
  const looks = {};
  for (const [kind, [tex, tile, tint]] of Object.entries(PSX_CITY.surfaces)) {
    const t = psxLookTexture(tex); if (!t) continue;
    looks[kind] = { tile, mat: new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: 1, metalness: 0 }) };
  }
  const p = new THREE.Vector3();
  world.traverse(o => {
    const kind = o.userData.citySurface, look = looks[kind]; if (!look) return;
    const old = o.material, g = o.geometry.clone(); o.updateMatrixWorld(true);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); uv.setXY(i, p.x / look.tile, p.z / look.tile); }
    o.geometry.dispose(); o.geometry = g;
    // the slab's layer offset stays (thin layers do not flicker against each other far away). The market walkway has
    // none: an offset there would cover the people's soles; under the PSX finish it is kept off the ground by
    // psxMarkFlatGround (flat layers do not snap)
    const m = look.mat.clone(); Object.assign(m, { polygonOffset: old.polygonOffset, polygonOffsetFactor: old.polygonOffsetFactor, polygonOffsetUnits: old.polygonOffsetUnits });
    o.material = m; o.userData.keepGeo = true;
  });
}
// The Divisoria market (buildMarket) from PSX models: town buildings as the shop fronts on both sides of the walkway,
// produce stalls of PSX crates and fruit, vending machines and coolers, and a PSX minivan where the jeepney stood. The
// walkway takes the paving slabs. The welcome banner and the story's people and octopus stay (they carry the story).
const PSX_MARKET = {
  fronts: ['building.house_07', 'building.house_08', 'building.house_03', 'building.house_09', 'building.house', 'building.house_05', 'building.house_04', 'building.house_06'],
  fruit: ['food.apple', 'food.orange', 'food.banana', 'food.papaya', 'food.lettuce', 'food.carrot', 'food.cucumber'],
  vending: ['prop.vending_01', 'prop.vending_03', 'prop.vending_05', 'prop.vending_08'],
};
function psxMarketSet(walkway) {
  const r = rngf(4721), pick = a => a[Math.floor(r() * a.length)];
  const prop = (id, x, y, z, yaw = 0, scale = 1) => { const o = buildPsxModel(id); o.position.set(x, y, z); o.rotation.y = yaw; o.scale.setScalar(scale); world.add(o); return o; };
  for (let i = 0; i < 8; i++) for (const side of [-1, 1]) {
    // a shop front 7.4 m wide along the walkway, its face on the walkway's edge (x = ±8), facing it
    const id = PSX_MARKET.fronts[(i * 3 + (side > 0 ? 5 : 0)) % PSX_MARKET.fronts.length], [sx, , sz] = psxCitySize(id), s = 7.4 / sx;
    psxCityBuilding(side * (8 + sz * s / 2), 11 - i * 7.8, 0, 0, 0, true, { pool: [id], width: 7.4, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, name: 'Divisoria shop ' });
    // a produce stall: two crates heaped with fruit, a cooler beside them
    const z = 7 - i * 6.7, x = side * 4.9;
    for (const dz of [-.35, .35]) {
      const crate = prop('food.crate', x, 0, z + dz, Math.PI / 2, 1.6);
      crate.name = 'Produce stall ' + (i + 1);
      const fruit = pick(PSX_MARKET.fruit);
      for (let k = 0; k < 7; k++) prop(fruit, x + (r() - .5) * .75, .64 + r() * .05, z + dz + (r() - .5) * .45, r() * 6.28, 2.2);
    }
    if (i % 2 === 0) prop(r() < .5 ? 'prop.cooler' : 'prop.cooler_red', x + side * .7, 0, z + .9, r() * 6.28, 1.4);
    if (i % 3 === 1) prop(pick(PSX_MARKET.vending), side * 7.55, 0, 11 - i * 7.8 + 2.6, side < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  const van = prop('vehicle.minivan', -1.8, 0, -15, .13); van.name = 'Ilaya minivan';
  if (walkway) walkway.userData.citySurface = 'pavement';
  psxCitySurfaces();
}
// Falling masonry (damage() in 08-state.js) in the PSX city: each piece of the engine's debris pool carries a PSX rock
// sized like the old 1.6 m piece and centred on it; the piece itself is drawn invisible. The physics stays the engine's.
const PSX_DEBRIS = ['rock.boulder', 'rock.rock_2', 'rock.rock_3', 'rock.rock_4', 'rock.rock_5', 'rock.rock_6', 'rock.rock_7', 'rock.rock_8'];
function psxDebrisLook(d, i) {
  if (d.psxRock) return;
  const id = PSX_DEBRIS[(debris.indexOf(d) + i) % PSX_DEBRIS.length], [sx, sy, sz] = psxCitySize(id), k = 1.6 / Math.max(sx, sy, sz), rock = buildPsxModel(id);
  rock.scale.setScalar(k); rock.position.y = -sy * k / 2; d.m.add(rock); d.m.material = PSX_STANDIN; d.psxRock = rock;
}
// the rocks start downloading as soon as a quake city is built, so the first collapse already shows them
function psxDebrisPreload() { if (SC?.hazard?.type === 'quake') for (const id of PSX_DEBRIS) psxLoad(id); }