# Frame Studio

A browser film engine: Three.js r128 plays a scenario JSON as a 9:16 portrait film (1080x1920 delivery) with procedural characters, a shot timeline, audio and MP4/WebM export. It will be deployed to Vercel.

## Standing rules (every step)

1. **Screenshots for anything visual.** Use the `workflow-progress-screenshots` skill: send real renders (start, key moment, result) as files as the work progresses, and look at every image before sending it.
2. **End every step with an `audit-verify-explain-grade-5` summary:** what changed, why it matters, how it was verified, what is still not proven.
3. **Never wrap functions. Edit them.** Do not write `const fooV1 = foo; foo = function (...) { fooV1(...) }`, replace a function from a later file, declare it twice, or override a method like `renderer.render`. Change the original definition in place. `tools/check-wrappers.mjs` enforces this and runs before every build (`prebuild`), so a wrapper fails the build.
4. **Commit only after the user says "approved", then push.** Until then, leave changes uncommitted and show them. After each approved commit, push to GitHub (`git push`, remote `origin` = https://github.com/Amashing0411/frame-studio, public).

## Layout

A Vite static site (`npm run build` → `dist/`, deployable to Vercel as is).

- `index.html`: page markup. `<!-- classic-scripts -->` marks where the three scripts are injected.
- `classic.config.js`: **load order** of everything. The app is three classic (non-module) scripts sharing one global scope, exactly like the original single file: `vendor` (npm libraries), `engine`, `studio`. Each is its listed files joined in order. Add new source files here.
- `src/engine/00-15-*.js`: the core engine (renderer, sky/weather, helpers, scenery, vehicles, characters, world build, fx, state, navigation, faces/poses, life, camera, validation, step, samples).
- `src/studio/*.js` and `src/assets/*.js`: the studio layer, numbered in load order across both folders (`assets/` holds asset definitions: archetypes, recipes, mesh factory, character style v3, world revamp).
- `src/styles/studio.css`, `src/styles/theme.css`: the two original style blocks (theme overrides studio).
- `public/favicon.ico`: served at the site root.
- Live site: https://frame-studio-sage-psi.vercel.app/ (Vercel, deploys from `main`).
- `vercel.json`: Vercel build settings (Vite, `npm ci`, `npm run build`, output `dist`) and headers (immutable caching for `/assets/*`, `nosniff`, referrer policy). Node is pinned to 22.x in `package.json` `engines`.
- `tools/serve-dist.mjs [dist] [port]`: serves a build with the `vercel.json` headers, like Vercel does (launch config `vercel-local`, port 4174).
- `tools/vite-classic-scripts.js`: Vite plugin that serves the bundles in dev and emits hashed files on build. Applies vendor patches (see below) and fails the build if a patch stops matching.
- Vendor: `three@0.128.0` (build + examples/js OrbitControls, SkeletonUtils, GLTFLoader, GLTFExporter), `mp4-muxer@5.2.1`, `webm-muxer@5.1.3` with one patch in `classic.config.js` (keeps the last frame in the WebM duration).
- Still classic scripts (shared globals). Every function now has exactly one definition, so converting to ES modules is possible later, but it is not required.
- Some engine functions read studio variables (`fix`/`shotCam` → `authoredCamShot`, `build`/`resetWorld` → `worldLife`, `toyPerson` → v3 tables). That works because nothing calls them while the scripts are still loading. Do not add top-level calls to engine or studio functions in the middle of the load order; boot work belongs in `initializeWorkshop()`, called from `src/studio/99-boot.js` (always the last file; add new files before it, and restart the dev server after editing `classic.config.js`).
- Features that extend a core function do it as a **named step the core calls** (e.g. `validate()` runs `validateScenario` then `validateCameraFields`, `validateCinemaAndMoments`, ...; `step()` ends with `applyCrowdLOD`, `updateWorldLife`, `updateFloodCamera`). Add a new step the same way: write a named function in the feature's file and call it from the core function.
- **Ground heights**: people, vehicles and props stand at y=0, so every walking surface tops out within 2 cm of it. City: `CITY_TOP` / `citySlab` / `cityTopAt` in `src/engine/06-world.js` (road .006, plaza .012, pavement .018, markings .010, upper layers with a polygon offset so thin markings do not flicker far away); puddles, litter and `floodDepthAt` read the same table. Biomes (`buildBiome`): land at -.004 (the island keeps -.08), the coast's sea gets a `Seabed` at -.08. Before this, roads were at .10-.11 and pavements at .14-.15, over everyone's feet.
- **Material palette** (`src/studio/07-workshop.js`): `paletteMaterial(key, make)` / `toyPalette(color, extra)` share one material per look. Palette materials are never edited in place: the city clay finish and cinema finishes swap in cached variants (`paletteVariant`). Materials that change per object must stay private: a person's skin, clothing and dark eye material (zombie tint, `resetWorld`), window walls (lights), water, debris.
- **Safe zones** (`src/studio/18-safe-zones.js`): `SAFE_ZONES` (YouTube Shorts, TikTok, Both, in 1080x1920 pixels from the user's templates), `UI.safeZone` (default `both`, saved with the project) and `UI.safeGuides`. The guides are a separate canvas over the film (`#safeCanvas`), so they never reach exports. With a zone selected, `drawStandardOverlay`, `drawWorkshopOverlay`, the end card and `drawSpeech` lay text and balloons out inside `safeArea()`; Off keeps the classic layout exactly. Warnings: `validateSafeZoneText` (title/caption shrinks below 75%) in the `validate()` pipeline, and `checkSafeZoneSubjects()` (one simulated pass, run after Validate or a zone change) for camera subjects under the interface or out of frame.
- `reference/workshop-original.html`: the original single file, unchanged. `reference/v1.html`: an earlier version. Do not edit either.
- `reference/frames/`: 16 reference frames (market 0:00/0:09.5/0:21/0:30, earthquake, outbreak and the coast world at 4 shot midpoints each), plus `manifest.json` with SHA-256 hashes.
- `perf/budgets.json`: per-story limits (draw calls, triangles, objects, materials, geometries) we must stay under; `perf/stats-step1.json`, `perf/stats-step2.json`: measurements behind them.
- `tools/check-wrappers.mjs` (wrapper gate), `tools/scene-stats.mjs` (counts + budget check), `tools/capture-finishes.mjs` (frames under every cinema finish + Asset studio isolation), `tools/verify-step.sh` (all gates).
- `tools/lib/chrome.mjs`: headless Chrome helper used by the test tools.
- `tools/extract-vocabulary.mjs <url> <out.json>`: the scenario vocabulary read from the running engine (+ a `.md` copy). Use it to keep the skills in sync.
- `skills/`: source of the `film-engine-maintainer` and `whatif-director` skills (packaged with skill-creator and installed in the app). Update them whenever the architecture, the workflow or the vocabulary changes.
- `design/DESIGN.md` + `design/design-tokens.json`: the character style sheet (Step 6; `current` = shipped models, `target` = procedural direction B). `design/model-rubric.md`: the blind review rubric (7 criteria, performance by formula: 9k triangles / 16 draw calls per character). `design/model-review-round1.json`: the Step 6 scores.
- **Chosen model direction (Step 6): C, downloaded models.** `public/models/poly-octopus.glb` is **CC-BY 3.0: the credit "Octopus by Poly by Google, CC-BY 3.0" must appear wherever it is shown** (credits screen, README, exports that use it). `public/models/CREDITS.md` lists every model, its license and source; add a row for every new model.
- **Runtime assets live on Vercel's static CDN** under `public/assets/` (served at `/assets/`), listed in `public/assets/manifest.json` (`tools/build-manifest.mjs`). Caching: `/assets/*` is immutable for a year, so model URLs in the manifest carry a content hash (`people/u-man.glb?v=<sha>`; a rebuilt model gets a new URL) and the manifest itself is revalidated on every load (`vercel.json`). The engine loads models from the manifest instead of building them in code. Pipeline: Blender scripts in `tools/blender/` build the GLBs (`blender -b --factory-startup -P tools/blender/<script>.py -- [--only id,id] [--skip-anims] [--skip-models]`), then `node tools/optimize-assets.mjs` (prune, dedup, keyframe resample, quantized normals/weights/colours; **never sparse accessors or quantized positions: three r128's GLTFLoader cannot read them**) refreshes the manifest, and `node tools/check-assets.mjs [url]` loads every listed file with the engine's own loader (part of `tools/verify-step.sh`).
- **People cast (Step 7, rebuilt in Blender)** (`src/assets/19-cast.js`, `tools/blender/build_people.py`): 21 Quaternius CC0 bodies from two packs ("U": 31-bone rig, "M": 60-bone rig), sources fetched by `node tools/build-cast.mjs` into `qa/cast-src/` (CC0 check, credits table). The Blender build normalises each model (metres, soles at 0, a height per character), **fixes the rig** (feet become children of the shins, IK helper bones removed, and **real ankles**: the packs put the foot bone at the back of the heel on the sole and skin the heel to the shin, so pointed toes split the shoe and sank the toes; `fix_rig` moves the joint to the ankle, 8 cm for a 1.76 m body, centred in the leg, and skins everything below it to the foot, recording `feet: {ankle, heel, toe}` in the manifest), adds **face controls** as shape keys on a small split-off mesh (`blink`, `brow_up`, `brow_angry`, `brow_sad`; no mouth is added: U keeps its sculpted lips, M is designed without one), and exports `public/assets/people/<id>.glb`. Per family it retargets the **Quaternius Universal Animation Library** (CC0, `qa/asset-src/ual`, gitignored) plus the packs' Wave/Clapping onto the reference model (world-space rotation deltas, limb rest directions aligned, fingers hold a relaxed curl instead of following the library) and exports `anim-u.glb` / `anim-m.glb` (32 clips: idle, talk, walk, run, sprint, crouch, sit, jump, dance, swim, fall, wave, cheer, point, think, carry, zombie, cower, sleep, phone...). Posed clips (point, think, carry, zombie, cower, sleep) are a library clip with bones aimed at fixed directions (`POSED`).
  - Engine: `toyPerson` builds the jointed rig as before, then `attachCastBody` fits its joints to the model (the rig is no longer drawn but the engine's IK, camera, balloons and safe-zone checks read it), moves accessories/props onto the model's bones (glasses and masks onto the model's eyes, found from its blink morph), keeps skin and top garment private (`p.skM`/`p.shM`: zombie tint, `resetWorld`, palette colour) and makes an `AnimationMixer` with the family clips. `castClipsFor` adapts the reference model's clips to each model: only rotations and the pelvis position play (baked joint offsets would pull joints to the reference's proportions), bones whose rest orientation differs from the reference's (some M models roll their legs 90°) get their rotations re-expressed (`q' = Kparent^-1 q Kbone`), and the pelvis track is scaled by leg length. Heel and toe ground points come from the manifest's `feet`. `poseCastBody` (named step at the end of `poseJointedRig`) picks the clip for the state, crossfades over 0.25 s on the simulation clock (`stepCount`), advances walk/run/zombie/carry clips by **distance walked** (strides per family in the manifest) so feet plant, puts the lower foot on the floor for grounded clips (`castGround`), sets blinks/brows from the expression, and moves the rig's head to the model's head. Catalog actors with a cast body skip the catalog's own two-pose blend (`updateCatalogInstances`); a second `talk` pose in the same tick (13-talking) only flags talking. `syncCastBodies` (renderFilm / Asset studio) releases people no longer in any scene. Children: adult model at child scale with a 1.28 head. If the assets fail to load, people keep their procedural bodies (the smoke test checks they loaded).
  - `lab/lineup.js` + `tools/capture-lineup.mjs`, `lab/creature-lineup.js` + `tools/capture-creature-lineup.mjs`: candidate bodies/creatures in the market at film size.
- `lab/model-lab.js` + `tools/capture-lab.mjs [url] [outDir] [candidates]`: the Model Lab, turntables (front, 3/4, side, back, closeup) of any candidate under identical lights, plus triangles/draw calls/materials. `tools/aggregate-review.mjs [roundDir]`: combines blind reviewer JSON files and un-blinds them with `qa/review/key.json` (`qa/review/` is gitignored scratch).
- `qa/captures/`: scratch captures (gitignored).

## Commands

```
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/
npm run preview        # serves dist/ at http://localhost:4173 (needed by the two tests below)
npm run test:frames    # reference frames from the built site, compared with reference/frames/manifest.json
npm run test:smoke     # real-browser smoke test (boot, play, tabs, all 10 stories to the end, WebM+MP4 export, save, PNG)
npm run test:budgets   # scene counts per story against perf/budgets.json
npm run verify         # all gates: wrappers, frames, smoke, budgets (needs npm run preview; or: bash tools/verify-step.sh http://localhost:5173/)
```

To test exactly what Vercel serves: `npm run build`, start `vercel-local` (or `node tools/serve-dist.mjs dist 4174`), then `bash tools/verify-step.sh http://localhost:4174/`. After a deploy, run the same gates against the live URL.

Both test tools also take a file path or another URL, e.g. `node tools/smoke-test.mjs reference/workshop-original.html` for a baseline. Servers are in `.claude/launch.json` (`dev`, `preview`).

## Reference frames

The frame tool (`--safe off|youtube|tiktok|both` to force a zone) loads each story fresh (ignoring autosave), in the order market, earthquake, outbreak, coast, seeks with the app's own `seekFilm` (fixed 60 steps/s from 0:00) and saves the canvas pixels at 540x960. Repeated runs on this machine produce byte-identical PNGs almost always; since the film target became multisampled (Step 7 revision), a couple of edge pixels occasionally resolve one level apart, so `--compare` accepts a frame whose hash differs when at most 20 pixels differ by at most 2 levels (`NEAR`). Hashes are GPU-specific (recorded on an RTX 4060, Direct3D11); compare on the same machine.

Steps that promise "no visual change" must reproduce the hashes in `reference/frames/manifest.json`.

Three.js sorts opaque objects by material id, so changing which objects share a material shifts a few edge pixels where surfaces touch even when nothing else changed. To prove such a change is otherwise identical, compare with a fixed draw order (`renderer.setOpaqueSort` by renderOrder, depth, object id) before and after.

## Known issues

- `updateFloodCamera` lifts the camera after the frame is drawn, and the next `step()` places the camera again with `shotCam`, so the lift may not show during live playback (seek redraws hide it). Check when working on hazards.
- Textures: since Step 7 the people's bone textures are released when a story is rebuilt (texture count 67 / 70 / 70 / 8 across market, earthquake, outbreak, coast, was 235 growing to 778). Check the rest of the texture lifecycle in the performance step.
- The people assets are 9.9 MB, all loaded at boot (`loadCast`). Lazy loading by story, and trimming the clip libraries (1.8 / 1.0 MB), are performance-step items. The crowd and extras are posed only when on screen (`castDeferred` / `syncCastBodies`), so full-story simulation is back to pre-cast speed (smoke test: earthquake 13.8 s, outbreak 12.7 s; 24.5 / 24.2 s before deferral).
- The toon finish posterizes colors, so a few pixels on band edges can differ between runs; compare toon frames with a small tolerance.
- Fixed in Step 2: the outbreak was not repeatable because clouds, stars and rain were placed with unseeded `Math.random`; they now use their own seeded stream (`SKY`).

## Roadmap

Step 0 baseline → 1 Vite/Vercel project split → 2 remove patch layers → 3 update the film-engine-maintainer skill → 4 first Vercel deploy → 5 YouTube/TikTok safe zones → 6 choose model direction (done: C, downloaded glTF) → 7 characters (done: glTF cast, rebuilt in Blender) → **11 UI → 12 in-app guide → 8–10 models (creatures: Poly animals chosen, octopus CC-BY credit; vehicles: lineup in `tools/capture-vehicle-lineup.mjs`, direction still to choose; world; catalog)** → 13 performance → 14 release QA. The user moved the UI ahead of the model steps (2026-10-15).
