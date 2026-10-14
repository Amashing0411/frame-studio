#!/usr/bin/env node
// Fails when a function is layered instead of edited. Run automatically before every build (npm "prebuild").
//
// The engine and studio files share one global scope (see classic.config.js), so a later file can quietly
// replace an earlier function. This check parses every project file and reports:
//   reassign   name = function/arrow, where name is a global function declared elsewhere (or earlier)
//   alias      const old = name;  (saving a global function so a replacement can call it)
//   method     obj.method = function, where obj.method was saved first (const raw = obj.method / .bind(obj))
//   duplicate  the same global function declared twice
//
//   node tools/check-wrappers.mjs            exit 1 on any finding
//   node tools/check-wrappers.mjs --list     print every finding grouped by name (inventory)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as acorn from 'acorn';
import config from '../classic.config.js';

const root = resolve(import.meta.dirname, '..');
const files = [...config.engine.files, ...config.studio.files];
const findings = [];
const globals = new Map(); // name -> first declaration {file, line}
const parsed = files.map(file => {
  const text = readFileSync(resolve(root, file), 'utf8');
  return { file, ast: acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }) };
});
const isFn = n => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
const at = (file, node) => `${file}:${node.loc.start.line}`;
const memberPath = n => n.type === 'Identifier' ? n.name : n.type === 'MemberExpression' && !n.computed ? (memberPath(n.object) && `${memberPath(n.object)}.${n.property.name}`) : null;

// Pass 1: global function declarations (function f(){} and let/const/var f = function/arrow at top level).
for (const { file, ast } of parsed) {
  for (const st of ast.body) {
    const decl = (name, node) => {
      if (globals.has(name)) findings.push({ kind: 'duplicate', name, where: at(file, node), first: globals.get(name) });
      else globals.set(name, at(file, node));
    };
    if (st.type === 'FunctionDeclaration') decl(st.id.name, st);
    if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier' && isFn(d.init)) decl(d.id.name, d);
  }
}

// Pass 2: walk everything for reassignments, aliases and saved methods.
const savedMethods = new Map(); // "obj.method" -> where it was saved
// Names a function declares (params plus any declaration in its body, outside nested functions) shadow globals inside it.
const patternNames = (p, out = []) => {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(q => patternNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => patternNames(e, out));
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  return out;
};
function localNames(fn) {
  const names = new Set(fn.params.flatMap(p => patternNames(p)));
  if (fn.id && fn.type !== 'FunctionDeclaration') names.add(fn.id.name);
  const scan = n => {
    if (!n || typeof n.type !== 'string') return;
    if (n !== fn.body && /Function/.test(n.type)) { if (n.type === 'FunctionDeclaration') names.add(n.id.name); return; }
    if (n.type === 'VariableDeclarator') patternNames(n.id).forEach(x => names.add(x));
    if (n.type === 'CatchClause' && n.param) patternNames(n.param).forEach(x => names.add(x));
    if (n.type === 'ClassDeclaration' && n.id) names.add(n.id.name);
    for (const k in n) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v.type === 'string') scan(v); }
  };
  scan(fn.body);
  return names;
}
function walk(node, visit, shadowed = new Set()) {
  if (!node || typeof node.type !== 'string') return;
  if (/Function/.test(node.type)) shadowed = new Set([...shadowed, ...localNames(node)]);
  visit(node, shadowed);
  for (const key in node) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c, visit, shadowed));
    else if (v && typeof v.type === 'string') walk(v, visit, shadowed);
  }
}
const isGlobalFn = (name, shadowed) => globals.has(name) && !shadowed.has(name);
for (const { file, ast } of parsed) walk(ast, (n, shadowed) => {
  if (n.type === 'VariableDeclarator' && n.init) {
    if (n.init.type === 'Identifier' && isGlobalFn(n.init.name, shadowed)) findings.push({ kind: 'alias', name: n.init.name, where: at(file, n), detail: `${patternNames(n.id).join(',')} = ${n.init.name}` });
    const saved = n.init.type === 'CallExpression' && n.init.callee.type === 'MemberExpression' && n.init.callee.property.name === 'bind' ? n.init.callee.object : n.init;
    const p = saved.type === 'MemberExpression' ? memberPath(saved) : null;
    if (p) savedMethods.set(p, at(file, n));
  }
});
for (const { file, ast } of parsed) walk(ast, (n, shadowed) => {
  if (n.type !== 'AssignmentExpression' || n.operator !== '=' || !isFn(n.right)) return;
  if (n.left.type === 'Identifier' && isGlobalFn(n.left.name, shadowed)) findings.push({ kind: 'reassign', name: n.left.name, where: at(file, n), first: globals.get(n.left.name) });
  const p = n.left.type === 'MemberExpression' ? memberPath(n.left) : null;
  if (p && savedMethods.has(p)) findings.push({ kind: 'method', name: p, where: at(file, n), detail: `saved at ${savedMethods.get(p)}` });
});

if (process.argv.includes('--list')) {
  const byName = new Map();
  for (const f of findings) byName.set(f.name, [...(byName.get(f.name) || []), f]);
  for (const [name, list] of [...byName].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${name}  (declared ${globals.get(name) || '-'})`);
    for (const f of list) console.log(`   ${f.kind.padEnd(9)} ${f.where}${f.detail ? '  ' + f.detail : ''}`);
  }
}
const counts = findings.reduce((c, f) => (c[f.kind] = (c[f.kind] || 0) + 1, c), {});
if (findings.length) {
  if (!process.argv.includes('--list')) for (const f of findings) console.log(`${f.kind.padEnd(9)} ${f.name}  ${f.where}${f.detail ? '  ' + f.detail : ''}`);
  console.log(`\ncheck-wrappers: ${findings.length} finding(s) ${JSON.stringify(counts)} across ${files.length} files.`);
  console.log('Edit the original function instead of layering a new one on top (CLAUDE.md rule 3).');
  process.exit(1);
}
console.log(`check-wrappers: 0 findings across ${files.length} files (${globals.size} global functions).`);
