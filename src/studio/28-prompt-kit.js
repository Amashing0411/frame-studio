// AI prompt kit (Story tab › "Use any AI, free"): one text a visitor pastes into any chat AI (ChatGPT, Gemini, Claude,
// a local model...) so it writes a script this engine can actually play: its rules, the script format, and every value
// the engine knows, read from the live engine (engineVocabulary), so a new model, camera or event appears without
// editing the kit. The site itself never calls an AI and has no AI bill; the visitor pastes the answer back with
// "Paste a script from any AI". tools/build-prompt-kit.mjs writes the same text to docs/PROMPT-KIT.md, and
// tools/extract-vocabulary.mjs exports engineVocabulary() for the skills.

// Every value a script may use, from the engine's own lists (and, where a list only exists inside a validator, from
// that validator's source).
function engineVocabulary() {
  const lists = fn => (String(fn).match(/\[('[a-z_]+',?)+\]/g) || []).map(s => s.slice(1, -1).split(',').map(x => x.slice(1, -1)));
  const quoted = (fn, re) => [...new Set([...String(fn).matchAll(re)].map(m => m[1]))];
  const tod = String(setTOD), rx = name => (tod.match(new RegExp(name + '=\\/([^/]+)\\/i')) || [])[1];
  const water = quoted(validateWaterHazard, /h==='(\w+)'/g);
  const groups = new Map();
  for (const a of CATALOG_BASE) {
    const key = [a.category, a.states.join(' '), (a.expressions || []).join(' ')].join('|');
    if (!groups.has(key)) groups.set(key, { category: a.category, kind: a.kind, states: a.states, expressions: a.expressions || [], ids: [], names: [] });
    const g = groups.get(key); g.ids.push(a.id); g.names.push(a.name);
  }
  return {
    hazards: ['none', ...Object.keys(KL), ...water],
    presets: PRE, moves: MOV, events: EVT, crowd: CRW, emotions: EMOS, zombies: ZMB,
    biomes: lists(validateCatalogScenario).find(l => l.includes('city') && l.includes('coast')),
    finishes: quoted(validateFinish, /'(\w+)'/g).filter(x => x !== 'toy' ? x === 'classic' : true),
    cinema: { material: FILM_FINISHES, grade: lists(validateCinemaAndMoments)[0], ranges: cinemaRanges },
    psx: PSX_PARAMS.map(p => ({ key: p.key, scope: p.scope, group: p.group, type: p.type, default: p.def, ...(p.min !== undefined ? { min: p.min, max: p.max } : {}), ...(p.options ? { options: p.options } : {}), ...(p.set ? { textures: PSX_TEXTURE_SETS[p.set] } : {}), help: p.help })),
    psx_looks: Object.fromEntries(PSX_PRESETS.map(p => [p.name, p.look])),
    dialogue_moods: ['friendly', ...quoted(String(updateTalkingFaces) + String(applyConversation), /d\.mood==='(\w+)'/g)],
    shaders: [...document.getElementById('catalogShader').options].map(o => o.value),
    sfx_first_match_wins: soundTypes.map(([id, label, group, re]) => ({ id, label, group, match: re.source })),
    time_of_day: { night: rx('night'), golden: rx('gold'), day: 'anything else' },
    weather: { rain: rx('rainy'), storm_lightning: rx('storm'), fog: rx('fog'), grey_sky: (tod.match(/ov=rainy\|\|fog\|\|\/([^/]+)\/i/) || [])[1] },
    assets: { archetypes: CATALOG_BASE.length, variants_per_archetype: Math.round(catalogEntries.length / CATALOG_BASE.length), groups: [...groups.values()] },
  };
}

