// Guide tab (Step 11): everything a story can use, read live from the engine every time the tab opens, so new models,
// moves, cameras or events show up without editing this file. Sources: the catalog (CATALOG_BASE, plus installed and
// imported packs through catalogEntries), the people models (CAST.manifest), and the validator's own lists (PRE, MOV,
// EVT, CRW, EMOS, KL). Buttons act on the story: a move sets the selected character's action in the current shot,
// a camera or movement sets the shot's camera, a category opens the asset library filtered to it; anything that only
// lives in the script (events, crowd moods, disasters) is copied as its script name.
const GUIDE_MOVES = { idle: ['Stand', 'i-person'], walk: ['Walk', 'i-walk'], run: ['Run', 'i-run'], wave: ['Wave', 'i-wave'], talk: ['Talk', 'i-talk'], phone: ['Use phone', 'i-phone'], sit: ['Sit', 'i-sit'], crouch: ['Crouch', 'i-person'], cower: ['Take cover', 'i-person'], cheer: ['Cheer', 'i-wave'], point: ['Point', 'i-point'], carry: ['Carry', 'i-box'], swim: ['Swim', 'i-water'], dance: ['Dance', 'i-person'], jump: ['Jump', 'i-crane'], climb: ['Climb', 'i-crane'], fall: ['Fall', 'i-person'], sleep: ['Sleep', 'i-moon'], zombie: ['Zombie walk', 'i-walk'], think: ['Think', 'i-help'] };
const GUIDE_FEELINGS = { neutral: 'i-person', happy: 'i-happy', sad: 'i-sad', angry: 'i-angry', fear: 'i-shock', shock: 'i-shock', surprised: 'i-shock', determined: 'i-bolt', relief: 'i-happy' };
const GUIDE_THINGS = { human: ['People', 'i-person', 't1'], animal: ['Animals', 'i-paw', 't5'], vehicle: ['Vehicles', 'i-car', 't2'], boat: ['Boats', 'i-boat', 't2'], aircraft: ['Aircraft', 'i-plane', 't2'], building: ['Buildings', 'i-building', 't4'], tree: ['Trees', 'i-tree', 't3'], plant: ['Plants', 'i-tree', 't3'], food: ['Food', 'i-food', 't1'], prop: ['Street props', 'i-box', 't4'], trash: ['Litter', 'i-trash', 't5'], debris: ['Debris', 'i-rubble', 't5'], environment: ['Places', 'i-globe', 't3'] };
const GUIDE_EVENTS = { quake_shake: 'i-bolt', facade_fall: 'i-rubble', dust_cloud: 'i-rubble', power_outage: 'i-bolt', siren: 'i-siren', helicopter: 'i-plane', rescue_crew: 'i-person', fire_small: 'i-bolt', smoke_plume: 'i-rubble', zombie_spawn: 'i-walk', crowd_evacuate: 'i-crowd', traffic_jam: 'i-car' };
const guideTitle = s => s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
let guideQuery = '';
const guideOpenSecs = new Set();  // sections showing all their items
const GUIDE_SHORT = { grid: 8, chips: 10 };

function initGuide() {
  renderGuide(false);
}

function guideData() {
  const human = CATALOG_BASE.find(a => a.category === 'human');
  const moves = (human?.states || Object.keys(GUIDE_MOVES)).map(v => ({ v, label: (GUIDE_MOVES[v] || [guideTitle(v)])[0], icon: (GUIDE_MOVES[v] || [, 'i-person'])[1] }));
  const entries = typeof catalogEntries !== 'undefined' && catalogEntries.length ? catalogEntries : CATALOG_BASE, cats = new Map();
  for (const e of entries) if (!e.variant) cats.set(e.category, (cats.get(e.category) || 0) + 1);  // one per model, not per colour preset
  const people = CAST.ready ? Object.keys(CAST.manifest.people.models).length : 0;
  const disasters = [...new Set([...Object.keys(KL), ...(typeof validateWaterHazard === 'function' ? ['tsunami', 'flood'] : [])])];
  return {
    people, moves, things: [...cats].map(([c, n]) => ({ v: c, n, label: (GUIDE_THINGS[c] || [guideTitle(c)])[0], icon: (GUIDE_THINGS[c] || [, 'i-box'])[1], tile: (GUIDE_THINGS[c] || [, , 't4'])[2] })),
    feelings: EMOS.map(v => ({ v, label: guideTitle(v), icon: GUIDE_FEELINGS[v] || 'i-happy' })),
    cameras: PRE.map(v => ({ v, label: (UI_CAMERAS[v] || [guideTitle(v)])[0], icon: (UI_CAMERAS[v] || [, 'i-camera'])[1] })),
    movesCam: MOV.map(v => ({ v, label: (UI_MOVES[v] || [guideTitle(v)])[0], icon: (UI_MOVES[v] || [, 'i-push'])[1] })),
    events: EVT.map(v => ({ v, label: guideTitle(v), icon: GUIDE_EVENTS[v] || 'i-bolt' })),
    crowd: CRW.map(v => ({ v, label: guideTitle(v), icon: 'i-crowd' })),
    disasters: disasters.map(v => ({ v, label: guideTitle(v === 'quake' ? 'earthquake' : v), icon: v === 'zombie' ? 'i-walk' : v === 'quake' ? 'i-bolt' : 'i-water' })),
  };
}

