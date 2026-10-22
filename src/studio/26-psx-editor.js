// PSX look editor (More › Look › PSX look): the shader viewer of fcidade's itch.io page, inside the studio. A live
// preview on the film frame or on the shader project's own demo scenes (the torch-lit corridor, the Kenney graveyard,
// a cube, sphere, torus, capsule, big wall and sprite), the "Try this" looks, every setting of PSX_PARAMS with its
// plain help, texture pickers (the project's pictures or "Your picture..."), the look as JSON (Code tab), and Reset /
// Copy code / Download / Apply to film, shot or the selected model. The preview has its own small renderer and uses
// the same material and screen code as the film (25-psx-shader.js), so what it shows is what the film renders.
const PSX_PRESETS = [
  // the six looks of the shader project (looks/*.tres) and the viewer's demos; a look sets only what it names
  // corridor: the look shows on the corridor, unless the preview is the film frame
  { name: 'PS1', scene: 'corridor', look: { fog_amount: .55 } },
  { name: 'Graveyard', scene: 'graveyard', look: { fog_amount: .55, fog_start: 3, fog_end: 28, fog_color: '#0d121f' } },
  { name: 'Horror fog', scene: 'corridor', look: { color_bits: 4, fog_amount: 1, fog_start: 2, fog_end: 15, grain: .04, screen_color_bits: 4, vignette: .5 } },
  { name: 'Clean (all off)', scene: 'corridor', look: { affine: 0, color_bits: 8, dither_amount: 0, screen_amount: 0, snap_strength: 0 } },
  { name: 'Crunchy 3-bit', scene: 'corridor', look: { color_bits: 3, fog_amount: .4, pixel_size: 4, screen_color_bits: 3, screen_pixel_size: 4 } },
  { name: 'Shaky', scene: 'corridor', look: { fog_amount: .3, jitter: 1 } },
  { name: 'N64', scene: 'corridor', look: { affine: 0, fog_amount: .3, pixel_size: 2, screen_pixel_size: 2, snap_strength: 0, texture_filter: 1 } },
  { name: 'Chrome', scene: 'sphere', look: { albedo_tex: 'checker', matcap_tex: 'chrome', matcap_amount: 1 } },
  { name: 'Glowing runes', scene: 'wall', look: { albedo_tex: 'stone', emission_tex: 'runes', emission_strength: 1.2, lit: .35 } },
  { name: 'Texture swimming', scene: 'wall', look: { albedo_tex: 'brick', affine_limit: 8 } },
  { name: 'Fence cutout', scene: 'wall', look: { albedo_tex: 'fence', cutout: .5, uv_scale: [4, 3] } },
  { name: 'Billboard', scene: 'sprite', look: { albedo_tex: 'fence', billboard: 1, cutout: .5 } },
];
const PSX_SCENES = [['film', 'Film frame'], ['corridor', 'Corridor'], ['graveyard', 'Graveyard'], ['cube', 'Cube'], ['sphere', 'Sphere'], ['torus', 'Torus'], ['capsule', 'Capsule'], ['wall', 'Big wall'], ['sprite', 'Sprite']];
const PSX_SCENE_BG = { corridor: '#080a0d', graveyard: '#0d121f' };
const PSX_ED = { built: false, open: false, scene: 'corridor', bg: '#080a0d', look: psxMerge(PSX_PRESETS[0].look), preset: 'PS1', tab: 'params', opener: null,
  renderer: null, target: null, screen: null, view: psxViewUniforms(), modelU: psxModelUniforms(), scenes: {}, subject: null, raf: 0, t0: 0, cam: { yaw: 0, pitch: 0, dist: 0 }, drag: null, filmQueued: false };

// ---------- entry point (More › Look) ----------
function initPsxEditor() {
  const pane = document.createElement('section'); pane.className = 'ws-section'; pane.id = 'psxLookSection';
  pane.innerHTML = '<h3>PSX look</h3><p class="hint">Wobbling vertices, swimming textures, 15-bit color and dither (a port of Francisco Cidade\'s PSX shader). Try the looks on the film or on demo scenes, then apply.</p><button id="openPsxEditor" class="wide"><svg class="i"><use href="#i-sliders"/></svg><span>Open the PSX look editor</span></button>';
  const look = document.querySelector('#inspector-look'); (look.firstElementChild ? look.firstElementChild.after(pane) : look.append(pane));
  $('openPsxEditor').onclick = () => openPsxEditor();
}
function openPsxEditor(scene) {
  if (recording) return;
  if (!PSX_ED.built) psxEdBuild();
  PSX_ED.opener = document.activeElement; PSX_ED.open = true;
  // start from the film's look (or the selected shot's), so Apply keeps what is there
  const shot = shots[selectedShot];
  if (CINEMA.psx || shot?.cinema?.psx) { PSX_ED.look = psxMerge(CINEMA.psx, shot?.cinema?.psx); PSX_ED.preset = ''; }
  $('psxEditor').hidden = false; requestAnimationFrame(() => $('psxEditor').classList.add('in'));
  psxEdSyncControls(); psxEdSetScene(scene || PSX_ED.scene); psxEdRefreshApply();
  $('psxEditor').focus({ preventScroll: true });  // the dialog itself, so no button wears a focus ring on open
}
function closePsxEditor() {
  if (!PSX_ED.open) return;
  PSX_ED.open = false; cancelAnimationFrame(PSX_ED.raf); $('psxEditor').classList.remove('in'); $('psxEditor').hidden = true;
  if (psxFilmDraft) { psxFilmDraft = null; if (sceneReady && !seeking) renderCurrent(); }
  PSX_ED.opener?.focus?.();
}