// A short film that passes "Check story": the format by example (a quake at the city's north-east plaza).
const PROMPT_KIT_EXAMPLE = {
  schema_version: 7,
  meta: { title: 'What if the ground shook at lunch?', city: 'Pasig', length_s: 18, disclaimer: 'Illustrative scenario. Not a prediction.' },
  world: { biome: 'city', style: 'city', seed: 'lunch-quake', time_of_day: 'noon', weather: 'clear' },
  hazard: { type: 'quake' },
  assets: [
    { instance_id: 'ana', asset_id: 'human.student.v04', name: 'Ana', position: [30, 0, 28], rotation: [0, -135, 0], state: 'phone', expression: 'neutral' },
    { instance_id: 'tito', asset_id: 'human.vendor.v02', name: 'Tito Ben', position: [31.2, 0, 26.6], rotation: [0, -45, 0], state: 'idle', expression: 'happy' },
  ],
  chapters: [{ id: 'quake', title: 'Lunch', shots: [
    { t0: 0, t1: 4, label: 'What if the ground shook at lunch?', caption: { type: 'narration', text: 'A normal lunch break.' }, cam: { preset: 'closeup', move: 'push', target_id: 'ana', target_height: 1.5, offset: [-0.8, 1.55, -0.7] }, events: [], sfx: ['crowd chatter', 'traffic'], behavior: { crowd: 'calm' }, actions: [] },
    { t0: 4, t1: 10, label: 'The shaking starts', caption: { type: 'narration', text: 'Drop, cover and hold on.' }, cam: { preset: 'ground', move: 'track', target: 'open plaza' }, events: ['quake_shake'], sfx: ['quake rumble'], behavior: { crowd: 'panic' }, actions: [{ target: 'ana', state: 'crouch', expression: 'fear' }, { target: 'tito', state: 'cower', expression: 'fear' }] },
    { t0: 10, t1: 18, label: 'Is everyone safe?', caption: { type: 'narration', text: 'They check on each other before moving.' }, cam: { preset: 'orbit', move: 'orbit', target_id: 'tito', target_height: 1.2, offset: [4, 2.5, 4] }, events: ['dust_cloud'], sfx: ['siren'], behavior: { crowd: 'help' }, actions: [{ target: 'ana', state: 'point', expression: 'determined' }, { target: 'tito', state: 'idle', expression: 'relief' }] },
  ] }],
  end_card: { text: 'Know where your open area is.', disclaimer: 'Illustrative scenario. Not a prediction.' },
};

