#!/usr/bin/env node
// Rewrites the whatif-director skill's asset list and its script checker's GROUPS table from the PSX catalog build
// report (public/assets/psx/build-report.json), between the markers <!-- assets:start/end --> and # groups:start/end.
// People stay hand-written above the markers. Run after tools/build-psx.mjs.
//   node tools/sync-skill-assets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..'), skill = join(root, 'skills/whatif-director/SKILL.md');
const models = JSON.parse(readFileSync(join(root, 'public/assets/psx/build-report.json'), 'utf8')).models;
const LABEL = { vehicle: 'Cars and vans', building: 'Buildings', tree: 'Trees', rock: 'Rocks', boat: 'Boats', animal: 'Fish', creature: 'Creatures (still, no animation)', food: 'Food and drinks', prop: 'Props' };
const groups = new Map();
for (const [id, m] of Object.entries(models)) {
  const key = m.category + '|' + m.states.join(' ');
  if (!groups.has(key)) groups.set(key, { category: m.category, states: m.states, items: [] });
  groups.get(key).items.push({ id, name: m.name, size: m.size });
}
const size = s => s.map(v => v < 1 ? v.toFixed(2) : v.toFixed(1)).join('×');
const bullets = [...groups.values()].map(g => `- **${LABEL[g.category] || g.category}** (states: ${g.states.join(' ')}): ` +
  g.items.map(i => `${i.id} (${i.name}, ${size(i.size)} m)`).join(', ')).join('\n');
const intro = 'Each model below has one look: use the id as written (an old `.vNN` suffix still resolves to the same model). Sizes are width×height×depth in metres; models stand on y = 0, centred, facing +z.';
const table = [...groups.values()].map(g => `    (${JSON.stringify(g.items.map(i => i.id).join(' '))},\n     ${JSON.stringify(g.states.join(' '))}.split(), [], []),`).join('\n');
let text = readFileSync(skill, 'utf8'); const nl = text.includes('\r\n') ? '\r\n' : '\n'; text = text.replace(/\r\n/g, '\n');
text = text.replace(/<!-- assets:start -->[\s\S]*?<!-- assets:end -->/, `<!-- assets:start -->\n${intro}\n\n${bullets}\n<!-- assets:end -->`);
text = text.replace(/ {4}# groups:start[\s\S]*? {4}# groups:end/, `    # groups:start\n${table}\n    # groups:end`);
writeFileSync(skill, text.replace(/\n/g, nl));
console.log(`whatif-director skill: ${Object.keys(models).length} PSX models in ${groups.size} groups`);
