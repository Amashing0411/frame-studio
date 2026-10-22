# PSX overhaul plan (2026-10-22)

The whole film moves to the PSX packs in `C:\Users\HP\Desktop\ASSETS`: new people with the Universal Animation
Library, a full port of fcidade's PSX shader with an easy look editor, PSX streets and villages, the sky and ocean
shaders, and real sound from the NOX library (curated from 1.1 GB down to about 7 MB). Every pack is free to use
(the owner has the authors' permission); credits go in `public/models/CREDITS.md`.

Each phase ends the same way: real screenshots (start, key moment, result), all gates on a production build
(`bash tools/verify-step.sh http://localhost:4174/`), an audit-verify-explain-grade-5 summary, then the owner's
"approved" → commit → push → the same gates on the live site. Nothing is deleted without being put in an archive zip
first (`archive/frame-studio-*-v*.zip`, local).

## What is in the packs (measured)

| Pack | Content | Rig |
|---|---|---|
| Characters PSX 1.2 (superset of Characters_psx and both Extras packs) | 138 characters: 59 men (incl. 6 police, 2 firefighters, 2 doctors, 2 hazmat, 2 sheriffs), 58 women (8 police, 2 firefighters, 2 doctors, 2 hazmat, 2 exotic dancers), 21 killers/monsters. One mesh, one 512 px texture, 820-1,860 triangles each | Mixamo (`mixamorig:`), 33 core bones in all; 15 add thumbs (41), 3 more fingers (57), 38 full hands (65). **Not rigged: Monster, Monster_01-05** (6). Character_Female_01: texture link broken |
| UAL (Quaternius, CC0) | 43 clips on an Unreal-mannequin skeleton (`pelvis`, `thigh_l`...). We use 37 states now; unused: Death01, Jog, Idle_Torch, Pistol ×6, Sword ×2, Spell ×4, Hit_Head, Sitting_Exit | (animation source) |
| Personajes (elbolilloduro) | 6 low-poly people (~600 tris) | Mixamo 33 bones (same clips work) |
| Personajes terror (elbolilloduro) | 14 horror characters (8,300 tris total) | custom 25-bone rig (needs its own bone map) |
| Criaturas (elbolilloduro) | 3 creatures (ghoul, pale ghoul, antlered beast) | custom 51-bone rig (own map, or stay still) |
| Kenney Graveyard Kit (inside the PSX shader project, CC0) | 18 models: ghost, skeleton, crypt, graves, gravestones, fence, fire basket, pumpkin, trees | ghost/skeleton: node animation with their own clips (walk, attack...), no bones |
| Houses on the water | stilt houses (platforms, walls, columns, rusty corrugated roofs), boat, kitchen props | static |
| Roads | 72 road tiles (straight, corners, junctions), 19 bridge parts, 15 signs, card trees. Textures stored with `.001` names (relink needed) | static |
| Vegetation | 39 trees (1,450-8,650 tris: heavy), 30 rocks in 3 tints, grass patches, hut, camp props, sheriff's car | static |
| SourceCode (Godot sky shader) | day / sunset / night gradients, 2-layer parallax noise clouds, stars, sun, moon | - |
| PSX-Ocean-Surface | 2 scrolling pixelated water textures + noise waves | - |
| PSX shader project (fcidade, CC0) | `psx.gdshader` (+ double-sided, transparent, additive variants), `psx_screen.gdshader`, 6 looks, 13 textures (brick, checker, chrome, crate, ember, fence, gold, grass, lava, metal, runes, stone) | - |
| NOX Sound | 1,661 WAV, 48 kHz / 24-bit, 1.1 GB | - |
| Mini Market | still missing the same 16 textures | skip |

## Sound: what is kept (about 180 files, about 7 MB as MP3)

Converted with ffmpeg: mono 32 kHz (ambiences stereo), loops trimmed to 20-30 s with a crossfaded loop point,
loudness-matched, MP3 (decodes in every browser, Safari included; loops are crossfaded by the engine, so MP3 padding
does not click).

| Keep | Files | For the sound cue |
|---|---|---|
| Rain calm, rain strong | 2 | rain |
| Wind calm, wind in forest | 2 | wind |
| Sea loop, Iceland "Sea strong, big waves" (storm and tsunami surf), river moderate (flood), stream calm, waterfall calm | 5 | water |
| Forest birds, meadow birds (day), night, cicadas (tropical night, very Manila) | 4 | bird / night ambience |
| Big fire, campfire | 2 | fire |
| Eerie drone, cave drips | 2 | horror bed (zombie, killer stories) |
| Footsteps walk ×6 + run ×4 on 8 surfaces: tile (pavement), rock (street), gravel (rubble), grass, sand, wood (docks, stilt houses), water (wading), leaves | 80 | footstep (people near the camera, by surface) |
| Voices, women and men, 3-4 each: surprise, short laugh, sigh, nod ("mm-hm"), thinking ("hmm"), pain (screams), hit, cough (smoke, dust), breath (panting), effort | 66 | scream, crowd, talk/think reactions |
| Car: engine idle, driving loop, 2000 rpm, horn, door open, door close, start, stop; truck idle, driving loop, back door | 11 | traffic, horn |
| Neon light buzz, electric box hum, power-line hum, phone buzz ×2 | 5 | city night, blackout, phone action |

Dropped as redundant or not needed for films: the 210 Iceland footsteps (same surfaces again), snow / mud / metal
footsteps, all jump and landing sets, throat clearing and attack voices, the 14 São Miguel field recordings and the
other Iceland streams and waterfalls (same as the nature loops), all computer / laptop / tablet / router / console
hums, every car and truck interior sound (buttons, belts, keys, wipers, windows, glove box), the sample pack's cloth,
backpack, key and door sounds. Kept procedural (nothing in the library covers them): siren, helicopter, gunshots,
thunder, radio, music, ground rumble, impacts, zombie groans. The full library stays in `Desktop\ASSETS`.

## Phase 0: intake and cleanup

- `tools/intake-assets.mjs`: copies only the files the build needs from `Desktop\ASSETS` into
  `qa/asset-src/assets/<pack>/` (gitignored), with a manifest of sources (path, size, sha256), so builds never depend
  on the Desktop layout.
- Texture relinking for every converter: search the pack's texture folders, strip Blender's `.001` suffixes, report
  anything still missing (Roads, Female_01, Mini Market).
- `tools/build-sounds.mjs` (ffmpeg): the curated list above → `public/assets/sounds/*.mp3` + manifest section
  `sounds` (id, cue, loop, gain, duration, hash).
- Archive zip v2 (`archive/frame-studio-people-v1.zip`): the Quaternius people, `tools/build-cast.mjs`, their clips.

## Phase 1: people

- `tools/blender/build_psx_people.py` (CLI, reproducible; the Blender MCP is used to look at rigs and poses live
  while tuning): for the 132 rigged characters, import the Rig FBX + texture, convert to metres, soles at y = 0,
  facing -Y like the current cast, keep the 33 core bones (finger bones kept where present, never required),
  texture 256 px, one mesh, one material → `public/assets/people/<id>.glb`.
- Animation: retarget the UAL (mannequin) onto a Mixamo reference with a bone map, using the existing
  world-space-delta retarget code of `build_people.py` → `anim-x.glb`, one clip set for every character. All 37
  current states plus new ones: `jog`, `death`, `aim` / `shoot` / `reload` (pistol), `torch` (flashlight search),
  `sword` (killers), `hit_head`, `sit_exit`. Strides measured per clip for foot planting.
- The 6 unrigged monsters: fit a copy of the Mixamo skeleton to each mesh (joints placed from the mesh's proportions)
  and bind with automatic weights; checked in the Blender MCP viewport; if a monster deforms badly it stays as a
  still prop and says so in the report.
- Engine (`src/assets/19-cast.js`): family `x`; roles from names (police, firefighter, doctor/medic, hazmat, sheriff,
  zombie → monsters and killers, elder → older-looking models picked by hand, crowds → everyday people; the dancer
  models are never picked automatically). Models load on demand per story. One draw call per person (from 3-5).
- What goes: blink/brow faces (the models have painted faces) and glasses/masks accessories (outfits are complete);
  children become a scaled-down adult as now. Expressions show through clips, head movement, voices and the
  speech/thought balloons. Zombie tint becomes a whole-material tint for non-monster models.
- Also in the catalog: the 6 Personajes (same Mixamo clips), the Kenney ghost and skeleton with their own clips.
  Personajes terror and Criaturas get a custom bone map if the retarget holds up, otherwise they stay still.
- Done when: every role appears in the market, earthquake and outbreak; feet stay planted (camera probe and a
  foot-slide probe), no T-poses, zombie / fall / sit / death look right in close-ups; the Model studio animates them.

## Phase 2: PSX shader v2 and the look editor

- Port `psx.gdshader` fully: vertex snapping and jitter (on the film clock, so exports repeat), affine warping with
  `affine_limit`, nearest or N64 3-point filtering, per-vertex (Gouraud) lighting via Lambert variants of the
  materials, vertex fog with its own color, glow, emission texture, matcap metal, billboard (full / upright), alpha
  cutout, color bits and dither strength in the material; `psx_screen.gdshader` as the post pass (pixel size, color
  bits, dither, grain, vignette, amount). The double-sided, transparent and additive variants become material flags.
- Data: `cinema.psx` (film), `shot.cinema.psx` (per shot) and `asset.psx` (per placed model: texture, matcap,
  emission, cutout, billboard, uv scroll), validated, in the vocabulary and the skills.
- Look editor (More › Look › "PSX look", also a full-screen view like the itch viewer): live preview on the film
  frame or a small built-in scene (the Kenney graveyard and a torch-lit hall, as in the shader project), preset
  buttons (PS1, Graveyard, Horror fog, Clean (all off), Crunchy 3-bit, Shaky, N64, Chrome, Glowing runes, Texture
  swimming, Fence cutout, Billboard), a Parameters tab with the shader's own plain-language help for every slider,
  texture pickers with the 13 shader textures plus "Your picture…", a Code tab (the look as JSON), and Reset / Copy /
  Download / Apply to film / Apply to shot. Phone layout as a bottom sheet.
- Done when: every preset reproduces the shader project's look side by side, sliders change the preview in real time,
  exports match the preview, the default (natural) finish is pixel-identical to before.

## Phase 3: the world

- City (`06-world.js`, `04-vehicles.js`): the Roads kit replaces the road and pavement slabs (tops within 2 cm of
  y = 0); skyscrapers and city blocks replace the box buildings (earthquake tilt, damage and collapse moved onto
  them; lit windows from the textures at night); PSX cars, the police car, taxi and sheriff's car replace traffic;
  Roads card trees and PSX trees replace the palms; signs and bridges where they fit.
- New sets: Stilt village (Houses on the water, for coast, flood and tsunami stories), Forest camp (Vegetation:
  lighter trees, rocks, grass, hut, camp props), Graveyard (Kenney kit, night, for horror). Each is a world option
  and a world demo.
- Heavy trees: only the lighter ones near the camera, card trees far away, instancing for repeats.
- Done when: the earthquake, outbreak and city stories play in PSX streets with every hazard working, budgets hold,
  frames recaptured.

## Phase 4: sky and water

- Sky: port the SourceCode sky shader to a sky dome (time of day and weather drive day / sunset / night, cloud
  density follows `environment.clouds`, stars at night, sun and moon follow the lights); its noise textures are
  generated once from a seed (repeatable); replaces the sprite clouds, stars and sun/moon meshes.
- Water: port the PSX ocean (two scrolling pixelated textures from the pack's water picture at 512 px, noise waves on
  the film clock); flood and tsunami keep their water levels and fronts.
- Done when: every time of day and weather looks right in all stories, the PSX finish still applies, exports repeat.

## Phase 5: sound

- Engine (`04-audio.js`): a sample player beside the synthesizer; each cue picks its sound by story, weather, place
  and time (rain strength, night cicadas, surf size), varied by a seed (repeatable); footsteps from the people within
  ~25 m of the camera, by surface and gait, timed to the walk clip's foot contacts; voices on emotions and actions
  (scream on panic or zombie contact, cough in smoke and dust, laugh / sigh / hmm / nod with talk and thoughts,
  panting after running); car idles and drives on traffic, horns, doors on vehicle actions; the old synth stays for
  cues the library does not cover.
- Export: the offline mix (`renderOfflineEffects`) decodes the same files, same fades, ducking and loudness.
- Done when: every story has fitting sound, live and exported audio match (0 ms offset, same loudness), size ≤ 8 MB.

## Phase 6: catalog, speed, release

- Catalog: stilt-house parts, camp and kitchen props, signs, bridge, sheriff's car, Kenney graveyard models,
  Personajes; thumbnails, CREDITS, skills and AI vocabulary synced (`tools/sync-skill-assets.mjs`).
- Speed: the sun's shadow fitted to the camera view, instancing for crowds of the same model and repeated props,
  LOD for trees; budgets updated; phone performance checked.
- Release QA: all stories end to end on desktop and phone, live site gates.

## Prompts for each phase (paste one per session)

Every prompt names the skills to load, so the right ones are used every time instead of relying on automatic
matching. Three are in all of them: workflow-progress-screenshots and audit-verify-explain-grade-5 (CLAUDE.md
requires screenshots and the closing summary) and film-engine-maintainer (the engine's own guide).

Phase 0
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer,
> blender-scripting and iterate-until-verified. Phase 0 of design/overhaul-plan.md: build tools/intake-assets.mjs (copy what the builds need from
> C:\Users\HP\Desktop\ASSETS into qa/asset-src/assets with a source manifest), fix texture relinking in the
> converters (strip .001, search texture folders, report what is still missing), build the curated sound bank with
> tools/build-sounds.mjs exactly as the plan's sound table says, and archive the Quaternius people. Show me what was
> kept, sizes, and a listening page for the sounds. Don't ask about licences.

Phase 1
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer,
> blender-scripting, blender-render-automation and iterate-until-verified. Phase 1 of design/overhaul-plan.md:
> replace all people with Characters PSX 1.2. Build them in Blender (tools/blender/build_psx_people.py), retarget the
> Universal Animation Library onto the Mixamo rig including the new clips (jog, death, pistol, torch, sword, hit_head,
> sit_exit), rig the 6 unrigged monsters, map roles, load on demand, and wire them into the engine. Use the Blender MCP
> to check rigs and poses, and keep iterating until feet stay planted and no pose breaks. Show me close-ups of walk, run, zombie,
> sit, fall and death, and the three main stories, before and after.

Phase 2
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer,
> three-best-practices, impeccable, ui-ux-pro-max and emil-design-eng. Phase 2 of design/overhaul-plan.md: port
> fcidade's full PSX shader (material + screen) to the engine and build the PSX look editor like the itch.io viewer:
> presets, parameter groups with plain help, texture pickers, live preview (film frame and a graveyard demo scene),
> code tab, reset/copy/download/apply, phone-friendly. Show each preset next to the
> shader project's look.

Phase 3
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer,
> three-best-practices and optimize-threejs-games. Phase 3 of design/overhaul-plan.md: rebuild the city streets with
> the Roads kit, PSX buildings, cars and trees, keep every hazard working, and add the Stilt village, Forest camp and
> Graveyard sets as worlds and demos, within the budgets. Show
> the earthquake, outbreak and city stories before and after.

Phase 4
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer and
> three-best-practices. Phase 4 of design/overhaul-plan.md: port the sky shader (SourceCode) and the PSX ocean shader, driven by time of
> day, weather, clouds and the flood/tsunami water levels, repeatable for exports. Show every time of day and the
> flood and tsunami.

Phase 5
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer and
> iterate-until-verified. Phase 5 of design/overhaul-plan.md: add sample playback to the audio engine with the
> curated sound bank (ambiences, footsteps by surface, voices on emotions and actions, vehicles), keep the synth for
> uncovered cues, and make exports mix the same sound (0 ms offset, same loudness). Give me exported clips to listen to.

Phase 6
> Use the skills workflow-progress-screenshots, audit-verify-explain-grade-5, film-engine-maintainer,
> optimize-threejs-games, test-playable-web-games and whatif-director. Phase 6 of design/overhaul-plan.md: add the
> remaining props and sets to the catalog, fit the shadow to the camera, add instancing and LOD, update budgets, sync
> the skills and AI vocabulary, and run release QA on desktop, phone and the live site.
