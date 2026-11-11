# Frame Studio

A browser film studio for 9:16 "what if" shorts. Pick or write a story, and a Three.js world plays it as a portrait film with people, camera shots, captions and sound, then exports it as MP4 or WebM for YouTube Shorts and TikTok. Everything runs in the browser: no account, no server, no cost.

**Live: https://frame-studio-sage-psi.vercel.app/**

## What it does

- **Stories**: ready-made films (a market, an earthquake, a zombie outbreak, a coast, a forest and more), or type a "What if…" sentence and the free writer builds the shots.
- **Write with any AI, free**: the Story tab's "Use any AI, free" box copies a prompt kit ([docs/PROMPT-KIT.md](docs/PROMPT-KIT.md)) that lists exactly what the engine can show. Paste it into any chat AI with your idea, then paste the answer back. An optional writer uses your own Anthropic API key, straight from your browser.
- **Shots**: cameras, camera moves and each person's action per shot, with safe zones for Shorts and TikTok.
- **Look**: several film finishes, including a full PlayStation-1 look with its own editor.
- **Models**: 134 painted low-poly people and 121 buildings, cars, trees, props and creatures, all loaded on demand.
- **Export**: frame-exact MP4 or WebM at 1080 x 1920 with a mixed soundtrack.

## Run it

Requires Node.js 22 (the version Vercel uses).

```
npm install
npm run dev        # open http://localhost:5173
```

`npm run build` creates a static site in `dist/` that can be hosted anywhere.

## Deploy (Vercel)

The repo is connected to Vercel: every push to `main` deploys to production. Settings are in `vercel.json` (Vite, `npm ci`, `npm run build`, output `dist`, Node 22, long-lived caching for hashed files). The build runs the wrapper check first, so a build that fails locally also fails on Vercel.

To test a build the way Vercel serves it: `npm run build`, then `node tools/serve-dist.mjs dist 4174` and open http://localhost:4174.

## Tests

```
npm run build
node tools/serve-dist.mjs dist 4174            # in another terminal
bash tools/verify-step.sh http://localhost:4174/
```

That runs every gate: no wrapped functions, every asset loads, 16 reference frames match, a real-browser smoke test (every story to the end, MP4 and WebM export), a phone-size layout test and per-story performance budgets. `CLAUDE.md` describes the architecture and the other tools.

## Credits

The films are made with other people's work. Thank you to:

- **People**: [Characters PSX](https://elbolilloduro.itch.io/characters-psx) by elbolilloduro
- **Animation**: [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) by Quaternius (CC0)
- **Cars**: [PSX Style Cars](https://ggbot.itch.io/psx-style-cars) by GGBot (CC0)
- **Skyscrapers**: [Retro Skyscraper Pack](https://elegantcrow.itch.io/retro-skyscraper-pack) by elegantcrow (CC0)
- **Buildings, trees, rocks, props, food, boats, fish, creatures, street textures**: low-poly PSX packs by [elbolilloduro](https://elbolilloduro.itch.io/). Some of their textures were made with images from Textures.com, which may not be redistributed.
- **PSX look**: the [PSX shader](https://fcidade.itch.io/psx-godot-shader-free), its textures and the Microtale and Dreadink fonts by Francisco Cidade; Graveyard Kit by [Kenney](https://kenney.nl/) (CC0)
- **Octopus**: Octopus by Poly by Google, [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)

Every model, its author and its licence are listed in [public/models/CREDITS.md](public/models/CREDITS.md). The fonts are here with their author's permission and are not free to reuse: see [public/fonts/README.md](public/fonts/README.md).

## License

Copyright © 2026 Amashing0411. All rights reserved.

The source code in this repository is published for viewing only. No permission is granted to copy, modify or redistribute it without written permission from the author. The models, textures, fonts and animations belong to their authors under the licences above.

Third-party libraries keep their own licenses: [three.js](https://github.com/mrdoob/three.js) (MIT), [webm-muxer](https://github.com/Vanilagy/webm-muxer) (MIT) and [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Their license notices are included in `index.html` and in the files under `reference/`.