// The kit itself (Markdown), built from the live vocabulary.
function promptKit() {
  const v = engineVocabulary(), list = a => a.join(', '), L = [];
  const people = v.assets.groups.find(g => g.kind === 'human'), others = v.assets.groups.filter(g => g.kind !== 'human');
  L.push('# Frame Studio: AI prompt kit', '',
    'Paste this whole text into any chat AI, then write your idea on the next line, for example: "Write a 45-second film: what if a typhoon flooded Marikina at night?". Copy the AI\'s answer (the JSON) and use Story › "Paste a script from any AI", then "Check story". If the check reports problems, copy the report back to the AI and ask it to fix exactly those.', '',
    '---', '',
    '## Your role', '',
    'You write scripts for **Frame Studio**, a browser film engine that plays a JSON script as a 9:16 vertical film (YouTube Shorts, TikTok). It is an engine, not a video generator: it can only show the worlds, models, motions, cameras and effects listed below. **Use only the values in this kit.** Never invent an asset id, state, event, camera preset or field: anything else is ignored or rejected. When the idea asks for something the engine cannot show, keep the idea and tell it with what exists (a caption, a camera, a nearby asset) instead.', '',
    '**Answer with ONE JSON object and nothing else** (no explanation, no code fences), unless the user asks a question.', '',
    '## What the engine can and cannot do', '',
    '- Worlds (`world.biome`): ' + list(v.biomes) + '. Only **city** has streets, buildings, traffic, a background crowd and the quake/zombie effects. `custom` is an empty stage. `world.set: "divisoria"` is the built-in market street (only when the user asks for that market).',
    '- Disasters (`hazard.type`): ' + list(v.hazards) + '. Tsunami and flood need their water events (below); quake and zombie show only in the city.',
    '- People are ready-made low-poly PSX characters with motion-captured actions; their faces are painted, so **show feelings with actions and the camera**, not with expressions. They wear what they wear: no costumes, accessories or props in hand.',
    '- Characters talk in a made-up babble voice; **the words are never shown or spoken**. Anything the viewer must read goes in `caption.text` (or the shot `label`, shown as the big title).',
    '- No new models, places, maps, logos, real brands, real people, music tracks or voices. No text other than titles, captions and the end card.',
    '- Cameras are presets with one movement each, or an exact position (below). Hard cuts only between shots.',
    '', '## Script format (schema 7)', '',
    '```', '{ "schema_version": 7,',
    '  "meta": {"title", "city", "length_s", "disclaimer"},',
    '  "world": {"biome", "style": "city|town", "seed": "any text", "time_of_day": "text", "weather": "text", "finish": "' + v.finishes.join('|') + '"},',
    '  "hazard": {"type"},',
    '  "assets": [{"instance_id", "asset_id", "name", "position": [x, y, z], "rotation": [0, yawDegrees, 0], "state", "expression", "path": [{"t", "position": [x, y, z]}]}],',
    '  "chapters": [{"id", "title", "shots": [{',
    '     "t0", "t1", "label", "caption": {"type": "narration|fact", "text", "fact_id"},',
    '     "cam": {"preset", "move", "target", "target_id", "target_height", "offset": [x, y, z], "position": [x, y, z], "look": [x, y, z], "end_position", "end_look", "fov"},',
    '     "events": [], "sfx": [], "behavior": {"crowd", "emotion", "zombies"},',
    '     "actions": [{"target", "state", "expression", "transition"}],',
    '     "dialogue": [{"target", "text", "mood", "start", "duration"}],',
    '     "cinema": {...} }]}],',
    '  "end_card": {"text", "disclaimer"} }', '```', '',
    '- Times are seconds; shots follow each other with no gaps (`t1` of one shot = `t0` of the next). `meta.length_s` = the last `t1`.',
    '- `assets[]` items accept only the keys shown (plus `scale`, `visible`, `orient_to_path`, `shader`, `psx`). `actions` set a placed person\'s state from the start of that shot and **persist** until changed; one action per target per shot; `transition` 0-5 s.',
    '- Dialogue: `mood` one of ' + list(v.dialogue_moods) + '; under 8 words a line; one speaker at a time; `start`/`duration` inside the shot.',
    '', '## Values you may use', '',
    '- **cam.preset**: ' + list(v.presets) + ' (closeup = one face; pov = first person, only with push or track; aerial = drone view).',
    '- **cam.move**: ' + list(v.moves) + ' (one per shot).',
    '- **cam.target** (free text when there is no `target_id`, chosen by keyword): open/plaza/crowd/family → the open plaza; intersection/person/zombie → the crossing; facade/building/debris → a building front; skyline/district/city → an overview.',
    '- **events** (city): ' + list(v.events) + '.',
    '- **behavior.crowd**: ' + list(v.crowd) + '. **behavior.emotion**: ' + list(v.emotions) + '. **behavior.zombies**: ' + list(v.zombies) + '.',
    '- **sfx**: free words, matched by keyword in this order (first match wins, no match = silence): ' + v.sfx_first_match_wins.map(s => s.id + ' (' + s.match.replace(/\|/g, '/') + ')').join('; ') + '.',
    '- **time_of_day**: night (' + v.time_of_day.night + '), golden hour (' + v.time_of_day.golden + '), else day. **weather**: rain (' + v.weather.rain + '), storm with lightning (' + v.weather.storm_lightning + '), fog (' + v.weather.fog + '), grey sky (' + v.weather.grey_sky + ').',
    '- **cinema** (film or one shot): material ' + list(v.cinema.material) + '; grade ' + list(v.cinema.grade) + '; ' + Object.entries(v.cinema.ranges).map(([k, [a, b]]) => k + ' ' + a + '-' + b).join(', ') + '. `material: "psx"` gives the PlayStation look; tune it with `cinema.psx` (ready looks: ' + Object.entries(v.psx_looks).filter(([, l]) => !Object.keys(l).some(k => v.psx.find(p => p.key === k)?.scope === 'model')).map(([n, l]) => n + ' ' + JSON.stringify(l)).join('; ') + ').',
    '', '## People (`asset_id`)', '',
    'Roles: ' + list(people.ids) + '. Add `.v01` to `.v24` for a different person of the same role (give every cast member a different one).', '',
    '- states: ' + list(people.states) + '. (walk 1-1.8 m/s and run 2.5-3.5 m/s need a `path`; fall and death play once and stay down; sit_exit stands up.)',
    '- expressions: ' + list(people.expressions) + ' (painted faces: they barely show).',
    '', '## Other models (`asset_id`, one look each)', '');
  for (const g of others) L.push('- **' + g.category + '** (states: ' + g.states.join(', ') + '): ' + g.ids.map((id, i) => id + ' (' + g.names[i] + ')').join(', '));
  L.push('', '## Where things are', '',
    '- Metres, y up. `rotation: [0, yaw, 0]` in degrees: yaw 0 faces +z, 90 faces +x, 180 faces -z, -90 faces -x.',
    '- **City**: two 28 m roads cross at the origin (traffic where |x| < 14 or |z| < 14); pavements 14-19 m; four open plazas with trees where x and z are both between 18 and 46 (any signs, e.g. (30, 30)); buildings beyond about 48 m. Put the cast in a plaza, never on a road.',
    '- Other worlds: the subject stands near the origin; water is at y = 0 (boats at y 0). Nothing flies.',
    '- Walking: give a `path` (2-100 points, increasing `t`) and set the state to walk or run for those shots. To stand and then walk, repeat the start point at the time the walk begins: `[{"t":0,"position":p0},{"t":22,"position":p0},{"t":29,"position":p1}]`.',
    '- Camera on a person: `target_id` = its instance_id, `target_height` = eye height (adult 1.45-1.5, elder 1.4, child 1.05, crouching 1.2), `offset` = where the camera stands relative to the person in world axes. Closeup: about 1 m in front of the face; wide: 4-6 m away and 1-2 m up. With target_id only push, pull and orbit move.',
    '- Exact camera: `position` and `look` (both, world coordinates), optional `end_position`/`end_look` to glide. `fov` 15-100.',
    '', '## Story rules', '',
    '- Shot 1 (3-5 s) is the hook: the most striking image or the first sign of trouble; its `label` is the title question.',
    '- Shots of 3-9 s, one camera move each; shots get shorter as tension rises; never three equal lengths in a row; re-hook every ~30 s with a new question label ending in "?".',
    '- 1-3 named cast members (placed humans), each framed with `target_id` at least once, at least 4 closeups; alternate wide/close and high/low.',
    '- Disaster films: the crowd moves calm → alert or freeze → panic or flee → hide or help → relief. End on a practical, true safety step in `end_card.text`.',
    '- Captions are `narration` unless you state a real fact you are sure of (`type: "fact"`). No fake news, official statements, real people or brands. Never write "simulation" or "AI" on screen. Add a disclaimer ("Illustrative scenario. Not a prediction." for real hazards, "Fictional scenario." otherwise).',
    '', '## Before you answer, check', '',
    '- every `asset_id`, `state`, `preset`, `move`, `event` and `crowd` value appears in this kit;',
    '- shots are back to back, the first starts at 0, every shot has a `label` and a `cam` with a `preset` and a `move`;',
    '- every `target`/`target_id` is an `instance_id` you placed; nobody stands on a road;',
    '- the answer is one JSON object only.',
    '', '## Example (a short, valid film)', '', '```json', JSON.stringify(PROMPT_KIT_EXAMPLE, null, 1), '```', '');
  return L.join('\n');
}

