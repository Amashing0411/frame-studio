# Frame Studio architecture

Contents: project files, load order and boot, the film loop, world and state, characters, cameras, materials and looks, catalog and assets, water hazards, audio, export and saving, tools.

## Project files

```
index.html                markup; <!-- classic-scripts --> is replaced by three <script> tags
classic.config.js         load order of every source file, per bundle (vendor, engine, studio) + the one vendor patch
vite.config.js            Vite + tools/vite-classic-scripts.js (cssMinify off)
src/engine/00-15-*.js     core engine (one script)
src/studio/*.js, src/assets/*.js   studio layer (one script), numbered in load order across both folders
src/styles/studio.css     the interface design system (light/dark tokens on :root, data-theme switch)
public/favicon.ico
reference/                workshop-original.html (pre-split single file), v1.html, frames/ (16 PNG + manifest.json)
perf/budgets.json         per-story limits; perf/stats-step*.json are the measurements behind them
tools/                    test and maintenance tools (below)
skills/                   source of this skill and whatif-director (packaged with skill-creator)
```

Vendor (npm, pinned): `three@0.128.0` (`build/three.min.js` + `examples/js` OrbitControls, SkeletonUtils, GLTFLoader, GLTFExporter), `mp4-muxer@5.2.1`, `webm-muxer@5.1.3` with one patch applied by the build (keeps the last video frame in the WebM duration; the build fails if the patch stops matching).

### Engine files (`src/engine/`)

| File | Contents |
|---|---|
| 00-renderer | `$`, math helpers `cl sm lp V`, seeded `rngf`, `R` (world) and `Q` (runtime) streams, `renderer`, `scene`, `camera` |
| 01-sky-weather | lights, sun/moon/cloud sprites, stars, rain lines (seeded `SKY` stream), `setTOD(timeOfDay, weather, hazard)` |
| 02-helpers | `mat` (flat material), `smat` (cached by colour), `mk` box, `cyl`, `ico`, `bgeo` (window UVs), `ex` (extruded profile), textures |
| 03-scenery | `palm tree bush bench bin litter cart tower house` (toy versions, bevelled) |
| 04-vehicles | `mkVeh(type, color)`: toy vehicles with wheels and suspension |
| 05-characters | `JK`/`IDLE` joint tables, `mkPerson(role)` → `toyPerson` |
| 06-world | `buildBaseWorld(seed, style, hz)` (deterministic city, disposes the old world) and `build()` (resets `worldLife`, builds, then the toy city finish `stylizeCityWorld` unless biome is not city or finish is classic) |
| 07-fx | rescue truck, helicopter, debris pool, sprite particle pool `emit`, fire light |
| 08-state | hubs `HUBS`/`Wp`, persistent state `S`, `resetWorld()`, `damage`, `makeZ` (zombie tint), `onShot` (event triggers) |
| 09-navigation | corridor graph: `route`, `moveTo`, `away` (never aim movement at an arbitrary point) |
| 10-faces-poses | `EMO`, `face()` (classic face, or `faceV2` for jointed rigs), `target()` pose targets, `updPersonState` (per-person state machine), `updPerson` (state machine → jointed pose from motion → flood swimming) |
| 11-life | birds, pigeons, dogs, clouds, rain, puddles, lightning, traffic lights |
| 12-camera | `fix()` lifts cameras out of buildings (not for the Divisoria set or authored cameras), `shotCam()` (authored camera, else preset camera) |
| 13-validation | vocabulary arrays `PRE MOV EVT CRW EMOS ZMB`, `KL`, `parse`, `validateScenario` (core rules), `validate` (pipeline of feature checks), `report` |
| 14-step | `step(dt, t)`: simulation, then `renderFilm()` + `composeFrame()` + `mix()`, then `applyCrowdLOD`, `updateWorldLife`, `updateFloodCamera` |
| 15-samples | `mkS` and the samples `SQ` (earthquake) and `SZ` (outbreak) |

### Studio files (`src/studio/`, `src/assets/`, numbered in load order)