// ---------- the dialog ----------
function psxEdBuild() {
  const el = document.createElement('div'); el.id = 'psxEditor'; el.className = 'psx-ed'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'psxEdTitle'); el.tabIndex = -1;
  el.innerHTML = `<div class="psx-ed__stage" id="psxEdStage"><canvas id="psxEdCanvas" aria-label="PSX preview"></canvas><canvas id="psxEdFilm" aria-label="Film frame with the PSX look" hidden></canvas>
    <p class="psx-ed__hint" id="psxEdHint">drag: turn the camera · scroll: closer / farther · double-click: reset</p><p class="psx-ed__loading" id="psxEdLoading" hidden>Loading…</p></div>
   <aside class="psx-ed__panel">
    <header class="psx-ed__head"><h2 id="psxEdTitle">PSX look</h2><span class="muted">Shader viewer</span><button class="iconbtn" id="psxEdClose" aria-label="Close the PSX look editor"><svg class="i"><use href="#i-close"/></svg></button></header>
    <div class="psx-ed__top">
     <div class="psx-ed__scene"><select id="psxEdScene" aria-label="Preview scene">${PSX_SCENES.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select><input type="color" id="psxEdBg" aria-label="Background color" value="${PSX_ED.bg}"></div>
     <h3 class="psx-ed__label" id="psxEdTry">Try this</h3><div class="psx-ed__presets" role="group" aria-labelledby="psxEdTry" id="psxEdPresets">${PSX_PRESETS.map((p, i) => `<button data-preset="${i}" aria-pressed="false">${p.name}</button>`).join('')}</div>
     <div class="segmented psx-ed__tabs" role="tablist"><button role="tab" id="psxEdTabParams" aria-controls="psxEdParams" aria-selected="true" class="active"><svg class="i"><use href="#i-sliders"/></svg>Parameters</button><button role="tab" id="psxEdTabCode" aria-controls="psxEdCode" aria-selected="false"><svg class="i"><use href="#i-code"/></svg>Code</button></div>
    </div>
    <div class="psx-ed__body" id="psxEdParams" role="tabpanel" aria-labelledby="psxEdTabParams"></div>
    <div class="psx-ed__body psx-ed__code" id="psxEdCode" role="tabpanel" aria-labelledby="psxEdTabCode" hidden>
     <p class="hint">The look as JSON: only what differs from the defaults. Edit it and apply, or paste one from Copy code.</p>
     <textarea id="psxEdCodeText" spellcheck="false" aria-label="PSX look as JSON"></textarea><p class="psx-ed__err" id="psxEdCodeErr" role="alert"></p>
     <button id="psxEdCodeApply" class="wide">Apply code</button>
    </div>
    <footer class="psx-ed__foot">
     <div class="row"><button id="psxEdReset"><svg class="i"><use href="#i-reset"/></svg>Reset</button><button id="psxEdCopy"><svg class="i"><use href="#i-copy"/></svg>Copy code</button><button id="psxEdDownload"><svg class="i"><use href="#i-download"/></svg>Download</button></div>
     <div class="row"><button id="psxEdApplyFilm" class="primary">Apply to film</button><button id="psxEdApplyShot">Apply to shot</button><button id="psxEdApplyModel" hidden>Apply to model</button></div>
    </footer>
   </aside>`;
  document.body.append(el);
  psxEdBuildParams();
  $('psxEdClose').onclick = closePsxEditor;
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); closePsxEditor(); } else if (e.key === 'Tab') psxEdTrapFocus(e); });
  $('psxEdScene').onchange = e => psxEdSetScene(e.target.value);
  $('psxEdBg').oninput = e => { PSX_ED.bg = e.target.value; };
  $('psxEdPresets').onclick = e => { const b = e.target.closest('[data-preset]'); if (b) psxEdPreset(PSX_PRESETS[+b.dataset.preset]); };
  $('psxEdTabParams').onclick = () => psxEdTab('params'); $('psxEdTabCode').onclick = () => psxEdTab('code');
  $('psxEdCodeApply').onclick = psxEdApplyCode;
  $('psxEdReset').onclick = () => { PSX_ED.look = psxDefaults(); PSX_ED.preset = ''; psxEdSyncControls(); psxEdChanged(); };
  $('psxEdCopy').onclick = psxEdCopy; $('psxEdDownload').onclick = psxEdDownload;
  $('psxEdApplyFilm').onclick = () => psxEdApply('film'); $('psxEdApplyShot').onclick = () => psxEdApply('shot'); $('psxEdApplyModel').onclick = () => psxEdApply('model');
  // camera: drag turns, scroll moves closer or farther, double-click resets
  const cv = $('psxEdCanvas');
  cv.addEventListener('pointerdown', e => { if (PSX_ED.drag) return; PSX_ED.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw: PSX_ED.cam.yaw, pitch: PSX_ED.cam.pitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { const d = PSX_ED.drag; if (!d || d.id !== e.pointerId) return; PSX_ED.cam.yaw = d.yaw - (e.clientX - d.x) * .006; PSX_ED.cam.pitch = cl(d.pitch - (e.clientY - d.y) * .005, -1.2, 1.2); });
  const end = e => { if (PSX_ED.drag?.id === e.pointerId) PSX_ED.drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); PSX_ED.cam.dist = cl(PSX_ED.cam.dist + e.deltaY * .003, -3, 6); }, { passive: false });
  cv.addEventListener('dblclick', () => { PSX_ED.cam = { yaw: 0, pitch: 0, dist: 0 }; });
  new ResizeObserver(() => { if (PSX_ED.open) psxEdResize(); }).observe($('psxEdStage'));
  PSX_ED.built = true;
}
function psxEdTrapFocus(e) {
  const f = [...$('psxEditor').querySelectorAll('button,select,input,textarea,summary,[tabindex="0"]')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return; const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function psxEdTab(tab) {
  PSX_ED.tab = tab; const code = tab === 'code';
  $('psxEdParams').hidden = code; $('psxEdCode').hidden = !code;
  $('psxEdTabParams').classList.toggle('active', !code); $('psxEdTabCode').classList.toggle('active', code);
  $('psxEdTabParams').setAttribute('aria-selected', String(!code)); $('psxEdTabCode').setAttribute('aria-selected', String(code));
  if (code) { $('psxEdCodeText').value = JSON.stringify(psxCompact(PSX_ED.look), null, 2); $('psxEdCodeErr').textContent = ''; }
}
// one row per setting: its name, where it applies, its plain help and the control
function psxEdBuildParams() {
  const scopeName = { film: 'film', screen: 'screen', model: 'model' };
  const tex = (key, set) => {
    const p = PSX_PARAM.get(key), names = PSX_TEXTURE_SETS[set], url = n => 'assets/' + (CAST.manifest?.psxLook?.textures?.[n] || '');
    return `<div class="psx-tiles" role="group" aria-label="${key}"><button data-tex="" aria-pressed="false" class="psx-tile-none" title="${set === 'albedo' ? 'The model\'s own picture' : 'None'}">${set === 'albedo' ? 'Own' : 'None'}</button>${names.map(n => `<button data-tex="${n}" aria-pressed="false" title="${n}"><img src="${url(n)}" alt="${n}" loading="lazy"></button>`).join('')}<button data-tex="custom" class="psx-tile-text" aria-pressed="false">Your picture…</button><input type="file" accept="image/png,image/jpeg,image/webp" hidden data-file="${p.key}"></div>`;
  };
  const control = p => {
    if (p.type === 'range' || p.type === 'int') return `<div class="psx-p__slider"><input type="range" id="psxP-${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" aria-label="${p.key}"><input type="number" class="psx-p__num" min="${p.min}" max="${p.max}" step="${p.step}" aria-label="${p.key} value" data-num="${p.key}"></div>`;
    if (p.type === 'enum') return `<div class="segmented psx-p__enum" role="radiogroup" aria-label="${p.key}">${p.options.map((o, i) => `<button role="radio" data-enum="${i}" aria-checked="false">${o}</button>`).join('')}</div>`;
    if (p.type === 'color') return `<div class="psx-p__color"><input type="color" id="psxP-${p.key}" aria-label="${p.key}"><span class="mono" data-hex></span></div>`;
    if (p.type === 'vec2') return `<div class="psx-p__vec"><label>x<input type="number" step="${p.step}" min="${p.min}" max="${p.max}" data-vec="0" aria-label="${p.key} x"></label><label>y<input type="number" step="${p.step}" min="${p.min}" max="${p.max}" data-vec="1" aria-label="${p.key} y"></label></div>`;
    return tex(p.key, p.set);
  };
  $('psxEdParams').innerHTML = PSX_GROUPS.map(([g, title], gi) => {
    const items = PSX_PARAMS.filter(p => p.group === g);
    return `<details class="psx-g" ${gi < 2 || g === 'screen' ? 'open' : ''}><summary><svg class="i"><use href="#i-down"/></svg>${title}<span class="psx-g__note" data-scope-note="${g}"></span></summary>${items.map(p => `<div class="psx-p" data-key="${p.key}" data-scope="${p.scope}">
      <div class="psx-p__head"><code>${p.key}</code><span class="psx-p__scope" title="${p.scope === 'model' ? 'Applies to one model: Apply to model, or the object scenes' : 'Applies to the whole film or a shot'}">${scopeName[p.scope]}</span></div>
      <p class="psx-p__help">${p.help}</p>${control(p)}</div>`).join('')}</details>`;
  }).join('');
  const root = $('psxEdParams');
  root.addEventListener('input', e => {
    const row = e.target.closest('.psx-p'); if (!row) return; const key = row.dataset.key, p = PSX_PARAM.get(key);
    if (e.target.type === 'range') psxEdSet(key, p.type === 'int' ? Math.round(+e.target.value) : +e.target.value);
    else if (e.target.dataset.num !== undefined) { const v = +e.target.value; if (e.target.value !== '' && Number.isFinite(v)) psxEdSet(key, cl(p.type === 'int' ? Math.round(v) : v, p.min, p.max), e.target); }
    else if (e.target.type === 'color') psxEdSet(key, e.target.value);
    else if (e.target.dataset.vec !== undefined) { const v = [...PSX_ED.look[key]]; const n = +e.target.value; if (e.target.value !== '' && Number.isFinite(n)) { v[+e.target.dataset.vec] = cl(n, p.min, p.max); psxEdSet(key, v, e.target); } }
  });
  root.addEventListener('click', e => {
    const row = e.target.closest('.psx-p'); if (!row) return; const key = row.dataset.key;
    const en = e.target.closest('[data-enum]'); if (en) psxEdSet(key, +en.dataset.enum);
    const t = e.target.closest('[data-tex]'); if (t) { if (t.dataset.tex === 'custom') row.querySelector('[data-file]').click(); else psxEdSet(key, t.dataset.tex); }
  });
  root.addEventListener('change', e => { const f = e.target.dataset.file !== undefined && e.target.files[0]; if (f) psxEdPicture(e.target.dataset.file, f); e.target.value = ''; });
}
// "Your picture...": shrunk to at most 128 px (a console-sized texture that fits in the script) as a PNG data URL
function psxEdPicture(key, file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 128 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    psxEdSet(key, c.toDataURL('image/png'));
  };
  img.onerror = () => { URL.revokeObjectURL(url); notifyUser('That picture could not be read. Try a PNG or JPEG.'); };
  img.src = url;
}
function psxEdSet(key, value, from) {
  PSX_ED.look[key] = value;
  // the viewer keeps the screen's pixel size with the material's
  if (key === 'pixel_size') PSX_ED.look.screen_pixel_size = value;
  PSX_ED.preset = ''; psxEdSyncControls(from); psxEdChanged();
}
function psxEdPreset(preset) {
  PSX_ED.look = psxMerge(preset.look); PSX_ED.preset = preset.name;
  if (preset.scene && PSX_ED.scene !== preset.scene && !(preset.scene === 'corridor' && PSX_ED.scene === 'film')) psxEdSetScene(preset.scene);
  psxEdSyncControls(); psxEdChanged();
}
// every control shows the look; `from` (the field being typed in) is left alone
function psxEdSyncControls(from) {
  const L = PSX_ED.look;
  for (const row of $('psxEdParams').querySelectorAll('.psx-p')) {
    const p = PSX_PARAM.get(row.dataset.key), v = L[p.key];
    if (p.type === 'range' || p.type === 'int') { const r = row.querySelector('input[type=range]'), n = row.querySelector('[data-num]'); r.value = v; if (n !== from) n.value = +(+v).toFixed(3); }
    else if (p.type === 'enum') row.querySelectorAll('[data-enum]').forEach(b => { const on = +b.dataset.enum === v; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
    else if (p.type === 'color') { row.querySelector('input[type=color]').value = v; row.querySelector('[data-hex]').textContent = v; }
    else if (p.type === 'vec2') row.querySelectorAll('[data-vec]').forEach(i => { if (i !== from) i.value = v[+i.dataset.vec]; });
    else row.querySelectorAll('[data-tex]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tex === 'custom' ? v.startsWith('data:') : b.dataset.tex === v)));
  }
  $('psxEdPresets').querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', String(PSX_PRESETS[+b.dataset.preset].name === PSX_ED.preset)));
  if (PSX_ED.tab === 'code' && document.activeElement !== $('psxEdCodeText')) $('psxEdCodeText').value = JSON.stringify(psxCompact(L), null, 2);
}
// the look changed: the object scene's subject, and the film frame when that is the preview
function psxEdChanged() {
  psxSetModelUniforms(PSX_ED.modelU, PSX_ED.look);
  if (PSX_ED.subject) { const t = psxLookTexture(PSX_ED.look.albedo_tex || 'brick'); for (const m of PSX_ED.subject.materials) if (m.map !== t) { const had = !!m.map; m.map = t; if (!had) m.needsUpdate = true; } }
  if (PSX_ED.scene === 'film') psxEdQueueFilm();
}
function psxEdApplyCode() {
  const errs = []; let obj;
  try { obj = JSON.parse($('psxEdCodeText').value || '{}'); } catch (e) { $('psxEdCodeErr').textContent = 'This is not valid JSON: ' + e.message; return; }
  validatePsxLook(obj, ['film', 'screen', 'model'], m => errs.push(m), 'look');
  if (errs.length) { $('psxEdCodeErr').textContent = errs.slice(0, 3).join(' · '); return; }
  $('psxEdCodeErr').textContent = ''; PSX_ED.look = psxMerge(obj); PSX_ED.preset = ''; psxEdSyncControls($('psxEdCodeText')); psxEdChanged();
  notifyUser('Code applied to the preview.');
}
const psxEdJson = () => JSON.stringify(psxCompact(PSX_ED.look), null, 2) + '\n';
async function psxEdCopy() {
  try { await navigator.clipboard.writeText(psxEdJson()); notifyUser('PSX look copied. Paste it into the Code tab or a script\'s cinema.psx.'); }
  catch { psxEdTab('code'); $('psxEdCodeText').select(); notifyUser('Copy was blocked: the look is selected in the Code tab, press Ctrl+C.'); }
}
function psxEdDownload() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([psxEdJson()], { type: 'application/json' })); a.download = 'psx-look.json';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// Apply: the film look (cinema.psx), the selected shot (only what differs from the film look) or the selected placed
// model (assets[].psx, its model settings). The finish becomes PSX where it is applied.
function psxEdApply(where) {
  if (recording) return;
  cancelSeek();  // the story is rebuilt below; a seek still running (people loading) must not swallow the click
  try {
    const j = parse(), L = PSX_ED.look;
    if (where === 'film') { const look = psxCompact(L, ['film', 'screen']); j.cinema = { ...(j.cinema || {}), material: 'psx', psx: look }; if (!Object.keys(look).length) delete j.cinema.psx; }
    else if (where === 'shot') {
      const s = j.chapters.flatMap(c => c.shots)[selectedShot], base = psxMerge(j.cinema?.psx), look = {};
      for (const p of PSX_PARAMS) if (p.scope !== 'model' && JSON.stringify(L[p.key]) !== JSON.stringify(base[p.key])) look[p.key] = L[p.key];
      s.cinema = { ...(s.cinema || {}), material: 'psx', psx: look }; if (!Object.keys(look).length) delete s.cinema.psx;
    } else {
      const id = psxEdSelectedModel(), spec = (j.assets || []).find(a => a.instance_id === id); if (!spec) { notifyUser('Select a placed model first.'); return; }
      const look = psxCompact(L, ['model']); if (Object.keys(look).length) spec.psx = look; else delete spec.psx;
    }
    $('ta').value = JSON.stringify(j, null, 2);
    if (validateOnly()) { if (where === 'shot') selectShot(selectedShot, true); notifyUser(where === 'film' ? 'PSX look applied to the film.' : where === 'shot' ? `PSX look applied to shot ${selectedShot + 1}.` : 'PSX look applied to the model.'); autosave(); }
    if (PSX_ED.scene === 'film') psxEdQueueFilm();
  } catch (e) { notifyUser(e.message); }
}
function psxEdSelectedModel() { const a = typeof currentAsset === 'function' && currentAsset(); return a?.object?.userData?.instanceId || null; }
function psxEdRefreshApply() {
  $('psxEdApplyShot').textContent = `Apply to shot ${selectedShot + 1}`;
  const id = psxEdSelectedModel(), b = $('psxEdApplyModel'); b.hidden = !id; if (id) b.textContent = `Apply to ${(SC?.assets || []).find(a => a.instance_id === id)?.name || id}`;
}

// ---------- preview ----------
function psxEdSetScene(name) {
  PSX_ED.scene = name; $('psxEdScene').value = name;
  const film = name === 'film'; $('psxEdCanvas').hidden = film; $('psxEdFilm').hidden = !film;
  $('psxEdHint').textContent = film ? 'the current film frame · move the film to another moment to see it there' : 'drag: turn the camera · scroll: closer / farther · double-click: reset';
  // model settings only reach the object scenes' subject and a placed model (Apply to model)
  const objectScene = !film && name !== 'graveyard';
  $('psxEdParams').classList.toggle('psx-ed--film', !objectScene);
  for (const n of $('psxEdParams').querySelectorAll('[data-scope-note]')) n.textContent = !objectScene && PSX_PARAMS.some(p => p.group === n.dataset.scopeNote && p.scope === 'model') ? 'model settings: object scenes, Apply to model' : '';
  if (PSX_SCENE_BG[name]) { PSX_ED.bg = PSX_SCENE_BG[name]; $('psxEdBg').value = PSX_ED.bg; } else if (!film && (PSX_ED.bg === PSX_SCENE_BG.corridor || PSX_ED.bg === PSX_SCENE_BG.graveyard)) { PSX_ED.bg = '#08090b'; $('psxEdBg').value = PSX_ED.bg; }
  cancelAnimationFrame(PSX_ED.raf);
  if (film) { psxFilmDraft = PSX_ED.look; psxEdQueueFilm(); return; }
  if (psxFilmDraft) { psxFilmDraft = null; if (sceneReady && !seeking) renderCurrent(); }
  psxEdEnsureRenderer(); psxEdResize(); PSX_ED.cam = { yaw: 0, pitch: 0, dist: 0 };
  const built = PSX_ED.scenes[name] || (PSX_ED.scenes[name] = psxEdBuildScene(name));
  PSX_ED.subject = built.subject || null; psxEdChanged();
  PSX_ED.t0 = performance.now(); PSX_ED.raf = requestAnimationFrame(psxEdLoop);
}
// the film frame: rendered by the film itself with the draft look, then copied (letterboxed) into the preview
function psxEdQueueFilm() {
  if (PSX_ED.filmQueued) return; PSX_ED.filmQueued = true;
  requestAnimationFrame(() => {
    PSX_ED.filmQueued = false; if (!PSX_ED.open || PSX_ED.scene !== 'film') return;
    psxFilmDraft = PSX_ED.look; if (!sceneReady || seeking) return;
    renderCurrent();
    const out = $('psxEdFilm'), r = $('psxEdStage').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    out.width = Math.round(r.width * dpr); out.height = Math.round(r.height * dpr);
    const g = out.getContext('2d'), k = Math.min(out.width / canvas.width, out.height / canvas.height), w = canvas.width * k, h = canvas.height * k;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, out.width, out.height); g.imageSmoothingEnabled = false; g.drawImage(canvas, (out.width - w) / 2, (out.height - h) / 2, w, h);
  });
}
function psxEdEnsureRenderer() {
  if (PSX_ED.renderer) return;
  const r = new THREE.WebGLRenderer({ canvas: $('psxEdCanvas'), antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.toneMapping = THREE.NoToneMapping; r.outputEncoding = THREE.sRGBEncoding;
  const target = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true }); target.texture.encoding = THREE.sRGBEncoding;
  const uniforms = { colorMap: { value: target.texture }, resolution: { value: new THREE.Vector2(1, 1) }, ...psxScreenUniforms() };
  const mat = new THREE.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false, toneMapped: false, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `precision highp float;varying vec2 vUv;uniform sampler2D colorMap;uniform vec2 resolution;${PSX_SCREEN_GLSL}
void main(){vec2 cuv=psxScreenUv(vUv,resolution);vec3 c=texture2D(colorMap,cuv).rgb,o=texture2D(colorMap,vUv).rgb;gl_FragColor=vec4(clamp(mix(o,psxScreenColor(c,vUv,resolution),psxScreenAmount),0.,1.),1.);}` });
  const screen = new THREE.Scene(); screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  Object.assign(PSX_ED, { renderer: r, target, screen: { scene: screen, camera: new THREE.Camera(), uniforms } });
}
function psxEdResize() {
  if (!PSX_ED.renderer) return; const r = $('psxEdStage').getBoundingClientRect(); if (!r.width || !r.height) return;
  PSX_ED.renderer.setSize(r.width, r.height, false); const s = PSX_ED.renderer.getDrawingBufferSize(new THREE.Vector2());
  PSX_ED.target.setSize(s.x, s.y); PSX_ED.screen.uniforms.resolution.value.copy(s);
  for (const sc of Object.values(PSX_ED.scenes)) { sc.camera.aspect = r.width / r.height; sc.camera.updateProjectionMatrix(); }
}
function psxEdLoop(now) {
  if (!PSX_ED.open || PSX_ED.scene === 'film') return;
  PSX_ED.raf = requestAnimationFrame(psxEdLoop);
  if (document.hidden) return;
  const sc = PSX_ED.scenes[PSX_ED.scene], t = (now - PSX_ED.t0) / 1000, r = PSX_ED.renderer, size = PSX_ED.screen.uniforms.resolution.value;
  $('psxEdLoading').hidden = !sc.loading;
  sc.update(t); if (sc.bg !== PSX_ED.bg) { sc.bg = PSX_ED.bg; sc.scene.background = new THREE.Color(PSX_ED.bg); }  // the clear colour is stored as it is (no sRGB conversion)
  psxSetViewUniforms(PSX_ED.view, PSX_ED.look, size.x, size.y, 960, t); psxSetScreenUniforms(PSX_ED.screen.uniforms, PSX_ED.look, size.x, 960, t);
  r.setRenderTarget(PSX_ED.target); r.render(sc.scene, sc.camera); r.setRenderTarget(null); r.render(PSX_ED.screen.scene, PSX_ED.screen.camera);
}

