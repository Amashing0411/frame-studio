// PSX catalog models (itch.io packs, built by tools/build-psx.mjs into public/assets/psx and listed in the manifest's
// psx section). definePsxCatalog (called by loadCast once the manifest arrives) adds one catalog archetype per model;
// people stay the cast and the market octopus stays an extension. Files load on demand: buildPsxModel returns a group
// holding an invisible box of the model's exact size (so bounds and camera solids are the same before and after) and
// asks for the file; when it arrives every waiting group gets a clone that shares the geometry and materials, and the
// frame is redrawn. seekFilm (and so every export) waits for pending files with psxReady, so frames stay repeatable.
// Motion states are procedural: trees sway in the wind (harder in a storm), boats bob, fish swim; the rest hold still.
const PSX_CAT = { meta: {}, src: new Map(), loading: new Map(), waiting: new Set() };
const PSX_STANDIN = new THREE.MeshBasicMaterial({ visible: false }); PSX_STANDIN.userData.psxShared = true;

function definePsxCatalog(list) {
  for (const [id, m] of Object.entries(list || {})) {
    PSX_CAT.meta[id] = m;
    if (!CATALOG_BASE.some(b => b.id === id)) CATALOG_BASE.push({ id, name: m.name, category: m.category, kind: 'psx', states: m.states, params: [], expressions: [], accessories: [], rig: 'static' });
  }
}

function psxLoad(id) {
  if (PSX_CAT.src.has(id)) return Promise.resolve(PSX_CAT.src.get(id));
  if (PSX_CAT.loading.has(id)) return PSX_CAT.loading.get(id);
  const p = new Promise(ok => new THREE.GLTFLoader().load('assets/' + PSX_CAT.meta[id].file, g => {
    g.scene.traverse(o => { if (!o.isMesh) return; o.castShadow = o.receiveShadow = true; o.userData.psxShared = true; [].concat(o.material).forEach(m => m.userData.psxShared = true); });
    PSX_CAT.src.set(id, g.scene); PSX_CAT.loading.delete(id); psxFill(id); ok(g.scene);
  }, undefined, e => { PSX_CAT.loading.delete(id); console.warn('PSX model ' + id + ' did not load', e); ok(null); }));
  PSX_CAT.loading.set(id, p); return p;
}
const psxBusy = () => PSX_CAT.loading.size;
async function psxReady() { while (PSX_CAT.loading.size) await Promise.all([...PSX_CAT.loading.values()]); }

function buildPsxModel(id) {
  const [w, h, d] = PSX_CAT.meta[id].size, root = new THREE.Group(), box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), PSX_STANDIN);
  box.name = 'PSX stand-in'; box.position.y = h / 2; root.add(box); root.userData.psx = id;
  if (PSX_CAT.src.has(id)) psxAttach(root); else { PSX_CAT.waiting.add(root); psxLoad(id); }
  return root;
}
function psxAttach(root) {
  PSX_CAT.waiting.delete(root); if (root.getObjectByName('PSX model')) return;
  const inner = PSX_CAT.src.get(root.userData.psx)?.clone(true);
  if (!inner) return; inner.name = 'PSX model'; root.add(inner); root.updateMatrixWorld(true);
}
function psxFill(id) {
  let n = 0; for (const r of [...PSX_CAT.waiting]) if (r.userData.psx === id) { psxAttach(r); n++; }
  // copies made while the file was loading (the Model studio shows a copy) carry the id but were never registered
  for (const s of [scene, typeof assetScene !== 'undefined' && assetScene]) s?.traverse(o => { if (o.userData.psx === id && !o.getObjectByName('PSX model')) { psxAttach(o); n++; } });
  if (n && sceneReady && !simulating && !seeking && !recording) renderCurrent();
}

// Procedural motion for a state. The phase comes from the instance id (biome foliage has none: its seeded position),
// so a scene looks the same on every run and trees do not sway in step.
function posePsx(root, state, t) {
  const inner = root.getObjectByName('PSX model'); if (!inner) return;
  const key = root.userData.instanceId || root.position.x.toFixed(1) + ',' + root.position.z.toFixed(1);
  const ph = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 0) * .37;
  inner.position.set(0, 0, 0); inner.rotation.set(0, 0, 0);
  if (state === 'wind' || state === 'storm') { const k = state === 'storm' ? 3 : 1; inner.rotation.z = Math.sin(t * 1.3 * k ** .5 + ph) * .025 * k; inner.rotation.x = Math.sin(t * .9 * k ** .5 + ph) * .015 * k; }
  else if (state === 'sail') { inner.position.y = Math.sin(t * 1.6 + ph) * .08; inner.rotation.z = Math.sin(t * 1.1 + ph) * .04; inner.rotation.x = Math.sin(t * 1.4 + ph) * .03; }
  else if (state === 'swim') inner.rotation.y = Math.sin(t * 6 + ph) * .25;
}