| # | File | Contents |
|---|---|---|
| 01 | assets/archetypes | `CATALOG_BASE` (182 archetypes: id, category, kind, states, expressions, accessories, rig), presets (24 variants each), `rebuildArchetypeCatalog`, `rebuildCatalog` (archetypes + extensions + registered imports), `resolveCatalog` |
| 02 | assets/recipes | catalog builders `buildHuman buildCar buildBike buildBoat buildAircraft buildBuilding buildTree ...`, `cMaterial`, `buildArchetypeModel`/`buildCatalogModel`, `poseCatalogRig`/`applyCatalogPose`, biomes (`buildBiome`, `applyBiomeEnvironment`/`applyEnvironment`), scenario assets (`instantiateScenarioAssets`, `updateCatalogInstances`), `aimReferencedCamera`/`referencedCamera` |
| 03 | studio/transport | status/tabs/views, `configureRender`, `compileShots`, `prepareScene`, `validateAndCompile`, `validateOnly`, `seekFilm`, `renderCurrent`, playback, `showShotFields`/`selectShot` |
| 04 | studio/audio | `soundTypes` (keyword → channel, first match wins), sound plan, `createChannelNode`/`channelNode`, `mixChannels`/`mix` (adds live character voices), `silenceAudio` |
| 05 | studio/capture | `drawText`, `composeFrame` → `drawStandardOverlay`, video export (frame-by-frame with WebCodecs + muxers, or live MediaRecorder), `renderOfflineEffects`/`offlineSound` |
| 06 | studio/editor | asset browser and Asset studio viewer, asset edits, imported models (`loadModelFromSource`/`loadModelSource`, `deleteImported`), `cloneModel`, project state (`projectState`, `restoreProjectData`/`restoreProject`), `initializeStudio` |
| 07 | studio/workshop | `toyMaterial`, **palette** (`paletteMaterial`, `toyPalette`, `paletteVariant`, `isPalette`), toy geometry helpers, `toyPerson` = `restyleCharacter3(buildToyRig(opts))`, then `attachCastBody` when the cast has loaded |
| 08 | assets/mesh-factory | extension packs (`validateExtensionPack`, `installExtensionPack`), the market octopus (`octopusBasePack`/`octopusPack`), the Divisoria market set (`buildMarket`) |
| 09 | studio/cameras-save | market story data, `drawWorkshopOverlay`, imported-asset registration, story checklist ("production brief"), `loadMarketDemo`, `initializeWorkshop` (boot) |
| 10 | studio/rig | jointed toy rig `buildToyRig` (bones, skinned continuous limbs, face, clothes, props, accessories), IK, `faceV2`, `poseJointedRig`/`poseV2`, path gait, workshop crowd, `CINEMA` settings, camera solids |
| 11 | studio/camera-paths-chatter | cinema finishes (`applyFinish`, `applyCinemaMaterials`), film post pass (`makeFilmPost`, `renderFilm`), voices (`chatterSamples`, `dialogueList`, `voiceBuffer`), `marketStoryScenario`/`storyDemo`, cinema UI |
| 12 | studio/story-delivery | `updateTalkingFaces` |
| 13 | studio/talking | conversation (head turns, gestures), `applyConversationActions`/`applyConversation`, speech balloons and icons (`drawSpeech`), `validateSpeech` |
| 19 | assets/cast | glTF people (Step 7): `loadCast`, `castMergeModel` (once per model at load: every piece except skin, top garment, mouth and women's hair merged into one vertex-coloured mesh, morphs padded; 3-5 draw calls per person instead of 6-18), `castModelFor`, `attachCastBody` (fits the rig to the model, hides the procedural body, maps the face, private skin/top), `driveCastBody`, `syncCastBodies` (named step of `renderFilm` and the Asset studio render), `releaseCastBody` |
| 14 | assets/characters-v3 | v3 face, mouth visemes and mitten hands (`restyleCharacter3`), crowd level of detail (`applyCrowdLOD`), toy city finish (`stylizeCityWorld`, `softenCityMaterial`), `validateFinish` |
| 15 | studio/balloons | balloon layout helpers |
| 16 | assets/world-revamp | `worldLife` (swaying plants, physics litter), `wlMat`/`wlGeo` caches, `updateWorldLife` |
| 17 | studio/water-hazards | tsunami and flood (`floodState`, `updateFlood`, `updateFloodCamera`, `validateWaterHazard`); adds the water events and the water sound channel at load |
| 18 | studio/safe-zones | platform safe zones: `SAFE_ZONES`, `safeArea`, `safeTextBoxes`, the guides canvas (`drawSafeGuides`), `validateSafeZoneText`, `checkSafeZoneSubjects` |
| 99 | studio/boot | `initializeWorkshop();` (boot). Always the last file |

## Load order and boot

`vendor` → `engine` (00-15) → `studio` (01-17, then 99-boot). Each studio file runs top to bottom while loading; `99-boot.js` then calls `initializeWorkshop()`: `initializeStudio()` (UI wiring, catalog, autosave restore from localStorage), workshop panels, authored camera UI, cinema controls, then a fresh visit opens the market story (`loadMarketDemo(true)`). Only `rebuildArchetypeCatalog`, extension-pack setup and the octopus pack run during loading; everything else waits for boot. Engine functions may read studio variables (`authoredCamShot`, `worldLife`, the v3 tables) because they are only called after loading.

## The film loop

- Interface (Step 11): top bar, film stage, one side panel with four tabs (Story, Shot, Guide, More; phone: bottom bar + sheet). Every original element id is kept; `tabInspector(key)` / `tabLeft(key)` route into the tabs (`showPanel`, `openMoreSection` in `src/studio/20-ui-shell.js`). The Guide (`src/studio/21-guide.js`) is rebuilt from the live engine each time it opens. Camera/move picture buttons mirror the hidden `#shotPreset` / `#shotMove` selects (`syncChoiceMirrors`, called from `showShotFields`).
- `validateOnly()` (Validate button, labelled "Check story"; the full-film camera/safe-zone pass runs only from `#checkCameras`): reads cinema settings, `validateAndCompile()` parses the JSON in the editor, validates, compiles shots, `prepareScene()` (build world, reset state, instantiate assets), then refreshes camera solids and materials.
- `seekFilm(t)`: re-simulates from 0:00 with `step(1/60, …)` while `simulating`, then `renderCurrent()`. Deterministic, so it is what the frame tools use.
- `step(dt, t)`: simulation for the current shot (events in `onShot`, people, vehicles, debris, camera via `shotCam`), then if not simulating draws: `renderFilm()` (scene into a target, then the cinema post pass: depth of field, radial blur, bloom, vignette, grain, grade) and `composeFrame()` (titles, captions, clock or end card, speech and thought balloons on the 2D canvas `#output`).
- Shot timing: `shots[]` from `compileShots`; `cur` is the current shot; `END` = film length + end card seconds.

## World and state

- 1 unit = 1 metre, Y up. Two avenues cross at the origin (A along Z, B along X); road half-width 14, sidewalks |lateral| 14-19 (people walk at 16.5), plaza |x|,|z| < 48, buildings beyond. Every model faces +Z; `rotation.y = atan2(dx, dz)` faces (dx, dz).
- `S` holds persistent effects: `quaked, jam, evac, out, zinf, zsp, zc, scare`, arrays `plumes, fires, dmg`, `rescue`, `truck`. Apply in `onShot`, reset in `resetWorld`.
- Biomes: city (streets, crowd, traffic, hazards) or coast, ocean, sky, jungle, island, custom (catalog-only stages). `world.set: "divisoria"` builds the market set.

## Characters

- Every person is a jointed toy rig from `buildToyRig` (bones, continuous skinned arms and legs, face, clothes, props such as a phone and a parcel, optional accessories), restyled by `restyleCharacter3` (v3 eyes, brows, viseme mouth, mitten hands).
- **Since Step 7 the visible body is a glTF cast model** (`src/assets/19-cast.js`, 21 Quaternius CC0 models in `public/models/cast/`, built by `tools/build-cast.mjs`). `attachCastBody` moves the rig's joints onto the model's joints, so the rig stays the motion source for every state; the procedural body meshes are removed, the v3 face sits on the model's head, `p.skM`/`p.shM` point at the model's private skin and top materials. `syncCastBodies()` copies the final rig pose onto the glTF skeleton just before each render (after poses, catalog blends and talk look-ats), so **any new pose code must only move rig bones; never pose the glTF bones directly**. Hands follow the forearm (no hand copy), fingers curl with the rig's fingers, feet are IK bones placed at the shin ends. `p.ankleY`/`p.footX` are the foot targets in `poseJointedRig`. Children = adult model at child scale with a bigger head. If the cast fails to load, people keep the procedural body. Rig fields (`g pv sp ch hd fc phone news um mo mop hp kn sh el e p b bones arms legs F T j skM shM eyeP`) are read by poses, faces, cloning and the preview. Never reuse these names for other data on a person object.
- Poses: crowd people use `updPerson` (state machine → `poseV2` from motion); catalog actors use `applyCatalogPose`/`applyRigPose`; faces use `faceV2`. Joint sign conventions (limbs hang along -Y, model faces +Z): hip flexion forward = `-x`, knee bend `+x`, shoulder flex forward `-x`, elbow bend `-x`; left abduction `-z`, right `+z`.
- Crowd level of detail (`applyCrowdLOD`) hides faces and tiny parts on distant people, so "hidden" does not mean "unused".

## Cameras

Presets (`PRE`) with moves (`MOV`) around named hubs; `target_id` follows a placed asset (`referencedCamera`); authored cameras use `position`/`look` (+ `end_position`/`end_look`, `fov`). `fix()` keeps preset cameras out of buildings; `avoidCamera` steers around `cameraSolids` when `CINEMA.smartCamera` is on (a camera inside a solid moves along its line of sight to just in front of it; the nearest-face push-out only when the subject is inside too, because the nearest face can flip between steps); `referencedCamera(s,t,pos,look,dt)` eases that correction in (fast) and out (slowly) through `cameraEase`, snapping only on a cut, after `prepareScene` or when the eased camera would sit in a solid, and a zero-time redraw reuses the last offset (deterministic). Quake shake is scaled by the camera-to-subject distance. The flood step keeps the camera above water. `tools/camera-probe.mjs` lists uneven camera steps per story with their cause.

Live playback advances `T` continuously (`advanceTo(T+wall*speed)`, starting half a step off the 1/60 grid); the simulation still steps at a fixed 60/s and `renderCurrent` draws the camera at the exact time, so moves stay smooth at any refresh rate. Seeks and exports are unchanged. `adaptPreviewQuality` (20-ui-shell.js) steps the preview resolution down when frames arrive over 40 ms apart for 2 s; `phonePreviewDefault` starts phones at 360 x 640 once.

## Materials and looks

| Source | Use | Shared? |
|---|---|---|
| `mat(c)` (engine) | flat-shaded world parts | no (one per call) |
| `smat(c)` | cached by colour | yes (legacy cache, edited in place by finishes; leave as is) |
| `wallMat` | buildings; windows light up and go dark | no (changes per building) |
| `toyMaterial(c, extra)` | toy parts | no |
| `toyPalette` / `paletteMaterial` | character parts that never change | yes, never edit in place |
| `wlMat`, `char3Mat` | world-revamp and v3 face caches | yes (legacy caches) |
| `cMaterial` | catalog assets (with wear and shader modes) | no |

Finishes: `stylizeCityWorld` softens city materials once (`clayLook` flag); `applyCinemaMaterials(preset)` sets absolute values from each material's original surface (natural, soft, ceramic, faceted, toon, psx; the list is `FILM_FINISHES`). For palette materials both swap in cached variants instead.

PSX finish (ported from fcidade's CC0 PSX Godot shader): `psxShader` snaps vertices to the low-resolution grid (`PSX.grid`) and maps textures affinely (uv·w and w interpolated, divided per pixel: GLSL ES 3.0 has no `noperspective`); `psxTexture` switches maps to nearest filtering (original filters kept in a WeakMap: r128 textures have no userData). `renderFilm` draws into `p.psxTarget` (no MSAA, nearest) at output/k with k = round(width/360) (540 → 270, 720/1080 → 360), and the post pass reduces colour to 15 bits with a 4×4 Bayer dither on internal pixels; depth of field, bloom and grain are forced off.

## Catalog and assets

`CATALOG_BASE`: the 18 people archetypes (× 24 looks, built by `buildArchetypeModel` → `toyPerson` + the cast) and 121 PSX models (one look each, `kind: 'psx'`, added by `definePsxCatalog` from the manifest in `loadCast`; `src/assets/24-psx.js`). `buildCatalogModel(id, options)`: extension packs and registered imports first, then PSX (`buildPsxModel`: an invisible box of the model's size, filled with a shared-geometry clone when the file arrives; `psxReady()` is awaited by `seekFilm`, so exports and frame tools see loaded models), then people. `resolveCatalog` maps an old `.vNN` id of a PSX model to the model. PSX states are procedural (`posePsx`: wind/storm sway, sail bob, swim wiggle). `disposeCatalogModel` skips `userData.psxShared` geometry/materials. Pipeline: `tools/fetch-itch.py` → `tools/convert-itch.sh` (7-Zip, `tools/blender/convert_itch.py`, `tools/itch-dae2glb.mjs`) → `tools/build-psx.mjs` (table in `tools/psx-catalog.mjs`; writes the CREDITS rows) → `tools/build-manifest.mjs` → `tools/build-thumbnails.mjs` → `tools/sync-skill-assets.mjs`. The old procedural catalog (13 categories, 182 archetypes) is in `archive/frame-studio-catalog-v1.zip` (local, gitignored) and commit 083b45b. Scenario `assets[]` become `catalogInstances` with states, expressions, paths and actions over time (`updateCatalogInstances`). Extension packs are declarative JSON (nodes, shapes, animation tracks); imported GLB/GLTF models can be registered as an asset id.

## Water hazards

`hazard.type` tsunami or flood; water state is a pure function of time and the shot list (`floodState`). Events: `sea_retreat`, `tsunami_wave` (crest travels inland at 15 m/s, streets flood ~1.5 m), `flood_rise` (+0.75 m per shot, max 2.6), `flood_recede` (-0.9 m), `floating_debris`. Vehicles and litter float; people deeper than ~0.95 m swim; full water only in the city biome.

## Audio

Scenario `sfx` strings map to channels by `soundTypes` keywords (first match wins); events add their own sounds (`eventAudio`); characters have babble voices with stable profiles. Live playback uses Web Audio; frame export renders the soundtrack offline (`offlineSound`).

## Export and saving

Export: frame-by-frame (WebCodecs `VideoEncoder`/`AudioEncoder` + mp4/webm muxers, exact fps, 540/720/1080 wide) or live recording (MediaRecorder). Projects autosave to localStorage and save/open as `.frame-project.json` (scenario, UI, audio, edits, imported models, workshop packs, cinema).

## Tools

| Tool | Purpose |
|---|---|
| `tools/check-wrappers.mjs` | parser-based wrapper gate (`--list` for an inventory); runs as `prebuild` |
| `tools/capture-frames.mjs <url> [dir] [--compare manifest] [--stories a,b]` | reference frames from the film canvas |
| `tools/smoke-test.mjs <url> [results.json]` | 21 real-browser checks, downloads intercepted |
| `tools/scene-stats.mjs <url> [out] [--budget perf/budgets.json]` | objects, materials, geometries, WebGL-level draw calls and triangles per reference frame |
| `tools/capture-finishes.mjs <url> <dir> [--compare dir]` | frames under every cinema finish + Asset studio isolation |
| `tools/extract-vocabulary.mjs <url> <out.json>` | the scenario vocabulary from the running engine (+ `.md`) |
| `tools/camera-probe.mjs [url] [--only a,b] [--json out]` | uneven camera steps inside shots, per story, with causes |
| `tools/perf-probe.mjs [url] [--only a,b] [--json out]` | draw calls, shadow-pass share, GPU-synced ms per frame (median of 40), ms per step |
| `tools/verify-step.sh [url]` | wrappers + frames + smoke + budgets |
| `tools/lib/chrome.mjs` | headless Chrome over the DevTools Protocol (no dependencies) |
