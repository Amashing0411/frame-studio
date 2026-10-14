# Recipes

Each recipe ends the same way: run the gates (`bash tools/verify-step.sh http://localhost:5173/` while working, `npm run build && npm run verify` against the built site before finishing), send screenshots of anything visual, and sync the Director when the vocabulary changed.

Contents: add an event · add a hazard · add a camera preset or move · add a crowd behavior, emotion or zombie style · add or change a catalog asset · add a sound · change a look or material · add a source file · frames changed · intentional visual change (re-baseline) · performance and budgets · sync the vocabulary · deploy.

## Add an event

1. Add the name to the vocabulary. Engine events live in `EVT` (`src/engine/13-validation.js`). If the event belongs to a feature file, push it there at load, as `17-water-hazards.js` does (`EVT.push(...)`); that is data, not a wrapper.
2. Trigger it. One-shot or persistent world effects go in `onShot(s)` (`src/engine/08-state.js`): `if(e.has('my_event')){...}` using `s.hub`, `near(...)`, `Q()` for randomness. Anything that must survive cuts goes into `S` and is reset in `resetWorld`. Continuous effects that depend on time belong in a named step called from `step()` (compute from the shot list and `t`, like `floodState`, so seeking stays exact).
3. Sound: map it in `eventAudio` (`src/studio/04-audio.js`) to a channel id from `soundTypes`.
4. Validation: if it only makes sense with a hazard or biome, add a warning in that feature's validate step (for example `validateWaterHazard`), not in `validateScenario`.
5. Test it in a scenario: add the event to one shot of a sample (editor JSON → Validate), seek across the shot, screenshot before/during/after. Add a story to the reference frames if the event is a headline feature.

## Add a hazard

A hazard is a `hazard.type` value plus events, state, a clock label and validation:
1. Clock label: `KL[type]` (`13-validation.js`), e.g. `'TIME SINCE THE TYPHOON'`.
2. `validateScenario` warns "This engine renders quake and zombie hazards" for unknown types; the water step removes that warning for tsunami/flood. Do the same for the new type in its own validate step and add a named step to the `validate()` pipeline.
3. State as a pure function of time and shots where possible (`floodState` is the model); world objects built once and shown or hidden (`ensureFloodRig`); update in a named step called at the end of `step()`.
4. Its events (recipe above), sound channel and people's reaction (a step called from `updPerson`, like the flood swimming).
5. Add a sample scenario or extend a world demo, add reference frames for it (recipe "Intentional visual change"), and sync the vocabulary.

## Add a camera preset or move

