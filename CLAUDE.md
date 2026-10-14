# Frame Studio

A browser film engine: Three.js r128 plays a scenario JSON as a 9:16 portrait film (1080x1920 delivery) with procedural characters, a shot timeline, audio and MP4/WebM export. It will be deployed to Vercel.

## Standing rules (every step)

1. **Screenshots for anything visual.** Use the `workflow-progress-screenshots` skill: send real renders (start, key moment, result) as files as the work progresses, and look at every image before sending it.
2. **End every step with an `audit-verify-explain-grade-5` summary:** what changed, why it matters, how it was verified, what is still not proven.
3. **Never wrap functions. Edit them.** Do not write `const fooV1 = foo; foo = function (...) { fooV1(...) }` or any other layer on top of an existing function. Change the original definition in place. The current file has about 35 such layers; removing them is Step 2.
4. **Commit only after the user says "approved".** Until then, leave changes uncommitted and show them.

## Layout

A Vite static site (`npm run build` → `dist/`, deployable to Vercel as is).

- `index.html`: page markup. `<!-- classic-scripts -->` marks where the three scripts are injected.
- `classic.config.js`: **load order** of everything. The app is three classic (non-module) scripts sharing one global scope, exactly like the original single file: `vendor` (npm libraries), `engine`, `studio`. Each is its listed files joined in order. Add new source files here.
- `src/engine/00-15-*.js`: the core engine (renderer, sky/weather, helpers, scenery, vehicles, characters, world build, fx, state, navigation, faces/poses, life, camera, validation, step, samples).
- `src/studio/*.js` and `src/assets/*.js`: the studio layer, numbered in load order across both folders (`assets/` holds asset definitions: archetypes, recipes, mesh factory, character style v3, world revamp).
- `src/styles/studio.css`, `src/styles/theme.css`: the two original style blocks (theme overrides studio).
- `public/favicon.ico`: served at the site root.
- `tools/vite-classic-scripts.js`: Vite plugin that serves the bundles in dev and emits hashed files on build. Applies vendor patches (see below) and fails the build if a patch stops matching.
- Vendor: `three@0.128.0` (build + examples/js OrbitControls, SkeletonUtils, GLTFLoader, GLTFExporter), `mp4-muxer@5.2.1`, `webm-muxer@5.1.3` with one patch in `classic.config.js` (keeps the last frame in the WebM duration).
- Not ES modules yet: the patch layers reassign functions across files, which ES module imports forbid. Converting to real modules becomes possible after Step 2.
- `reference/workshop-original.html`: the original single file, unchanged. `reference/v1.html`: an earlier version. Do not edit either.
- `reference/frames/`: reference frames of the market story at 0:00, 0:09.5, 0:21 and 0:30, plus `manifest.json` with SHA-256 hashes.
- `tools/lib/chrome.mjs`: headless Chrome helper used by the test tools.
- `qa/captures/`: scratch captures (gitignored).

## Commands

```
npm install
npm run dev            # http://localhost:5173
npm run build          # dist/
npm run preview        # serves dist/ at http://localhost:4173 (needed by the two tests below)
npm run test:frames    # reference frames from the built site, compared with reference/frames/manifest.json
npm run test:smoke     # real-browser smoke test (boot, play, tabs, all 10 stories to the end, WebM+MP4 export, save, PNG)
npm run verify:split   # Step 1 only: proves the sources rebuild the original file byte for byte
```

Both test tools also take a file path or another URL, e.g. `node tools/smoke-test.mjs reference/workshop-original.html` for a baseline. Servers are in `.claude/launch.json` (`dev`, `preview`).

## Reference frames

The frame tool loads the market story fresh (ignoring autosave), seeks with the app's own `seekFilm` (fixed 60 steps/s from 0:00) and saves the canvas pixels at 540x960. Repeated runs on this machine produce byte-identical PNGs, so a hash change means the picture changed. Hashes are GPU-specific (recorded on an RTX 4060, Direct3D11); compare on the same machine.

Steps that promise "no visual change" must reproduce the hashes in `reference/frames/manifest.json`.

## Known issues (pre-existing)

- **Outbreak sample is not deterministic:** its frames differ on every run even in the original file (seen at 0:10, 0:30, 0:58). Something on that path uses unseeded randomness. Fix before using outbreak frames as references.
- `Math.random` is used for clouds, stars and rain setup in `src/engine/01-sky-weather.js` (market frames are still repeatable).

## Roadmap

Step 0 baseline → 1 Vite/Vercel project split → 2 remove patch layers → 3 update the film-engine-maintainer skill → 4 first Vercel deploy → 5 YouTube/TikTok safe zones → 6–10 models (choose direction, characters, creatures, world, catalog) → 11 UI → 12 in-app guide → 13 performance → 14 release QA.