// Story tab: copy or download the kit; the AI's answer comes back through "Paste a script from any AI".
function initPromptKit() {
  const box = document.createElement('details'); box.className = 'fold ai-fold'; box.id = 'promptKitFold';
  box.innerHTML = '<summary><svg class="i"><use href="#i-copy"/></svg>Use any AI, free</summary><p class="hint">Copy the prompt kit, paste it into any chat AI (ChatGPT, Gemini, Claude...) and add your idea. The kit lists only what this engine can show, so the AI writes a script that plays. Then paste its answer below and check the story.</p><div class="row"><button id="copyPromptKit" class="primary grow"><svg class="i"><use href="#i-copy"/></svg>Copy AI prompt kit</button><button id="downloadPromptKit"><svg class="i"><use href="#i-download"/></svg>Download</button></div>';
  $('pasteScript').before(box);
  $('pasteScript').lastChild.textContent = 'Paste a script from any AI';
  $('copyPromptKit').onclick = async () => {
    const text = promptKit();
    try { await navigator.clipboard.writeText(text); notifyUser('Prompt kit copied (' + Math.round(text.length / 1000) + ' KB). Paste it into any chat AI, then add your idea.'); }
    catch { promptKitDownload(text); notifyUser('Copy was blocked, so the kit was downloaded instead.'); }
  };
  $('downloadPromptKit').onclick = () => promptKitDownload(promptKit());
}
function promptKitDownload(text) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown' })); a.download = 'frame-studio-prompt-kit.md';
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