`PRE`/`MOV` in `13-validation.js`, the camera math in `shotCam()` (`src/engine/12-camera.js`, per preset, using the shot's hub and progress `u`). Keep cameras out of buildings (`fix`) and, for low cameras, above water. Check a closeup still frames the head when the person sits or crouches.

## Add a crowd behavior, emotion or zombie style

Crowd: `CRW`, then the behavior in `updPersonState` (`10-faces-poses.js`) using the corridor navigation (`route`, `away`); its pose comes from motion in `updPerson`. Emotion: `EMOS` + the face values in `EMO` and `EXPR3` (v3 face). Zombie style: `ZMB` + speed and pose in `updPersonState`.

## Add or change a catalog asset

1. Archetype entry in `CATALOG_BASE` (`src/assets/01-archetypes.js`): id `category.name`, kind, states, expressions, accessories. Variants come from presets automatically.
2. Builder: the `builders` map in `buildArchetypeModel` (`02-recipes.js`) picks one per kind; add parts with the `c*` helpers and `cMaterial`. Shared, never-changing parts can use the palette; parts that wear, tint or animate colour must be private.
3. States: animate in `poseCatalogRig` (procedural) or, for humans, the jointed rig poses (`poseV2`).
4. Check it on the Asset studio turntable (screenshot), place it in a scenario, run the gates, sync the vocabulary (the asset list is part of it).

## Add a sound

Add a channel to `soundTypes` (`04-audio.js`, or push from a feature file like the water channel). Order matters: the first matching keyword wins, so put specific keywords before broad ones (`car` also matches `cargo`). Synthesize procedurally in `createChannelNode` (or a named step it calls); create audio nodes only once, after the Play click. Sync the vocabulary (sound keywords are part of it).

## Change a look or material

- Never edit a shared material in place: palette (`paletteMaterial`/`toyPalette`), `smat`, `wlMat`, `char3Mat`. For a variant use `paletteVariant(src, key, change)`; if one object must change on its own, give it a private material at build time.
- Cinema finishes (`applyFinish`) and the city clay finish (`softenCityMaterial`) already swap palette materials for variants; follow the same pattern for any new look switch.
- Verify with `tools/capture-finishes.mjs` before/after as well as the reference frames, and look at the Asset studio preview with a non-natural finish.

## Add a source file

Create it under `src/engine`, `src/studio` or `src/assets`, then add it to the right bundle in `classic.config.js` at the right position (the number prefix is the load order across studio and assets; new studio files go before `src/studio/99-boot.js`). Restart the dev server afterwards: it reads `classic.config.js` only when it starts. Only declarations at top level; no calls to engine or studio functions while loading (boot work goes in `initializeWorkshop`).

## Frames changed

If `test:frames` shows DIFFERENT for a change that should not alter the picture:
1. Measure: differing pixel count and box (PIL `ImageChops.difference`), zoom the before/after/difference ×10.
2. Draw order? If you changed which objects share a material, compare with a fixed opaque/transparent sort (`renderer.setOpaqueSort((a,b)=>a.groupOrder-b.groupOrder||a.renderOrder-b.renderOrder||a.z-b.z||a.id-b.id)`) on both versions. Identical under the fixed sort means draw order is the only change.
3. Material leak? Dump every visible mesh's material settings (type, colour, emissive, roughness, flatShading, skinning, side, opacity) after the same story sequence in both versions and diff. Watch palette materials for in-place edits (wrap their `color` methods and record stack traces).
4. Randomness? Run the same version twice: if it differs from itself, something uses unseeded randomness.
5. Order of operations? A step moved before or after `renderFilm()` changes the next frame, not the current one.

## Intentional visual change (re-baseline)

Show the user before/after images first. Then capture twice and require 16/16 identical between the two runs, copy the PNGs and `manifest.json` into `reference/frames/`, and say in the commit message why the baseline moved. To add a story, add it to `STORIES` in `tools/capture-frames.mjs` and to the loaders in `tools/scene-stats.mjs`.

## Performance and budgets

`node tools/scene-stats.mjs <url> out.json` measures each story; `--budget perf/budgets.json` fails when over. Draw calls are counted at the WebGL level for one whole frame (shadow and post passes included). Biggest wins come from fewer meshes (merging static parts, instancing repeated ones), not from sharing materials. Frame time cannot be measured in a hidden browser pane; use a visible browser or the user's machine.

## Sync the vocabulary

1. `node tools/extract-vocabulary.mjs http://localhost:5173/ skills/film-engine-maintainer/references/vocabulary.json` (also writes `vocabulary.md`), then copy both files to `skills/whatif-director/references/`.
2. Update `skills/whatif-director/SKILL.md` where it lists the changed values: the "Core vocabulary" and "v7 vocabulary" bullets, the asset list, and the embedded Python validator (`EVT`, hazard checks, `SFX`, groups). Explain new values in words the Director can use to write good shots.
3. Cross-check: make a scenario that uses the new value; it must give 0 errors in both the engine (`validate()` in the page) and the Director's validator (`python validate_v7.py scenario.json`), with the same warnings.
4. Package both skills (`python -m scripts.package_skill <skill-dir>` from the skill-creator folder) and send the `.skill` files to the user to install.

## Deploy

The site is static: `npm run build` → `dist/` (three hashed classic scripts, one stylesheet, `index.html`, `favicon.ico`). Vercel detects Vite (build `npm run build`, output `dist`, Node 20.19+); `prebuild` runs the wrapper gate there too, so a wrapper blocks the deploy. Before deploying, run `npm run verify` against `npm run preview`.
