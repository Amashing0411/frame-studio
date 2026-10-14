// Vite plugin: serve the bundles from classic.config.js as plain <script> tags in the place of the
// <!-- classic-scripts --> marker in index.html. Dev serves them from memory; build emits hashed files.
// They stay classic scripts (not ES modules) because the code shares globals across files.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';

const MARKER = '<!-- classic-scripts -->';

export function resolveFile(root, spec) {
  return spec.startsWith('src/') ? resolve(root, spec) : resolve(root, 'node_modules', spec);
}

// Returns { name: text } for every bundle, applying patches and failing loudly if one no longer matches.
export function buildClassicBundles(root, config) {
  const bundles = {};
  for (const [name, { files, separator = '' }] of Object.entries(config)) {
    bundles[name] = files.map(entry => {
      const { file, patches = [] } = typeof entry === 'string' ? { file: entry } : entry;
      // Normalise line endings so output is identical on every OS.
      let text = readFileSync(resolveFile(root, file), 'utf8').replace(/\r\n?/g, '\n');
      for (const p of patches) {
        const count = text.split(p.find).length - 1;
        if (count !== 1) throw new Error(`classic-scripts: patch for ${file} expected 1 match, found ${count} (${p.why})`);
        text = text.replace(p.find, () => p.replace);
      }
      return text;
    }).join(separator);
  }
  return bundles;
}

export function watchedFiles(root, config) {
  return Object.values(config).flatMap(b => b.files.map(e => resolveFile(root, typeof e === 'string' ? e : e.file)));
}

export default function classicScripts(config) {
  let root, base, built = {};
  const tags = urls => urls.map(u => `<script src="${u}"></script>`).join('');
  return {
    name: 'classic-scripts',
    configResolved(c) { root = c.root; base = c.base; },
    buildStart() {
      built = {};
      for (const [name, text] of Object.entries(buildClassicBundles(root, config))) {
        const hash = createHash('sha256').update(text).digest('hex').slice(0, 8);
        built[name] = { fileName: `assets/${name}-${hash}.js`, text };
      }
    },
    configureServer(server) {
      const files = new Set(watchedFiles(root, config).map(f => resolve(f)));
      server.watcher.add([...files]);
      server.watcher.on('change', f => { if (files.has(resolve(f))) server.ws.send({ type: 'full-reload' }); });
      server.middlewares.use((req, res, next) => {
        const m = /^\/__classic\/(\w+)\.js(\?|$)/.exec(req.url || '');
        if (!m || !config[m[1]]) return next();
        try {
          const text = buildClassicBundles(root, { [m[1]]: config[m[1]] })[m[1]];
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(text);
        } catch (e) { next(e); }
      });
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!html.includes(MARKER)) throw new Error(`classic-scripts: ${MARKER} not found in index.html`);
        const urls = ctx.server
          ? Object.keys(config).map(n => `/__classic/${n}.js`)
          : Object.keys(config).map(n => base + built[n].fileName);
        return html.replace(MARKER, () => tags(urls));
      },
    },
    generateBundle() {
      for (const { fileName, text } of Object.values(built)) this.emitFile({ type: 'asset', fileName, source: text });
    },
  };
}
