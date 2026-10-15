// Studio interface shell (Step 11): the four side tabs (Story, Shot, Guide, More), light/dark theme, the phone bottom
// sheet, the film's loading bar, the camera and movement picture buttons that mirror the shot's hidden selects, and
// collapsible fieldsets. initUIShell runs first thing in initializeWorkshop (before the people models load);
// finishUIShell runs at the end, once every panel (including the ones other files inject) exists.
const UI_THEME_KEY = 'frame-studio-theme', UI_PHONE = matchMedia('(max-width: 760px)');
const UI_PANELS = ['story', 'shot', 'guide', 'more'];
// camera presets and moves as people say them (unknown values fall back to their own name)
const UI_CAMERAS = { aerial: ['Aerial', 'i-aerial'], ground: ['Ground', 'i-ground'], closeup: ['Close-up', 'i-closeup'], rooftop: ['Rooftop', 'i-roof'], pov: ['Eyes of', 'i-eyes'], over_shoulder: ['Over shoulder', 'i-shoulder'], orbit: ['Circle', 'i-orbit'], window: ['Window', 'i-window'], waterline: ['Waterline', 'i-water'] };
const UI_MOVES = { push: ['Push in', 'i-push'], pull: ['Pull out', 'i-pull'], crane: ['Rise', 'i-crane'], track: ['Follow', 'i-track'], orbit: ['Circle', 'i-orbit'] };
const uiIcon = id => `<svg class="i"><use href="#${id}"/></svg>`;

function initUIShell() {
  $('themeToggle').onclick = toggleTheme;
  for (const b of $all('.paneltabs button')) b.onclick = () => {
    const key = b.dataset.panel;
    if (UI_PHONE.matches && document.body.classList.contains('sheet-open') && activePanel() === key) closeSheet();
    else showPanel(key, true);
  };
  $('sheetScrim').onclick = closeSheet;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('sheet-open')) closeSheet(); });
  UI_PHONE.addEventListener('change', () => { if (!UI_PHONE.matches) closeSheet(); });
  initSheetDrag();
  $('storyCreature').onclick = () => { closeSheet(); loadMarketDemo(true); };
  $('storyMarket').onclick = () => { closeSheet(); loadMarketDemo(false); };
  for (const id of ['bq', 'bz', 'newScenario', 'loadWorldDemo']) $(id).addEventListener('click', closeSheet);
  $('guidesToggle').onclick = () => $('showSafe').click();
  castProgress(0, 1);
}

// Boot finished: picture buttons, collapsible fieldsets, the Guide, and the loading bar goes away.
function finishUIShell() {
  buildChoiceMirror('shotPreset', UI_CAMERAS, 'grid');
  buildChoiceMirror('shotMove', UI_MOVES, 'chips');
  for (const f of $all('#panel-shot fieldset, #panel-more fieldset')) foldFieldset(f, f.closest('#panel-shot') && f.querySelector('#actionTarget'));
  syncChoiceMirrors();
  renderShotTicks();
  initGuide();
  $('loadOverlay').classList.add('done');
  setTimeout(() => $('loadOverlay').hidden = true, 320);
}

// The people models' download (loadCast) reports each file here.
function castProgress(done, total) {
  const bar = $('loadBar'), text = $('loadText'); if (!bar) return;
  bar.style.transform = `scaleX(${total ? done / total : 0})`;
  text.textContent = done ? `${done} of ${total} files` : 'Loading people…';
}

