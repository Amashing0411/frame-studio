# Frame Studio

A browser film engine: Three.js r128 plays a scenario JSON as a 9:16 portrait film (1080x1920 delivery) with procedural characters, a shot timeline, audio and MP4/WebM export. It will be deployed to Vercel.

## Standing rules (every step)

1. **Screenshots for anything visual.** Use the `workflow-progress-screenshots` skill: send real renders (start, key moment, result) as files as the work progresses, and look at every image before sending it.
2. **End every step with an `audit-verify-explain-grade-5` summary:** what changed, why it matters, how it was verified, what is still not proven.
3. **Never wrap functions. Edit them.** Do not write `const fooV1 = foo; foo = function (...) { fooV1(...) }` or any other layer on top of an existing function. Change the original definition in place. The current file has about 35 such layers; removing them is Step 2.
4. **Commit only after the user says "approved".** Until then, leave changes uncommitted and show them.

## Layout

- `film-studio-workshop.html`: the working build (single file, ~1.38MB). Lines 35–10830 are bundled libraries (Three.js r128, OrbitControls, SkeletonUtils, GLTFLoader/Exporter, WebM/MP4 muxers). Engine core starts at line 10831, studio layer at 11223.
- `reference/v1.html`: an earlier version of the same codebase, kept for visual comparison only. Do not edit.
- `reference/frames/`: reference frames of the market story ("The eight-armed customer") at 0:00, 0:09.5, 0:21 and 0:30, plus `manifest.json` with SHA-256 hashes.
- `tools/capture-frames.mjs`: headless capture of those frames from the film canvas.
- `qa/captures/`: scratch captures (gitignored).

## Reference frames

```
node tools/capture-frames.mjs film-studio-workshop.html qa/captures/check
```

This loads the market story fresh (ignoring autosave), seeks with the app's own `seekFilm` (fixed 60 steps/s from 0:00) and saves the canvas pixels at 540x960. Two runs on this machine produce byte-identical PNGs, so a hash change means the picture changed. Hashes are GPU-specific (recorded on an RTX 4060, Direct3D11); compare on the same machine.

Steps that promise "no visual change" must reproduce the hashes in `reference/frames/manifest.json`.

## Roadmap

Step 0 baseline → 1 Vite/Vercel project split → 2 remove patch layers → 3 update the film-engine-maintainer skill → 4 first Vercel deploy → 5 YouTube/TikTok safe zones → 6–10 models (choose direction, characters, creatures, world, catalog) → 11 UI → 12 in-app guide → 13 performance → 14 release QA.
