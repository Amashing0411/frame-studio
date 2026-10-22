// PSX look (Phase 2 of design/overhaul-plan.md): a port of Francisco Cidade's CC0 "PSX - Godot Shader"
// (fcidade.itch.io/psx-godot-shader-free): the material (psx.gdshader) and the screen effect (psx_screen.gdshader).
// The material is injected into the engine's own materials (onBeforeCompile), so a person's skin, a window's light or
// a zombie tint keep working: vertex snapping and jitter on the film clock (exports repeat), affine texture warping
// with its cap, nearest or N64 3-point texture filtering, per-vertex (Gouraud) lighting from three's Lambert vertex
// chunk, vertex fog, colour bits with a 4x4 ordered dither, sphere-mapped metal (matcap), emission, billboards and
// alpha cutout. The screen effect (big console pixels, colour bits, dither, grain, vignette) is a branch of the film's
// post pass (makeFilmPost) and of the look editor's preview. PSX_PARAMS is the one table of settings: defaults,
// ranges, plain help (the shader's own wording), group and scope. Scope 'film' and 'screen' settings belong to the
// film look (cinema.psx, shot.cinema.psx); 'model' settings belong to one placed model (asset.psx) or a demo object.
// Sizes are resolution independent: pixel_size is measured on a 1080-wide film frame (960-wide in the editor's demo
// scenes, like the shader project's 960 x 720), so a phone preview and a 1080 x 1920 export show the same look.
const PSX_GROUPS = [['texture', 'Texture'], ['snapping', 'Snapping'], ['lighting', 'Lighting'], ['metal', 'Metal'], ['sprite', 'Sprite'], ['fog', 'Fog'], ['color', 'Color'], ['alpha', 'Alpha'], ['screen', 'Screen']];
const PSX_PARAMS = [
  { key: 'albedo_tex', group: 'texture', scope: 'model', type: 'texture', set: 'albedo', def: '', help: 'The picture on the surface. Drawn with nearest filtering and repeating, like a console texture. Empty keeps the model\'s own picture.' },
  { key: 'albedo_color', group: 'texture', scope: 'model', type: 'color', def: '#ffffff', help: 'Tint multiplied with the texture. White leaves the texture as it is.' },
  { key: 'vertex_color_mix', group: 'texture', scope: 'film', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'How much the mesh vertex colors darken or tint the surface (0 = ignore them, 1 = full). PS1 levels were lit by painting these.' },
  { key: 'texture_filter', group: 'texture', scope: 'film', type: 'enum', def: 0, options: ['Nearest', 'N64 3-point'], help: 'How the texture is smoothed. Nearest = hard square texels (PS1). N64 3-point = the soft, triangular blur of the Nintendo 64, which mixes only three texels instead of four.' },
  { key: 'uv_scale', group: 'texture', scope: 'model', type: 'vec2', def: [1, 1], min: -16, max: 16, step: .05, help: 'Repeats the texture. 2 = twice across each face.' },
  { key: 'uv_offset', group: 'texture', scope: 'model', type: 'vec2', def: [0, 0], min: -16, max: 16, step: .05, help: 'Moves the texture, in texture widths.' },
  { key: 'uv_scroll', group: 'texture', scope: 'model', type: 'vec2', def: [0, 0], min: -8, max: 8, step: .05, help: 'Slides the texture, in texture widths per second (water, conveyor belts, flames).' },
  { key: 'affine', group: 'texture', scope: 'film', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'Texture swimming. 1 = affine mapping like the real PS1, where the texture bends across big polygons that are close to the camera. 0 = a modern, perspective-correct texture.' },
  { key: 'affine_limit', group: 'texture', scope: 'film', type: 'range', def: .35, min: .05, max: 8, step: .05, help: 'The most the texture may slide because of affine mapping, in texture repeats. Big polygons at the edge of a wide view would otherwise smear the whole texture; a lower value keeps the swimming but caps it. 8 = no cap.' },
  { key: 'pixel_size', group: 'snapping', scope: 'film', type: 'range', def: 3, min: 1, max: 16, step: .5, help: 'Size of one console pixel. The vertices snap to this grid, and the dither cells use it too. 3 on a portrait film = the classic 360 x 640 (on the demo scenes, 320 x 240).' },
  { key: 'snap_strength', group: 'snapping', scope: 'film', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'How strongly the vertices snap to the pixel grid. 1 = every vertex jumps to a whole pixel, which makes the edges shimmer when the camera or the object moves. 0 = off.' },
  { key: 'jitter', group: 'snapping', scope: 'film', type: 'range', def: 0, min: 0, max: 2, step: .01, help: 'Random shaking of every vertex, in console pixels (the unstable geometry of the early 3D games). 0 = off.' },
  { key: 'jitter_rate', group: 'snapping', scope: 'film', type: 'int', def: 12, min: 1, max: 30, step: 1, help: 'How many times per second the jitter changes.' },
  { key: 'lit', group: 'lighting', scope: 'model', type: 'range', def: 1, min: 0, max: 1, step: .01, help: '1 = lit by the lights in the scene, computed at the vertices (smooth Gouraud shading, no per-pixel light). 0 = flat, the texture color as it is.' },
  { key: 'glow', group: 'lighting', scope: 'model', type: 'range', def: 0, min: 0, max: 1, step: .01, help: 'Self illumination of the whole surface. It keeps this much of its color even in the dark.' },
  { key: 'emission_tex', group: 'lighting', scope: 'model', type: 'texture', set: 'emission', def: '', help: 'Picture of what glows (windows, runes, lava). Only its bright parts light up, in the dark too.' },
  { key: 'emission_strength', group: 'lighting', scope: 'model', type: 'range', def: 1, min: 0, max: 4, step: .01, help: 'How strongly the emission picture glows.' },
  { key: 'shadows', group: 'lighting', scope: 'film', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'How much of the film\'s shadows stays on lit surfaces. PS1 games had none (0); 1 keeps the shadows of the sun and the lamps.' },
  { key: 'matcap_tex', group: 'metal', scope: 'model', type: 'texture', set: 'matcap', def: '', help: 'Picture of a sphere that is wrapped around the surface by its normal (a matcap): chrome, gold, a wet floor. It already contains its own light, so the lit part is replaced by it.' },
  { key: 'matcap_amount', group: 'metal', scope: 'model', type: 'range', def: 0, min: 0, max: 1, step: .01, help: 'How much of the surface becomes the metal picture. 0 = off.' },
  { key: 'billboard', group: 'sprite', scope: 'model', type: 'enum', def: 0, options: ['Off', 'Full', 'Upright'], help: 'Turns the surface toward the camera: a flat picture that always faces you (trees, enemies, items). Full follows the camera in every direction, Upright only turns around the vertical axis (a tree does not lean).' },
  { key: 'fog_amount', group: 'fog', scope: 'film', type: 'range', def: 0, min: 0, max: 1, step: .01, help: 'How much of the distance fog is used. 0 = no fog. The fog is worked out at the vertices, as on the console.' },
  { key: 'fog_color', group: 'fog', scope: 'film', type: 'color', def: '#0d0f14', help: 'Color of the fog.' },
  { key: 'fog_start', group: 'fog', scope: 'film', type: 'range', def: 8, min: 0, max: 200, step: .5, help: 'Distance from the camera where the fog starts, in meters.' },
  { key: 'fog_end', group: 'fog', scope: 'film', type: 'range', def: 30, min: .5, max: 400, step: .5, help: 'Distance where the fog is complete. Close to the start makes a hard wall of fog.' },
  { key: 'color_bits', group: 'color', scope: 'film', type: 'int', def: 5, min: 1, max: 8, step: 1, help: 'Bits per color channel. 5 = the PS1 15-bit color (32 shades per channel). 8 = off, 1 = very few colors.' },
  { key: 'dither_amount', group: 'color', scope: 'film', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'Strength of the 4x4 ordered dither that hides the banding of the reduced colors. 0 = no dither.' },
  { key: 'cutout', group: 'alpha', scope: 'model', type: 'range', def: 0, min: 0, max: 1, step: .01, help: 'Pixels with an alpha below this are cut out (leaves, fences, sprites). 0 = off, the surface is solid.' },
  { key: 'screen_amount', group: 'screen', scope: 'screen', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'How much of the screen effect is used: chunky console pixels, reduced colors and dither on the final picture. 0 = the picture as it is.' },
  { key: 'screen_pixel_size', group: 'screen', scope: 'screen', type: 'range', def: 3, min: 1, max: 16, step: .5, help: 'Size of one console pixel on the final picture. Keep it equal to pixel_size: moving pixel_size moves this too.' },
  { key: 'screen_color_bits', group: 'screen', scope: 'screen', type: 'int', def: 5, min: 1, max: 8, step: 1, help: 'Bits per color channel on the final picture, which also covers the light and the fog. 5 = the PS1 15-bit color. 8 = off.' },
  { key: 'screen_dither', group: 'screen', scope: 'screen', type: 'range', def: 1, min: 0, max: 1, step: .01, help: 'Strength of the 4x4 ordered dither on the final picture (0 = none).' },
  { key: 'grain', group: 'screen', scope: 'screen', type: 'range', def: 0, min: 0, max: .2, step: .005, help: 'Slight brightness noise that changes every frame, like a worn picture.' },
  { key: 'vignette', group: 'screen', scope: 'screen', type: 'range', def: 0, min: 0, max: 1, step: .01, help: 'Darkens the corners of the screen.' },
];
const PSX_PARAM = new Map(PSX_PARAMS.map(p => [p.key, p]));
// texture pickers: the shader project's own 64 px pictures (CC0) and the Kenney kit's colour map
const PSX_TEXTURE_SETS = { albedo: ['brick', 'checker', 'stone', 'grass', 'crate', 'metal', 'fence', 'colormap'], emission: ['runes', 'lava', 'ember'], matcap: ['chrome', 'gold', 'ember'] };
let psxFilmDraft = null;  // the look editor's unsaved film look while it previews on the film frame

