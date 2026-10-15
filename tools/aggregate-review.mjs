#!/usr/bin/env node
// Aggregates blind review JSON files (qa/review/<round>/reviewer-*.json) and un-blinds them with qa/review/key.json.
//   node tools/aggregate-review.mjs [roundDir]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] || 'qa/review/round1';
const key = JSON.parse(readFileSync('qa/review/key.json', 'utf8'));
const crit = ['silhouette', 'proportions', 'face', 'hands', 'appeal', 'consistency', 'performance'];
const reviews = readdirSync(dir).filter(f => /^reviewer-\d+\.json$/.test(f)).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const rows = {};
for (const code of Object.keys(key)) {
  const per = reviews.map(r => r.candidates[code]).filter(Boolean);
  const mean = c => per.reduce((s, x) => s + x[c], 0) / per.length;
  const row = { code, name: key[code], reviewers: per.length };
  for (const c of crit) row[c] = +mean(c).toFixed(1);
  row.visual = +crit.slice(0, 6).reduce((s, c) => s + mean(c), 0).toFixed(1);
  row.total = +(row.visual + mean('performance')).toFixed(1);
  row.outOf10 = +(row.total / 7).toFixed(1);
  row.spread = Math.max(...per.map(x => x.total)) - Math.min(...per.map(x => x.total));
  row.defects = per.flatMap(x => x.defects.map(d => `${d.what} (${d.view})`));
  rows[code] = row;
}
const table = Object.values(rows).sort((a, b) => a.name.localeCompare(b.name));
console.log(['candidate', ...crit, 'visual/60', 'total/70', 'avg/10', 'spread'].join('\t'));
for (const r of table) console.log([r.name, ...crit.map(c => r[c]), r.visual, r.total, r.outOf10, r.spread].join('\t'));
for (const r of reviews) console.log(`reviewer ${r.reviewer} ranking: vendor ${r.ranking.vendor.map(c => key[c]).join(' > ')}; octopus ${r.ranking.octopus.map(c => key[c]).join(' > ')}`);
writeFileSync(join(dir, 'summary.json'), JSON.stringify({ table, rankings: reviews.map(r => ({ reviewer: r.reviewer, vendor: r.ranking.vendor.map(c => key[c]), octopus: r.ranking.octopus.map(c => key[c]) })) }, null, 2) + '\n');