// open: the tab was just shown (items fade in once)
function renderGuide(open) {
  const root = $('guide'); if (!root || typeof CATALOG_BASE === 'undefined') return;
  const d = guideData(), q = guideQuery.trim().toLowerCase(), hit = x => !q || (x.label + ' ' + x.v).toLowerCase().includes(q);
  const searchHad = document.activeElement === $('guideSearch');
  root.classList.toggle('guide-open', !!open);
  const total = d.things.reduce((s, x) => s + x.n, 0);
  root.innerHTML = `<h3 class="panel-title">Guide</h3><p class="hint">Everything your story can use right now · <span class="guide-live"><i></i>Live</span></p>
   <div class="guide-search">${uiIcon('i-search')}<input id="guideSearch" type="search" placeholder="Search moves, things, cameras…" aria-label="Search the guide"></div>
   <div class="guide-counts"><div><b>${d.people || '—'}</b><span>people</span></div><div><b>${d.moves.length}</b><span>moves</span></div><div><b>${total}</b><span>things</span></div><div><b>${d.cameras.length}</b><span>cameras</span></div><div><b>${d.events.length}</b><span>events</span></div></div>`;
  const sections = [
    ['People can', 'Tap to give the selected character this move in the current shot.', d.moves, 'grid', 'move', 't1'],
    ['Feelings', 'Tap to set how the selected character feels in this shot.', d.feelings, 'chips', 'feel'],
    ['Things to add', 'Tap to browse and add them from the asset library.', d.things, 'grid', 'thing'],
    ['Cameras', 'Tap to use this camera for the current shot.', d.cameras, 'chips', 'cam'],
    ['Camera movement', 'Tap to use this movement for the current shot.', d.movesCam, 'chips', 'move-cam'],
    ['Story events', 'Tap to copy the name to use in a shot\'s events.', d.events, 'chips', 'copy'],
    ['Crowd moods', 'Tap to use this mood for the current shot.', d.crowd, 'chips', 'crowd'],
    ['Disasters', 'Tap to copy the name to use as the story\'s hazard.', d.disasters, 'chips', 'copy'],
  ];
  let shown = 0;
  for (const [title, hint, list, kind, act, tile] of sections) {
    const items = list.filter(hit); if (!items.length) continue; shown += items.length;
    const all = q || guideOpenSecs.has(title) || items.length <= GUIDE_SHORT[kind] + 2, visible = all ? items : items.slice(0, GUIDE_SHORT[kind]);
    const sec = document.createElement('section'); sec.className = 'guide-sec';
    sec.innerHTML = `<h4>${title} <span>${act === 'thing' ? items.reduce((s, x) => s + x.n, 0) : items.length}</span></h4><p>${hint}</p>`;
    const box = document.createElement('div'); box.className = kind === 'grid' ? 'guide-grid' : 'guide-chips';
    for (const x of visible) {
      const b = document.createElement('button'); b.type = 'button';
      if (kind === 'grid') { b.className = 'guide-item'; b.innerHTML = `<span class="tile ${x.tile || tile || 't4'}">${uiIcon(x.icon)}</span><span>${x.label}${x.n ? ` · ${x.n}` : ''}</span>${uiIcon('i-chev').replace('class="i"', 'class="i go"')}`; }
      else b.innerHTML = uiIcon(x.icon) + `<span>${x.label}</span>`;
      b.title = x.v; b.onclick = () => guideAct(act, x.v, x.label);
      box.append(b);
    }
    sec.append(box);
    if (!all) { const more = document.createElement('button'); more.type = 'button'; more.className = 'guide-more'; more.textContent = `Show all ${items.length}`; more.onclick = () => { guideOpenSecs.add(title); renderGuide(false); }; sec.append(more); }
    root.append(sec);
  }
  if (!shown) root.insertAdjacentHTML('beforeend', `<p class="guide-empty">Nothing matches “${guideQuery.replace(/[<>&]/g, '')}”.</p>`);
  const input = $('guideSearch'); input.value = guideQuery;
  input.oninput = () => { guideQuery = input.value; renderGuide(false); };
  if (searchHad) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

function guideAct(act, value, label) {
  if (act === 'thing') { $('libraryMode').value = 'catalog'; libraryModeChanged(); $('catalogCategory').value = value; $('catalogCategory').dispatchEvent(new Event('change')); tabLeft('library'); return; }
  if (act === 'copy') { guideCopy(value); return; }
  if (!shots.length) { notifyUser('Check a story first, then pick a shot.'); return; }
  if (act === 'cam' || act === 'move-cam' || act === 'crowd') {
    const sel = $(act === 'cam' ? 'shotPreset' : act === 'move-cam' ? 'shotMove' : 'shotCrowd');
    sel.value = value; syncChoiceMirrors(); showPanel('shot');
    notifyUser(`${label} set for shot ${selectedShot + 1}. Press Apply shot changes to keep it.`); return;
  }
  // move / feel: the shot's character action
  const who = $('actionTarget');
  if (who.options.length < 2) { guideCopy(value); return; }
  if (!who.value) { who.value = who.options[1].value; who.dispatchEvent(new Event('change')); }
  const sel = $(act === 'move' ? 'actionState' : 'actionExpression');
  if (![...sel.options].some(o => o.value === value)) { notifyUser(`${who.selectedOptions[0].textContent} can't ${label.toLowerCase()}. Pick another character in the Shot tab.`); showPanel('shot'); return; }
  sel.value = value; $('applyAction').click(); showPanel('shot');
}

function guideCopy(value) {
  const done = () => notifyUser(`Copied “${value}”. Paste it into the script (Story › Edit the script).`);
  try { navigator.clipboard.writeText(value).then(done, () => notifyUser(`Use “${value}” in the script.`)); } catch (e) { notifyUser(`Use “${value}” in the script.`); }
}
