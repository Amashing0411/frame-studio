---
name: film-engine-maintainer
description: Maintains and extends the user's Frame Studio film engine, the frame-studio Vite project (Three.js r128 classic scripts, procedural toy characters, a scenario JSON played as a 9:16 film, exported as MP4/WebM, deployed on Vercel). Use it for any change, bug, test or performance question in the engine or the studio UI, such as adding or fixing hazards (quake, zombie, tsunami, flood), events, camera presets, crowd behaviors, emotions, props, vehicles, catalog assets, sounds, weather, characters, faces, safe zones or export, or when a film looks wrong, runs slowly or crashes. Use it even if the user does not say "engine", and whenever the Director's vocabulary must be kept in sync.
---

# Film Engine Maintainer

Frame Studio is a browser film studio: a scenario JSON (written by the `whatif-director` skill) plays as a procedural 3D film in a 9:16 frame. This skill is how to change it safely. The project went through a cleanup in which 59 "patch layers" (functions wrapped over and over by later files) were collapsed. Most of the rules below exist to stop that from happening again, so follow the reasoning, not just the letter.

## Where the project is

- Local: `C:\Users\HP\Desktop\frame-studio` (git, remote `origin` = https://github.com/Amashing0411/frame-studio, public). If it is missing, clone it and run `npm install`.
- **Read the project's `CLAUDE.md` first.** It holds the user's standing rules (screenshots for anything visual, a plain-language summary at the end, never wrap, commit only after "approved" then push) and the current layout. If it disagrees with this skill, `CLAUDE.md` wins.
- Then read `references/architecture.md` (how the code is organized) and the matching recipe in `references/recipes.md`.

## How the code is put together (the one thing to understand)

The app is **three classic scripts that share one global scope**, exactly like the original single HTML file: `vendor` (npm libraries), `engine`, `studio`. `classic.config.js` lists the files of each bundle in load order; `tools/vite-classic-scripts.js` joins them (dev server and build). So:

- Any top-level function or variable in any file is visible everywhere, but only after its file has loaded. Calls made *while scripts load* can hit a not-yet-defined `const` (temporal dead zone). Boot work belongs in `initializeWorkshop()`, which is called from `src/studio/99-boot.js`, the last file.
- A new source file must be added to `classic.config.js` in the right place (studio and asset files go before `99-boot.js`), or it is never loaded. The dev server reads `classic.config.js` when it starts: restart it after editing that file, or you are testing the old load order.
- The code is dense and minified in style (long lines). Match the surrounding style; do not reformat files you are not changing.

## Rules (and why)

1. **Edit the function, never wrap it.** Do not write `const fooV1 = foo; foo = function (...) { fooV1(...) }`, do not reassign a function from another file, do not declare it twice, do not override a method like `renderer.render`. Layers like that made the project unreadable: nobody could tell what `validate` actually did without following seven hops. `tools/check-wrappers.mjs` (a JavaScript parser) runs before every build (`npm run build` → `prebuild`) and fails the build on any of these.
2. **Extend core functions with named steps.** When a feature needs to run inside a core function, write a named function in the feature's file and call it from the core function. Examples already in the code: `validate()` = `validateScenario` + `validateCameraFields` + `validateCinemaAndMoments` + `validateSpeech` + `validateFinish` + `validateWaterHazard`; `step()` ends with `applyCrowdLOD`, `updateWorldLife`, `updateFloodCamera`; `composeFrame()` picks `drawStandardOverlay` or `drawWorkshopOverlay`, then `drawSpeech`. Mind the order: `step()` draws the frame (`renderFilm()` + `composeFrame()`) before its trailing steps, so those affect the next frame.
3. **Shared materials are never edited in place.** `paletteMaterial(key, make)` / `toyPalette(color, extra)` (in `src/studio/07-workshop.js`) give one material per look to many objects. Anything that changes a look swaps in a cached variant (`paletteVariant(src, key, change)`), as the city clay finish, the cinema finishes and skinning do. A material that one object changes on its own (a person's skin, clothing and dark eye material, which the zombie tint and `resetWorld` edit; window walls; water; debris) must stay private (`toyMaterial`, `mat`). An in-place edit of a shared material once turned every same-skin character zombie green.
4. **Keep it deterministic.** World building uses the seeded `R`, runtime randomness uses `Q` (reset in `resetWorld`), sky setup uses `SKY`. `Math.random` is only acceptable for audio texture and ids. Seeking re-simulates from 0:00 at a fixed 60 steps/s, so preview, seek and export agree, and the reference frames are byte-identical between runs. One unseeded `Math.random` made the outbreak story unrepeatable.
5. **Persistent world state lives in `S`** (damage, fires, zombies, outages, the flood), is applied by events in `onShot` or a step, and is reset in `resetWorld`. Things that happen must survive camera cuts.
6. **Stay inside the budgets** in `perf/budgets.json` (draw calls, triangles, objects, materials, geometries per story). Every mesh you add per person, vehicle or building multiplies by hundreds. Prefer toggling visibility, sharing geometry (`wlGeo`, `char3Geo`) and the palette over adding meshes. Raise a budget only on purpose, in the change that needs it, and say so.
7. **Text safe zones.** `src/studio/18-safe-zones.js` holds the YouTube Shorts / TikTok / Both margins. Anything drawn on the film (titles, captions, balloons, end card, new overlays) must lay itself out inside `safeArea(w, h)` when a zone is selected, and keep its classic position when it is Off (so Off frames stay identical). The guides live on their own canvas and must never be drawn into the film canvas.

## Workflow for any change

1. Read `CLAUDE.md`, `references/architecture.md` and the recipe for the task. Search with grep for the function you will touch and read it whole (lines are long; use offsets).
2. Start the servers from `.claude/launch.json` (`dev` on 5173, `preview` on 4173), or `npm run dev`.
3. Make the smallest edit in the original function. New feature code goes into the feature's file as named functions.
4. Run the gates, all against the dev server while you work (`bash tools/verify-step.sh http://localhost:5173/`), and against the built site before you finish (`npm run build`, `npm run preview`, `npm run verify`):
   - `node tools/check-wrappers.mjs`: no wrapper patterns (also runs on build).
   - `npm run test:frames`: the 16 reference frames (market, earthquake, outbreak, coast) are byte-identical to `reference/frames/manifest.json`.
   - `npm run test:smoke`: 21 real-browser checks (boot, play, tabs, Asset studio, all 10 stories simulated to the end, WebM and MP4 export, save project, PNG), zero page errors.
   - `npm run test:budgets`: every story within `perf/budgets.json`.
   - For material or look changes also `node tools/capture-finishes.mjs <url> <dir> --compare <baseline-dir>` (all cinema finishes plus Asset studio isolation).
5. If a frame changes, find out why before anything else (see "Frames changed" in `references/recipes.md`). Re-baseline only for an intentional visual change, and only after showing the user before/after images.
6. If the scenario vocabulary changed (new event, hazard, preset, behavior, emotion, biome, shader, sound keyword, asset or state), sync the Director (recipe "Sync the vocabulary").
7. Deliver: real screenshots for anything visual (look at each one before sending), then a plain-language summary (what changed, why it matters, how it was verified, what is still not proven). Commit only after the user says "approved", then `git push`.

## Things that have bitten before

- Windows line endings: the original file was CRLF; Git Bash `sed`/`grep` silently strip `\r`. Sources are LF now.
- Escaping: JavaScript sent into the page through a template string loses backslashes in regexes. Put page code in its own file or pass `fn.toString()`.
- Three.js sorts opaque objects by material id, so changing which objects share a material moves a few edge pixels even when nothing else changed. Prove equivalence with a fixed draw order (`renderer.setOpaqueSort`) before and after.
- The toon finish posterizes; a few band-edge pixels differ between runs. Compare toon frames with a small tolerance.
- Hidden is not dead: most hidden meshes are pools, optional accessories, props or close-range details, and the old face parts are still shown by the Asset studio preview. Prove a mesh can never show before deleting it.
- A WebGL page in a hidden browser pane stalls `requestAnimationFrame`; use the headless tools for frames and numbers.
- If every gate fails at once, check the server is actually running (the app can stop idle servers) before suspecting your change.
- Camera changes must happen before the frame is drawn: `step()` places the camera with `shotCam` before `renderFilm()`, and a step at the end of `step()` is overwritten by the next frame's `shotCam`. (`updateFloodCamera` has this problem during live playback; seek redraws hide it.)

## Honest limits

Stylized procedural low-poly toy characters, not film-quality models. The rig is articulated with continuous skinned limbs; fingers are mittens and lip-sync is a babble with visemes. Textures are not freed when switching stories (known leak). Draw calls are ~3,000-3,700 for city stories because every part is its own mesh; merging and instancing is the performance step. Say what was and was not verified: headless frames and tests prove behavior; they do not judge whether a new look is good.
