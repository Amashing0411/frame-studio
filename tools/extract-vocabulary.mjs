#!/usr/bin/env node
// Export the scenario vocabulary from the running engine, so the Director and Maintainer skills can be synced from
// the source of truth instead of hand-copied lists.
//
//   node tools/extract-vocabulary.mjs <url-or-html-file> [out.json]
// Reads the live lists after boot (some, like the water events, are added while the scripts load).
import { writeFileSync } from 'node:fs';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const [target = 'http://localhost:5173/', out = 'qa/captures/vocabulary.json'] = process.argv.slice(2);

// Runs in the page. Uses the engine's own arrays and, where a list only exists inside a validator, that validator's source.
function collect() {
  const lists = fn => (String(fn).match(/\[('[a-z_]+',?)+\]/g) || []).map(s => s.slice(1, -1).split(',').map(x => x.slice(1, -1)));
  const quoted = (fn, re) => [...new Set([...String(fn).matchAll(re)].map(m => m[1]))];
  const tod = String(setTOD), rx = name => (tod.match(new RegExp(name + '=\\/([^/]+)\\/i')) || [])[1];
  const water = quoted(validateWaterHazard, /h==='(\w+)'/g);
  const groups = new Map();
  for (const a of CATALOG_BASE) {
    const key = [a.category, a.states.join(' '), (a.expressions || []).join(' '), ].join('|');
    if (!groups.has(key)) groups.set(key, { category: a.category, kind: a.kind, states: a.states, expressions: a.expressions || [], ids: [] });
    groups.get(key).ids.push(a.id);
  }
  return {
    hazards: ['none', ...Object.keys(KL), ...water],
    presets: PRE, moves: MOV, events: EVT, crowd: CRW, emotions: EMOS, zombies: ZMB,
    biomes: lists(validateCatalogScenario).find(l => l.includes('city') && l.includes('coast')),
    finishes: quoted(validateFinish, /'(\w+)'/g).filter(x => x !== 'toy' ? x === 'classic' : true),
    cinema: { material: FILM_FINISHES, grade: lists(validateCinemaAndMoments)[0], ranges: cinemaRanges },
    // the PSX look (25-psx-shader.js): cinema.psx and shot cinema.psx take the film and screen settings, assets[].psx the model ones
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

// Left out on purpose (Phase 1): speech balloons / dialogue icons (no longer drawn; scripts that still carry them
// validate) and accessories (hidden on the PSX people).
// A readable copy of the same data, for skills and people.
function markdown(v) {
  const L = [`# Frame Studio scenario vocabulary (schema v${v.version})`, '',
    `Generated ${v.generated} from the running engine by \`${v.generated_by}\`. Do not edit by hand; re-run the tool.`, ''];
  const row = (name, list) => L.push(`- **${name}**: ${list.join(', ')}`);
  row('hazard.type', v.hazards); row('cam.preset', v.presets); row('cam.move', v.moves); row('events', v.events);
  row('behavior.crowd', v.crowd); row('behavior.emotion', v.emotions); row('behavior.zombies', v.zombies);
  row('world.biome', v.biomes); row('world.finish', v.finishes);
  row('cinema.material', v.cinema.material); row('cinema.grade', v.cinema.grade);
  L.push(`- **cinema ranges**: ${Object.entries(v.cinema.ranges).map(([k, [a, b]]) => `${k} ${a}-${b}`).join(', ')}`);
  row('dialogue mood', v.dialogue_moods); row('asset shader', v.shaders);
  L.push('', '## PSX look (cinema.material "psx")', '', 'cinema.psx (film) and the cinema.psx of a shot take the film and screen settings; assets[].psx takes the model settings. Leave out what stays at the default.', '');
  for (const p of v.psx) L.push(`- **${p.key}** (${p.scope}${p.options ? ': ' + p.options.map((o, i) => i + ' = ' + o).join(', ') : p.min !== undefined ? ', ' + p.min + '-' + p.max : p.textures ? ': ' + p.textures.join(', ') + ' or a data URL' : ''}; default ${JSON.stringify(p.default)}): ${p.help}`);
  L.push('', 'Ready looks: ' + Object.entries(v.psx_looks).map(([n, l]) => `${n} ${JSON.stringify(l)}`).join('; '));
  L.push('', '## sfx keywords (checked in this order, first match wins, no match = silent)', '');
  for (const s of v.sfx_first_match_wins) L.push(`- **${s.id}** (${s.label}): \`${s.match}\``);
  L.push('', '## time_of_day and weather keywords', '');
  for (const [k, re] of Object.entries(v.time_of_day)) L.push(`- time ${k}: \`${re}\``);
  for (const [k, re] of Object.entries(v.weather)) L.push(`- weather ${k}: \`${re}\``);
  L.push('', `## Assets (${v.assets.archetypes} archetypes, each also as variants .v01-.v${String(v.assets.variants_per_archetype).padStart(2, '0')})`, '');
  for (const g of v.assets.groups) {
    L.push(`- **${g.category}/${g.kind}** (${g.ids.length}): ${g.ids.join(', ')}`, `  - states: ${g.states.join(' ')}`);
    if (g.expressions.length) L.push(`  - expressions: ${g.expressions.join(' ')}`);
  }
  return L.join('\n') + '\n';
}

const chrome = await launch();
await chrome.open(target);
await chrome.waitFor(STUDIO_READY);
await sleep(1200);
const vocab = await chrome.evaluate(`(${collect.toString()})()`);
const result = { version: '7', generated_by: 'tools/extract-vocabulary.mjs (frame-studio)', generated: new Date().toISOString().slice(0, 10), ...vocab };
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
if (out.endsWith('.json')) writeFileSync(out.replace(/\.json$/, '.md'), markdown(result));
const missing = Object.entries(result).filter(([, v]) => v === undefined || v === null || (Array.isArray(v) && !v.length)).map(([k]) => k);
console.log(`${out}: ${result.events.length} events, ${result.hazards.length} hazards, ${result.assets.archetypes} archetypes in ${result.assets.groups.length} groups`);
if (chrome.errors.length || missing.length) { console.log('problems:', missing.join(', '), chrome.errors.slice(0, 3).join(' | ')); process.exit(1); }
chrome.close();
process.exit(0);
