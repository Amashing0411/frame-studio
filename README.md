# Frame Studio

A browser film studio for 9:16 "what if" shorts. Write a scenario as JSON, and a procedural Three.js world plays it as a portrait film with characters, camera shots, captions and sound, then exports it as MP4 or WebM for YouTube Shorts and TikTok.

> Work in progress: the engine is being rebuilt step by step (models, UI, safe zones and an in-app guide are next).

## Run it

Requires Node.js 20.19 or newer.

```
npm install
npm run dev        # open http://localhost:5173
```

`npm run build` creates a static site in `dist/` that can be hosted anywhere, such as Vercel.

## Tests

With `npm run preview` running (serves `dist/` at http://localhost:4173):

```
npm run test:smoke    # real-browser smoke test: boot, playback, every story, video export
npm run test:frames   # renders reference frames and compares them with reference/frames
```

## License

Copyright © 2026 Amashing0411. All rights reserved.

The source code in this repository is published for viewing only. No permission is granted to copy, modify or redistribute it without written permission from the author.

Third-party libraries keep their own licenses: [three.js](https://github.com/mrdoob/three.js) (MIT), [webm-muxer](https://github.com/Vanilagy/webm-muxer) (MIT) and [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT). Their license notices are included in `index.html` and in the files under `reference/`.
