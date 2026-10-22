#!/usr/bin/env node
// PSX look editor assets (Phase 2 of design/overhaul-plan.md), from Francisco Cidade's CC0 "PSX - Godot Shader" project
// (fcidade.itch.io/psx-godot-shader-free): its 12 textures, the Kenney Graveyard Kit models (CC0) of its night graveyard
// demo, and that scene's layout read from graveyard.tscn (every model with its world matrix and material variant, the
// lamps, the moon, the environment). Writes public/assets/psx-look/; tools/build-manifest.mjs lists the files.
//   node tools/build-psx-look.mjs [path to the shader project]
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = process.argv[2] || join(process.env.FS_ASSETS || 'C:\\Users\\HP\\Desktop\\ASSETS', 'SHADER', 'psx-godot-shader-free-project (1)');
const out = join(root, 'public', 'assets', 'psx-look');
if (!existsSync(join(src, 'graveyard.tscn'))) throw new Error('shader project not found: ' + src);
for (const d of ['', 'textures', 'kenney']) mkdirSync(join(out, d), { recursive: true });

// textures: 64 px pictures made for the shader (CC0), plus the Kenney kit's colour map
for (const f of readdirSync(join(src, 'assets')).filter(f => f.endsWith('.png'))) copyFileSync(join(src, 'assets', f), join(out, 'textures', f));
copyFileSync(join(src, 'kenney', 'Textures', 'colormap.png'), join(out, 'textures', 'colormap.png'));

// graveyard.tscn: nodes in file order; a node's world matrix is its parent's times its own
const text = readFileSync(join(src, 'graveyard.tscn'), 'utf8');
const ext = Object.fromEntries([...text.matchAll(/\[ext_resource type="(\w+)" path="res:\/\/([^"]+)" id="([^"]+)"\]/g)].map(m => [m[3], { type: m[1], path: m[2] }]));
const sub = {};
for (const m of text.matchAll(/\[sub_resource type="(\w+)" id="([^"]+)"\]\n([\s\S]*?)(?=\n\[)/g)) sub[m[2]] = { type: m[1], body: m[3] };
const num = s => s.split(',').map(Number);
const color = s => s && num(s.match(/Color\(([^)]+)\)/)[1]).slice(0, 3).map(v => +v.toFixed(4));
// Godot Transform3D(basis x, basis y, basis z, origin): the three axis vectors, then the position
const mat = s => { const v = s ? num(s.match(/Transform3D\(([^)]+)\)/)[1]) : [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; return [v[0], v[1], v[2], 0, v[3], v[4], v[5], 0, v[6], v[7], v[8], 0, v[9], v[10], v[11], 1]; };
const mul = (a, b) => { const r = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k]; return r; };
// one [node ...] header per line (a header can hold groups=["flames"], so it is read up to the end of the line)
const nodes = [], lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  const h = lines[i].match(/^\[node (.*)\]$/); if (!h) continue;
  const attr = k => (h[1].match(new RegExp(k + '="([^"]+)"')) || [])[1], body = [];
  for (let j = i + 1; j < lines.length && !lines[j].startsWith('['); j++) body.push(lines[j]);
  nodes.push({ name: attr('name'), type: attr('type'), parent: attr('parent'), instance: (h[1].match(/instance=ExtResource\("([^"]+)"\)/) || [])[1], body: body.join('\n') });
}
const world = new Map(), field = (body, k) => (body.match(new RegExp('^' + k + ' = (.+)$', 'm')) || [])[1];
const scene = { instances: [], lamps: [], env: {}, camera: null, moon: null, ground: null, fog: {} };
const variantOf = ref => { const r = ref && ext[ref.match(/ExtResource\("([^"]+)"\)/)?.[1]]; return r ? basename(r.path, '.tres') : null; };
for (const n of nodes) {
  const path = n.parent === undefined ? '' : n.parent === '.' ? n.name : n.parent + '/' + n.name;
  const parentWorld = n.parent === undefined || n.parent === '.' ? mat() : world.get(n.parent) || mat();
  const w = mul(parentWorld, mat(field(n.body, 'transform')));
  world.set(path, w);
  if (n.instance && ext[n.instance]?.type === 'PackedScene') scene.instances.push({ model: basename(ext[n.instance].path, '.glb'), path, m: w.map(v => +v.toFixed(5)), material: 'kit' });
  else if (n.type === 'MeshInstance3D' && n.parent && n.parent !== '.') {
    const inst = scene.instances.find(i => n.parent === i.path || n.parent.startsWith(i.path + '/')), v = variantOf(field(n.body, 'material_override'));
    if (inst && v) inst.material = v;
    if (n.parent === 'Shell' && n.name === 'Ground') scene.ground = { m: w.map(v => +v.toFixed(5)), texture: 'grass', lit: 0 };
  } else if (n.type === 'OmniLight3D') scene.lamps.push({ name: n.name, pos: [w[12], w[13], w[14]].map(v => +v.toFixed(3)), color: color(field(n.body, 'light_color')), energy: +(field(n.body, 'light_energy') || 1), range: +(field(n.body, 'omni_range') || 5) });
  else if (n.type === 'DirectionalLight3D') scene.moon = { m: w.map(v => +v.toFixed(5)), color: color(field(n.body, 'light_color')), energy: +(field(n.body, 'light_energy') || 1) };
  else if (n.type === 'Camera3D') scene.camera = { fov: +(field(n.body, 'fov') || 75) };
  else if (n.type === 'Node3D' && n.parent === undefined) { scene.fog = { start: +(field(n.body, 'fog_start') || 8), end: +(field(n.body, 'fog_end') || 30) }; }
}
const envBody = Object.values(sub).find(s => s.type === 'Environment')?.body || '';
scene.env = { background: color(field(envBody, 'background_color')), ambient: color(field(envBody, 'ambient_light_color')), energy: +(field(envBody, 'ambient_light_energy') || 1) };
// the Kenney material variants (materials/*.tres): tint, lit and glow on top of the colour map
scene.materials = {};
for (const f of readdirSync(join(src, 'materials')).filter(f => f.endsWith('.tres'))) {
  const t = readFileSync(join(src, 'materials', f), 'utf8'), p = k => { const v = (t.match(new RegExp('shader_parameter/' + k + ' = ([^\\n]+)')) || [])[1]; return v === 'null' ? undefined : v; };
  scene.materials[basename(f, '.tres')] = { tint: color(p('albedo_color')) || [1, 1, 1], lit: p('lit') ? +p('lit') : 1, glow: p('glow') ? +p('glow') : 0, fog_color: color(p('fog_color')) };
}
for (const i of scene.instances) delete i.path;
const used = [...new Set(scene.instances.map(i => i.model))].sort();
for (const m of used) copyFileSync(join(src, 'kenney', m + '.glb'), join(out, 'kenney', m + '.glb'));
writeFileSync(join(out, 'graveyard.json'), JSON.stringify(scene) + '\n');
copyFileSync(join(src, 'kenney', 'LICENSE.txt'), join(out, 'kenney', 'LICENSE.txt'));
console.log(`psx-look: ${readdirSync(join(out, 'textures')).length} textures, ${used.length} Kenney models, graveyard: ${scene.instances.length} models, ${scene.lamps.length} lamps, moon ${scene.moon ? 'yes' : 'no'}, ground ${scene.ground ? 'yes' : 'no'}, fog ${scene.fog.start}-${scene.fog.end} m`);