function psxDefaults() { const o = {}; for (const p of PSX_PARAMS) o[p.key] = Array.isArray(p.def) ? [...p.def] : p.def; return o; }
// A full look: the defaults, then each partial look in order (unknown keys are dropped; validation reports them).
function psxMerge(...looks) { const o = psxDefaults(); for (const l of looks) if (l) for (const [k, v] of Object.entries(l)) if (PSX_PARAM.has(k)) o[k] = Array.isArray(v) ? [...v] : v; return o; }
// Only what differs from the defaults (what the scripts, the Code tab and the downloads carry), optionally one scope.
function psxCompact(look, scopes) {
  const o = {};
  for (const p of PSX_PARAMS) { if (scopes && !scopes.includes(p.scope)) continue; const v = look[p.key]; if (v !== undefined && JSON.stringify(v) !== JSON.stringify(p.def)) o[p.key] = v; }
  return o;
}
// Checks one partial look; scopes lists which settings are allowed where it sits (the film look or a model).
function validatePsxLook(look, scopes, err, where = 'psx') {
  if (!look || typeof look !== 'object' || Array.isArray(look)) { err(where + ' must be an object of PSX settings'); return; }
  for (const [k, v] of Object.entries(look)) {
    const p = PSX_PARAM.get(k);
    if (!p) { err(`${where}: unknown PSX setting "${k}"`); continue; }
    if (!scopes.includes(p.scope)) { err(`${where}: "${k}" belongs to ${p.scope === 'model' ? 'a placed model (assets[].psx)' : 'the film look (cinema.psx)'}`); continue; }
    if (p.type === 'range' || p.type === 'int') { if (!Number.isFinite(v) || v < p.min || v > p.max || (p.type === 'int' && !Number.isInteger(v))) err(`${where}: ${k} must be ${p.type === 'int' ? 'a whole number ' : ''}between ${p.min} and ${p.max}`); }
    else if (p.type === 'enum') { if (!Number.isInteger(v) || v < 0 || v >= p.options.length) err(`${where}: ${k} must be 0-${p.options.length - 1} (${p.options.join(', ')})`); }
    else if (p.type === 'color') { if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) err(`${where}: ${k} must be a color like #ffcc00`); }
    else if (p.type === 'vec2') { if (!Array.isArray(v) || v.length !== 2 || v.some(n => !Number.isFinite(n) || n < p.min || n > p.max)) err(`${where}: ${k} must be two numbers between ${p.min} and ${p.max}`); }
    else if (p.type === 'texture') { if (typeof v !== 'string' || !(v === '' || PSX_TEXTURE_SETS[p.set].includes(v) || PSX_TEXTURE_SETS.albedo.includes(v) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 200000)) err(`${where}: ${k} must be one of ${[...new Set([...PSX_TEXTURE_SETS[p.set], ...PSX_TEXTURE_SETS.albedo])].join(', ')} or a small picture (data URL)`); }
  }
}