// ---------- demo scenes ----------
const psxEdLin = rgb => new THREE.Color(...rgb).convertSRGBToLinear();
// A demo material: the engine's matte standard material with the PSX injection of the preview's view. look: the
// object's own model settings as authored in the shader project (or the live subject uniforms).
function psxEdMaterial(tex, look, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ map: Array.isArray(tex) ? psxLookTexture(...tex) : psxLookTexture(tex), roughness: 1, metalness: 0, vertexColors: !!opts.vc, side: opts.side || THREE.FrontSide });
  m.onBeforeCompile = function (shader) { psxInjectShader(shader, this, PSX_ED.view); }; m.customProgramCacheKey = () => 'psx';
  PSX_MAT.set(m, opts.uniforms || psxModelUniforms(look)); return m;
}
// a flat grid with tiled UVs (one texture per `tile` metres), placed by a matrix; light(p): painted vertex light
function psxEdPanel(w, h, tile, matrix, light) {
  const g = new THREE.PlaneGeometry(w, h, Math.max(1, Math.round(w / tile)), Math.max(1, Math.round(h / tile))); g.applyMatrix4(matrix);
  const pos = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(pos.count * 3), p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i); uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); if (light) { const c = light(p); col.set([c.r, c.g, c.b], i * 3); } }
  if (light) g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function psxEdBuildScene(name) {
  const scene = new THREE.Scene(), r = $('psxEdStage').getBoundingClientRect(), camera = new THREE.PerspectiveCamera(70, (r.width || 4) / (r.height || 3), .05, 200);
  const sc = { scene, camera, update: () => {}, loading: false };
  if (name === 'corridor') psxEdCorridor(sc); else if (name === 'graveyard') psxEdGraveyard(sc); else psxEdObject(sc, name);
  return sc;
}
// the shader project's demo walk: down the hall and back to the start every 30 m, with a little sway
function psxEdWalk(sc, t) {
  const u = t * .35, c = PSX_ED.cam, cam = sc.camera;
  cam.position.set(Math.sin(u * 1.7) * .6, 1.55 + Math.sin(u * 6) * .04, -(((u * 4) % 30 + 30) % 30) + 2);
  cam.rotation.set(Math.sin(u * 2.3) * .03 + c.pitch, Math.sin(u * 1.1) * .14 + c.yaw, Math.sin(u * 1.7) * .02, 'YXZ');
  if (c.dist) cam.translateZ(c.dist);
}
// The viewer's corridor (after main.tscn): a 5 x 3.6 m hall, 44 m long, with a crate and a ball. As in the viewer,
// every surface uses the look's texture and model settings, lit by four flickering torches and the hall's ambient.
function psxEdCorridor(sc) {
  const { scene } = sc, mat = psxEdMaterial('brick', null, { uniforms: PSX_ED.modelU }); sc.subject = { materials: [mat] };
  const M = (rx, ry, x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(1, 1, 1));
  const add = geo => { const m = new THREE.Mesh(geo, mat); scene.add(m); return m; };
  add(psxEdPanel(44, 3.6, 2.4, M(0, Math.PI / 2, -2.5, 1.8, -20)));
  add(psxEdPanel(44, 3.6, 2.4, M(0, -Math.PI / 2, 2.5, 1.8, -20)));
  add(psxEdPanel(5, 44, 2.4, M(-Math.PI / 2, 0, 0, 0, -20)));
  add(psxEdPanel(5, 44, 2.4, M(Math.PI / 2, 0, 0, 3.6, -20)));
  add(psxEdPanel(5, 3.6, 2.4, M(0, 0, 0, 1.8, -42)));
  for (const [x, z, a] of [[.95, -4.6, 20], [-1.3, -11, 40], [1.2, -16, -15]]) { const m = add(new THREE.BoxGeometry(.9, .9, .9)); m.position.set(x, .45, z); m.rotation.y = THREE.MathUtils.degToRad(a); }
  add(new THREE.SphereGeometry(.45, 12, 6)).position.set(-.35, .45, -7.6);
  scene.add(new THREE.AmbientLight(new THREE.Color(.62, .64, .76), .36));
  const warm = psxEdLin([1, .66, .35]), lights = [[-1.7, 2, -5], [1.7, 2, -11], [-1.7, 2, -17], [1.7, 2, -23]].map(p => { const l = new THREE.PointLight(warm, 2, 9, 2); l.position.set(...p); scene.add(l); return l; });
  sc.update = t => { lights.forEach((l, i) => { l.intensity = 2 + Math.sin(t * 9 + i * 2) * .25 + Math.sin(t * 23 + i) * .15; }); psxEdWalk(sc, t); };
}
// graveyard.tscn (read by tools/build-psx-look.mjs): the Kenney Graveyard Kit models with their four material variants,
// three lamps and a fire in the crypt, a cold moon and the blue night ambient
function psxEdGraveyard(sc) {
  const { scene } = sc, P = CAST.manifest?.psxLook; sc.loading = true;
  sc.update = t => { (sc.lights || []).forEach((l, i) => { l.intensity = 2 + Math.sin(t * 9 + i * 2) * .25 + Math.sin(t * 23 + i) * .15; }); psxEdWalk(sc, t); };
  if (!P) { sc.loading = false; return; }
  fetch('assets/' + P.graveyard).then(r => r.json()).then(async data => {
    const warm = psxEdLin([1, .72, .4]), lamps = data.lamps.map(l => new THREE.Vector3(...l.pos));
    scene.add(new THREE.AmbientLight(psxEdLin(data.env.ambient), data.env.energy || 1));
    const moon = new THREE.DirectionalLight(psxEdLin(data.moon.color), data.moon.energy * 2.5), mm = new THREE.Matrix4().fromArray(data.moon.m);
    moon.position.set(mm.elements[8], mm.elements[9], mm.elements[10]); scene.add(moon, moon.target);
    sc.lights = data.lamps.map(l => { const p = new THREE.PointLight(psxEdLin(l.color), 2, l.range, 2); p.position.fromArray(l.pos); scene.add(p); return p; });
    // the ground's painted light (its lit is 0, as in the project): a strong blue night, which turns the grass teal as
    // in the shader project's ground mesh, with warm pools under the lamps
    const moonC = new THREE.Color(.95, 1.15, 4);
    const paint = p => { const c = moonC.clone(); for (const l of lamps) { const k = Math.max(0, 1 - p.distanceTo(l) / 9); c.add(warm.clone().multiplyScalar(k * k * 1.2)); } return c; };
    const ground = new THREE.Mesh(psxEdPanel(30, 64, 1.5, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0, data.ground ? data.ground.m[14] : -22), paint), psxEdMaterial('grass', { lit: 0 }, { vc: true }));
    scene.add(ground);
    const hex = rgb => '#' + new THREE.Color(...rgb).getHexString(), mats = {};
    for (const [k, v] of Object.entries(data.materials)) mats[k] = psxEdMaterial(['colormap', true], { albedo_color: hex(v.tint), lit: v.lit, glow: v.glow }, { side: THREE.DoubleSide });
    const manager = new THREE.LoadingManager(); manager.setURLModifier(u => /colormap\.png$/.test(u) ? 'assets/' + P.textures.colormap : u);
    const loader = new THREE.GLTFLoader(manager), models = {};
    await Promise.all([...new Set(data.instances.map(i => i.model))].map(n => new Promise(ok => loader.load('assets/' + P.kenney[n], g => { models[n] = g.scene; ok(); }, undefined, () => ok()))));
    for (const i of data.instances) {
      const src = models[i.model]; if (!src) continue; const o = src.clone(true);
      o.traverse(m => { if (m.isMesh) m.material = mats[i.material] || mats.kit; });
      o.matrixAutoUpdate = false; o.matrix.fromArray(i.m); scene.add(o);
    }
    sc.loading = false;
  }).catch(e => { console.warn('graveyard did not load', e); sc.loading = false; });
}
// the viewer's object scenes: one subject turning in front of the camera, with the editor's model settings
function psxEdObject(sc, name) {
  const { scene, camera } = sc, uniforms = PSX_ED.modelU, mat = psxEdMaterial('brick', null, { uniforms, side: name === 'sprite' || name === 'wall' ? THREE.DoubleSide : THREE.FrontSide });
  const profile = [new THREE.Vector2(0, -.9), ...Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + i / 6 * Math.PI / 2; return new THREE.Vector2(Math.cos(a) * .45, -.45 + Math.sin(a) * .45); }), ...Array.from({ length: 7 }, (_, i) => { const a = i / 6 * Math.PI / 2; return new THREE.Vector2(Math.cos(a) * .45, .45 + Math.sin(a) * .45); })];
  const geo = { cube: () => new THREE.BoxGeometry(1.3, 1.3, 1.3), sphere: () => new THREE.SphereGeometry(.85, 24, 16), torus: () => new THREE.TorusGeometry(.62, .26, 14, 32), capsule: () => new THREE.LatheGeometry(profile, 20), wall: () => new THREE.PlaneGeometry(2.4, 3.2), sprite: () => new THREE.PlaneGeometry(2.2, 2.2) }[name]();
  const subject = new THREE.Mesh(geo, mat); scene.add(subject);
  scene.add(new THREE.AmbientLight(0xffffff, .38)); const sun = new THREE.DirectionalLight(0xffffff, .95); sun.position.set(2, 3, 2.5); scene.add(sun, sun.target);
  sc.subject = { materials: [mat] };
  sc.update = t => {
    const c = PSX_ED.cam, orbit = name === 'sprite' ? t * .6 : 0, dist = (name === 'wall' ? 2.5 : 3.2) + c.dist;
    if (name === 'wall') subject.rotation.y = Math.sin(t * .7) * 1.05; else if (name !== 'sprite') { subject.rotation.y = t * .6; subject.rotation.x = name === 'sphere' ? 0 : .35; }
    const yaw = c.yaw + orbit, pitch = c.pitch + (name === 'wall' ? 0 : .12);
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(0, 0, 0);
  };
}