function activePanel() { return document.querySelector('.panel.active')?.id.replace('panel-', '') || 'story'; }
// Shows a side tab. open: a person tapped it, so on a phone the sheet slides up (code calls never pop the sheet).
function showPanel(key, open = false) {
  if (!UI_PANELS.includes(key)) key = 'story';
  for (const p of $all('.panel')) p.classList.toggle('active', p.id === 'panel-' + key);
  for (const b of $all('.paneltabs button')) { const on = b.dataset.panel === key; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }
  document.querySelector('.paneltabs .pill').style.transform = `translateX(${UI_PANELS.indexOf(key) * 100}%)`;
  if (key === 'guide') renderGuide(true);
  if (open && UI_PHONE.matches) document.body.classList.add('sheet-open');
}
function closeSheet() { document.body.classList.remove('sheet-open'); }
// Opens one section of the More tab (look, audio, library, model, export) and brings it into view.
function openMoreSection(key) {
  const d = document.querySelector(`.more-sec[data-sec="${key}"]`); if (!d) return;
  d.open = true; requestAnimationFrame(() => d.scrollIntoView({ block: 'nearest' }));
}

function toggleTheme() {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem(UI_THEME_KEY, document.documentElement.dataset.theme); } catch (e) { }
}

// Phone sheet: drag the handle down to close; a quick flick is enough.
function initSheetDrag() {
  const el = document.querySelector('.panels'); let y0 = 0, t0 = 0, dy = 0, drag = false;
  el.addEventListener('pointerdown', e => {
    if (!UI_PHONE.matches || e.clientY - el.getBoundingClientRect().top > 30 || drag) return;
    drag = true; y0 = e.clientY; t0 = performance.now(); dy = 0; el.setPointerCapture(e.pointerId); el.classList.add('dragging');
  });
  el.addEventListener('pointermove', e => { if (!drag) return; dy = Math.max(0, e.clientY - y0); el.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (!drag) return; drag = false; el.classList.remove('dragging'); el.style.transform = '';
    if (dy > 120 || dy / (performance.now() - t0) > .5) closeSheet();
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}

// Picture buttons for a select that other code fills and reads (the select stays the source of truth).
function buildChoiceMirror(selectId, names, kind) {
  const sel = $(selectId), box = document.querySelector(`[data-for="${selectId}"]`); if (!sel || !box) return;
  box.className = kind === 'grid' ? 'choice-grid' : 'choice-chips'; box.replaceChildren();
  for (const o of sel.options) {
    const [label, icon] = names[o.value] || [o.textContent.replace(/_/g, ' '), 'i-camera'], b = document.createElement('button');
    b.type = 'button'; b.dataset.value = o.value; b.innerHTML = (kind === 'grid' || icon !== 'i-camera' ? uiIcon(icon) : '') + `<span>${label}</span>`;
    b.onclick = () => { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); syncChoiceMirrors(); };
    box.append(b);
  }
}
function syncChoiceMirrors() {
  for (const box of $all('[data-for]')) {
    const sel = $(box.dataset.for); if (!sel) continue;
    for (const b of box.children) { b.classList.toggle('on', b.dataset.value === sel.value); b.disabled = sel.disabled; }
  }
}

// A fieldset whose legend opens and closes it (open: start opened).
function foldFieldset(f, open) {
  const legend = f.querySelector(':scope > legend'); if (!legend || f.classList.contains('fold-set')) return;
  f.classList.add('fold-set'); f.classList.toggle('open', !!open);
  legend.tabIndex = 0; legend.setAttribute('role', 'button');
  const flip = () => f.classList.toggle('open');
  legend.onclick = flip; legend.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } };
}

// The eye button on the film bar mirrors Look › Safe-zone guides.
function syncGuidesToggle() { const on = $('showSafe').checked; $('guidesToggle').classList.toggle('on', on); $('guidesToggle').setAttribute('aria-pressed', on); $('guidesToggle').title = on ? 'Hide the safe-zone guides' : 'Show the safe-zone guides'; }

// Small marks on the scrubber where each shot starts.
function renderShotTicks() {
  const box = $('shotTicks'); if (!box) return; box.replaceChildren();
  if (!shots.length || !END) return;
  for (const s of shots.slice(1)) { const b = document.createElement('b'); b.style.left = (s.t0 / END * 100) + '%'; box.append(b); }
}
