#!/usr/bin/env node
// Serve a built dist/ folder the way Vercel will: plain static files, correct content types, and the headers from
// vercel.json (including X-Content-Type-Options: nosniff, which makes wrong content types fatal).
//   node tools/serve-dist.mjs [distDir] [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve, normalize } from 'node:path';

const dist = resolve(process.argv[2] || 'dist'), port = Number(process.argv[3] || 4174);
const config = JSON.parse(readFileSync(resolve(import.meta.dirname, '../vercel.json'), 'utf8'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
// vercel.json "source" patterns used here are path globs with (.*) groups.
const rules = (config.headers || []).map(h => ({ re: new RegExp('^' + h.source.replace(/\(\.\*\)/g, '.*') + '$'), headers: h.headers }));

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(dist, path));
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
  const headers = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' };
  for (const r of rules) if (r.re.test(path)) for (const h of r.headers) headers[h.key] = h.value;
  res.writeHead(200, headers).end(readFileSync(file));
}).listen(port, () => console.log(`serving ${dist} like Vercel at http://localhost:${port}/`));