// ---------- textures ----------
const PSX_TEX = { cache: new Map(), loading: new Map() };
const psxSolid = rgba => { const t = new THREE.DataTexture(new Uint8Array(rgba), 1, 1, THREE.RGBAFormat); t.needsUpdate = true; return t; };
const PSX_BLACK = psxSolid([0, 0, 0, 255]), PSX_WHITE = psxSolid([255, 255, 255, 255]);
// A picker value as a texture: a built-in name (from the manifest), a data URL ("Your picture...") or '' (none).
// Nearest filtering and repeating, like a console texture; seekFilm waits for pending loads (psxReady). gltf: for a
// glTF model, whose UVs count from the top of the picture (flipY off; the palette models drew the wrong colours).
function psxLookTexture(key, gltf = false) {
  if (!key) return null;
  const id = (gltf ? 'gltf:' : '') + key;
  if (PSX_TEX.cache.has(id)) return PSX_TEX.cache.get(id);
  const url = key.startsWith('data:') ? key : CAST.manifest?.psxLook?.textures?.[key] && 'assets/' + CAST.manifest.psxLook.textures[key];
  if (!url) return null;
  const t = new THREE.Texture(); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.flipY = !gltf; t.name = key.startsWith('data:') ? 'your picture' : key;
  PSX_TEX.cache.set(id, t);
  PSX_TEX.loading.set(id, new Promise(ok => { const img = new Image(); img.onload = () => { t.image = img; t.needsUpdate = true; PSX_TEX.loading.delete(id); ok(t); }; img.onerror = () => { PSX_TEX.loading.delete(id); console.warn('PSX texture did not load', t.name); ok(null); }; img.src = url; }));
  return t;
}

