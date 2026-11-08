#!/usr/bin/env node
// Export the scenario vocabulary from the running engine, so the Director and Maintainer skills can be synced from
// the source of truth instead of hand-copied lists.
//
//   node tools/extract-vocabulary.mjs <url-or-html-file> [out.json]
// Reads the live lists after boot (some, like the water events, are added while the scripts load).
import { writeFileSync } from 'node:fs';
import { launch, sleep, STUDIO_READY } from './lib/chrome.mjs';

const [target = 'http://localhost:5173/', out = 'qa/captures/vocabulary.json'] = process.argv.slice(2);

// Runs in the page: engineVocabulary() (src/studio/28-prompt-kit.js), the same lists the in-app AI prompt kit uses.

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
const vocab = await chrome.evaluate(`engineVocabulary()`);
const result = { version: '7', generated_by: 'tools/extract-vocabulary.mjs (frame-studio)', generated: new Date().toISOString().slice(0, 10), ...vocab };
writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
if (out.endsWith('.json')) writeFileSync(out.replace(/\.json$/, '.md'), markdown(result));
const missing = Object.entries(result).filter(([, v]) => v === undefined || v === null || (Array.isArray(v) && !v.length)).map(([k]) => k);
console.log(`${out}: ${result.events.length} events, ${result.hazards.length} hazards, ${result.assets.archetypes} archetypes in ${result.assets.groups.length} groups`);
if (chrome.errors.length || missing.length) { console.log('problems:', missing.join(', '), chrome.errors.slice(0, 3).join(' | ')); process.exit(1); }
chrome.close();
process.exit(0);