// ---------- material ----------
// Settings shared by every PSX material of one view (the film, or the editor's preview): updated each frame, never
// recompiled.
function psxViewUniforms() {
  return { psxGrid: { value: new THREE.Vector2(180, 320) }, psxPixel: { value: 3 }, psxSnap: { value: 1 }, psxJitter: { value: 0 }, psxJitterRate: { value: 12 }, psxTime: { value: 0 },
    psxAffine: { value: 1 }, psxAffineLimit: { value: .35 }, psxFilter: { value: 0 }, psxVcm: { value: 1 }, psxFogAmount: { value: 0 }, psxFogColor: { value: new THREE.Color() },
    psxFogStart: { value: 8 }, psxFogEnd: { value: 30 }, psxLevels: { value: 31 }, psxDither: { value: 1 }, psxShadows: { value: 1 } };
}
// Settings of one material (one model's look); a material without its own look gets the defaults. They live in a
// WeakMap, not in userData: material.clone() copies userData through JSON, which textures and colours cannot pass.
const PSX_MAT = new WeakMap();
function psxModelUniforms(look) {
  const u = { psxTint: { value: new THREE.Color(1, 1, 1) }, psxUvScale: { value: new THREE.Vector2(1, 1) }, psxUvOffset: { value: new THREE.Vector2() }, psxUvScroll: { value: new THREE.Vector2() },
    psxLit: { value: 1 }, psxGlow: { value: 0 }, psxEmissionMap: { value: PSX_BLACK }, psxEmissionStrength: { value: 1 }, psxMatcapMap: { value: PSX_WHITE }, psxMatcapAmount: { value: 0 },
    psxBillboard: { value: 0 }, psxCutout: { value: 0 } };
  if (look) psxSetModelUniforms(u, look);
  return u;
}
const psxLinear = hex => new THREE.Color(hex).convertSRGBToLinear();
function psxSetModelUniforms(u, look) {
  const l = psxMerge(look);
  u.psxTint.value.copy(psxLinear(l.albedo_color)); u.psxUvScale.value.fromArray(l.uv_scale); u.psxUvOffset.value.fromArray(l.uv_offset); u.psxUvScroll.value.fromArray(l.uv_scroll);
  u.psxLit.value = l.lit; u.psxGlow.value = l.glow; u.psxEmissionMap.value = psxLookTexture(l.emission_tex) || PSX_BLACK; u.psxEmissionStrength.value = l.emission_strength;
  u.psxMatcapMap.value = psxLookTexture(l.matcap_tex) || PSX_WHITE; u.psxMatcapAmount.value = l.matcap_amount; u.psxBillboard.value = l.billboard; u.psxCutout.value = l.cutout;
}
// One view's shared settings for a frame of w x h pixels. refWidth: the width pixel_size is measured on.
function psxSetViewUniforms(u, look, w, h, refWidth, time) {
  const px = Math.max(1, look.pixel_size) * w / refWidth;
  u.psxPixel.value = px; u.psxGrid.value.set(w * .5 / px, h * .5 / px); u.psxSnap.value = look.snap_strength; u.psxJitter.value = look.jitter; u.psxJitterRate.value = look.jitter_rate;
  u.psxTime.value = time; u.psxAffine.value = look.affine; u.psxAffineLimit.value = look.affine_limit; u.psxFilter.value = look.texture_filter; u.psxVcm.value = look.vertex_color_mix;
  u.psxFogAmount.value = look.fog_amount; u.psxFogColor.value.copy(psxLinear(look.fog_color)); u.psxFogStart.value = look.fog_start; u.psxFogEnd.value = look.fog_end;
  u.psxLevels.value = 2 ** look.color_bits - 1; u.psxDither.value = look.dither_amount; u.psxShadows.value = look.shadows;
}
const PSX_GLSL_COMMON = `
float psxBayer(vec2 cell){vec2 a=mod(cell,2.),b=mod(floor(cell*.5),2.);return 4.*(2.*a.x+3.*a.y-4.*a.x*a.y)+(2.*b.x+3.*b.y-4.*b.x*b.y);}`;
// The material: injected into a MeshStandard/Phong/Toon program. this = the material (three calls onBeforeCompile on
// it), view = the view's shared uniforms. A material without a texture of its own gets plain UVs (it has no uvTransform).
function psxInjectShader(shader, material, view) {
  let mu = PSX_MAT.get(material); if (!mu) PSX_MAT.set(material, mu = psxModelUniforms(material.userData.psxModelLook));
  Object.assign(shader.uniforms, view, mu);
  const m = material, threeUv = !!(m.map || m.specularMap || m.displacementMap || m.normalMap || m.bumpMap || m.roughnessMap || m.metalnessMap || m.alphaMap || m.emissiveMap || m.clearcoatMap || m.clearcoatNormalMap || m.clearcoatRoughnessMap || m.transmissionMap);
  const varyings = `
varying vec3 vPsxAffine;varying float vPsxFog;varying vec3 vLightFront;varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
varying vec3 vLightBack;varying vec3 vIndirectBack;
#endif
`;
  shader.vertexShader = '#ifndef USE_UV\n#define USE_UV\n#endif\n' + shader.vertexShader
    .replace('#include <common>', `#include <common>
#include <bsdfs>
#include <lights_pars_begin>
uniform vec2 psxGrid,psxUvScale,psxUvOffset,psxUvScroll;uniform float psxSnap,psxJitter,psxJitterRate,psxTime,psxFogAmount,psxFogStart,psxFogEnd,psxBillboard;${varyings}
float psxHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}`)
    .replace('#include <uv_vertex>', (threeUv ? '#include <uv_vertex>' : 'vUv=uv;') + '\nvUv=vUv*psxUvScale+psxUvOffset+psxUvScroll*psxTime;')
    .replace('#include <project_vertex>', `#include <project_vertex>
if(psxBillboard>.5){vec3 c=modelMatrix[3].xyz,s=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));
 vec3 r=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),u=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
 if(psxBillboard>1.5){u=normalize(modelMatrix[1].xyz);r=normalize(cross(u,vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2])));}
 mvPosition=viewMatrix*vec4(c+r*transformed.x*s.x+u*transformed.y*s.y,1.);gl_Position=projectionMatrix*mvPosition;}
float psxW=max(gl_Position.w,.0001);
if(gl_Position.w>.0001&&(psxSnap>0.||psxJitter>0.)){vec2 ndc=gl_Position.xy/gl_Position.w;
 if(psxJitter>0.){float id=floor(psxTime*psxJitterRate);ndc+=(vec2(psxHash(transformed*7.+id),psxHash(transformed*7.-id+3.1))-.5)*psxJitter/psxGrid;}
 gl_Position.xy=mix(ndc,floor(ndc*psxGrid+.5)/psxGrid,psxSnap)*gl_Position.w;}
vPsxAffine=vec3(vUv*psxW,psxW);
vPsxFog=psxFogAmount*clamp((length(mvPosition.xyz)-psxFogStart)/max(psxFogEnd-psxFogStart,.001),0.,1.);`)
    .replace('#include <fog_vertex>', '#include <fog_vertex>\n#include <lights_lambert_vertex>');
  shader.fragmentShader = '#ifndef USE_UV\n#define USE_UV\n#endif\n' + shader.fragmentShader
    .replace('#include <common>', `#include <common>
uniform float psxPixel,psxAffine,psxAffineLimit,psxFilter,psxVcm,psxLevels,psxDither,psxShadows,psxLit,psxGlow,psxEmissionStrength,psxMatcapAmount,psxCutout;
uniform vec3 psxFogColor,psxTint;uniform sampler2D psxEmissionMap,psxMatcapMap;${varyings}${PSX_GLSL_COMMON}
// colour bits on the displayed value (as the console's 15-bit colour, and the viewer's look): in linear light the low
// levels are big steps in the dark channels, which made 3-bit colour a loud red-green speckle
vec3 psxRetro(vec3 c){float t=(psxBayer(floor(gl_FragCoord.xy/max(psxPixel,1.)))+.5)/16.-.5;vec3 d=LinearTosRGB(vec4(clamp(c,0.,1.),1.)).rgb;return sRGBToLinear(vec4(clamp(floor(d*psxLevels+t*psxDither+.5)/psxLevels,0.,1.),1.)).rgb;}
vec4 psx3Point(sampler2D tex,vec2 uv){
#if __VERSION__ >= 300
 vec2 size=vec2(textureSize(tex,0)),p=uv*size-.5,f=fract(p),b=floor(p)+.5;vec4 c00=texture2D(tex,b/size),c10=texture2D(tex,(b+vec2(1.,0.))/size),c01=texture2D(tex,(b+vec2(0.,1.))/size);
 if(f.x+f.y>1.){vec4 c11=texture2D(tex,(b+1.)/size);return c11+(1.-f.x)*(c01-c11)+(1.-f.y)*(c10-c11);}return c00+f.x*(c10-c00)+f.y*(c01-c00);
#else
 return texture2D(tex,uv);
#endif
}`)
    .replace('#include <shadowmap_pars_fragment>', '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
    .replace('#include <map_fragment>', `vec2 psxUv=vUv;{vec2 shift=vPsxAffine.xy/max(vPsxAffine.z,.0001)-vUv;shift*=psxAffineLimit/(psxAffineLimit+length(shift));psxUv=vUv+shift*psxAffine;}
#ifdef USE_MAP
vec4 texelColor=psxFilter>.5?psx3Point(map,psxUv):texture2D(map,psxUv);texelColor=mapTexelToLinear(texelColor);diffuseColor*=texelColor;
#endif`)
    .replace('#include <color_fragment>', `#if defined(USE_COLOR_ALPHA)
diffuseColor*=mix(vec4(1.),vColor,psxVcm);
#elif defined(USE_COLOR)
diffuseColor.rgb*=mix(vec3(1.),vColor,psxVcm);
#endif`)
    .replace('#include <alphatest_fragment>', '#include <alphatest_fragment>\nif(psxCutout>0.&&diffuseColor.a<psxCutout)discard;')
    // the lit part of the colour is multiplied by the vertex light, the rest (lit < 1, glow, emission, metal) is added
    // as it is; the fog replaces both, so it is not dimmed by the light. The material's own emissive stays.
    .replace(/vec3 outgoingLight = [^;]+;/, `vec3 psxBase=psxRetro(diffuseColor.rgb*psxTint);
vec3 psxMetal=psxRetro(sRGBToLinear(texture2D(psxMatcapMap,vec2(normal.x*.5+.5,normal.y*.5+.5))).rgb*psxTint);
float psxUnlit=clamp(1.-psxLit+psxGlow,0.,1.);vec3 psxGlowing=sRGBToLinear(texture2D(psxEmissionMap,psxUv)).rgb*psxEmissionStrength;
#ifdef DOUBLE_SIDED
vec3 psxDirect=gl_FrontFacing?vLightFront:vLightBack,psxIndirect=gl_FrontFacing?vIndirectFront:vIndirectBack;
#else
vec3 psxDirect=vLightFront,psxIndirect=vIndirectFront;
#endif
float psxShadow=1.;
#ifdef USE_SHADOWMAP
psxShadow=mix(1.,getShadowMask(),psxShadows);
#endif
vec3 outgoingLight=psxBase*psxLit*(1.-psxMatcapAmount)*(1.-vPsxFog)*(psxDirect*psxShadow+psxIndirect)*RECIPROCAL_PI+(psxBase*psxUnlit*(1.-psxMatcapAmount)+psxMetal*psxMatcapAmount+psxGlowing)*(1.-vPsxFog)+psxFogColor*vPsxFog+totalEmissiveRadiance;`);
}
// the film's view: one set of shared settings for every material in the film
const PSX_FILM_U = psxViewUniforms();
function psxFilmShader(shader) { psxInjectShader(shader, this, PSX_FILM_U); }

// ---------- screen ----------
function psxScreenUniforms() { return { psxScreenAmount: { value: 1 }, psxScreenPx: { value: 3 }, psxScreenLevels: { value: 31 }, psxScreenDither: { value: 1 }, psxScreenGrain: { value: 0 }, psxScreenVignette: { value: 0 }, psxScreenTime: { value: 0 } }; }
function psxSetScreenUniforms(u, look, w, refWidth, time) {
  u.psxScreenAmount.value = look.screen_amount; u.psxScreenPx.value = Math.max(1, look.screen_pixel_size) * w / refWidth; u.psxScreenLevels.value = 2 ** look.screen_color_bits - 1;
  u.psxScreenDither.value = look.screen_dither; u.psxScreenGrain.value = look.grain; u.psxScreenVignette.value = look.vignette; u.psxScreenTime.value = time;
}
// psx_screen.gdshader: every screen pixel inside one console pixel reads the colour at its middle, which is then
// reduced to the colour bits with the dither, a little grain (24 times a second, on the film clock) and a vignette.
const PSX_SCREEN_GLSL = `uniform float psxScreenAmount,psxScreenPx,psxScreenLevels,psxScreenDither,psxScreenGrain,psxScreenVignette,psxScreenTime;${PSX_GLSL_COMMON}
float psxHash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 psxScreenCell(vec2 uv,vec2 res){return floor(uv*res/psxScreenPx);}
vec2 psxScreenUv(vec2 uv,vec2 res){return psxScreenAmount>0.?(psxScreenCell(uv,res)+.5)*psxScreenPx/res:uv;}
vec3 psxScreenColor(vec3 c,vec2 uv,vec2 res){vec2 cell=psxScreenCell(uv,res);float t=(psxBayer(cell)+.5)/16.-.5;
 c=clamp(floor(c*psxScreenLevels+t*psxScreenDither+.5)/psxScreenLevels,0.,1.);c+=(psxHash12(cell+floor(psxScreenTime*24.)*17.)-.5)*psxScreenGrain;
 vec2 d=uv-.5;return c*(1.-psxScreenVignette*smoothstep(.25,.8,length(d*vec2(1.,.8))*1.4));}`;

// ---------- the film ----------
// The film's PSX look this frame: the editor's draft while it previews on the film, otherwise the film look with the
// shot's own on top. Called from renderFilm (named step) with the post pass and the frame size.
function psxFilmFrame(post, shot, w, h) {
  const look = psxFilmDraft || psxMerge(CINEMA.psx, shot?.cinema?.psx);
  psxSetViewUniforms(PSX_FILM_U, look, w, h, 1080, T);
  psxSetScreenUniforms(post.uniforms, look, w, 1080, T);
  return look;
}
// A placed model's own look (asset.psx): the model gets private copies of its materials carrying that look. Called
// from instantiateScenarioAssets, and from psxAttach for PSX models whose file arrives later.
function psxApplyAssetLook(root) {
  const look = root.userData.psxLook; if (!look) return;
  const copies = new Map(), tex = psxLookTexture(look.albedo_tex, true);  // catalog models are glTF
  root.traverse(o => {
    if (!o.isMesh || !o.material || o.name === 'PSX stand-in') return;
    const swap = m => {
      if (m.userData.psxOwner === root.uuid) return m;
      if (!copies.has(m)) {
        const c = m.clone(); c.userData = { ...c.userData, psxOwner: root.uuid, psxShared: false, psxModelLook: look };
        PSX_MAT.set(c, psxModelUniforms(look)); if (tex) { c.map = tex; c.needsUpdate = true; }
        copies.set(m, c);
      }
      return copies.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  // a person's skin and top garment stay the ones the engine tints (zombie, palette colour)
  const p = typeof workshopActors !== 'undefined' && workshopActors.get(root);
  if (p) { if (copies.has(p.skM)) p.skM = copies.get(p.skM); if (copies.has(p.shM)) p.shM = copies.get(p.shM); }
}
