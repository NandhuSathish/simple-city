#!/usr/bin/env node
/**
 * tools/sprite-server.js — local dev server for the Sprite Sheet Configurator
 *
 * Usage:  npm run sprites
 * Then:   open http://localhost:3456
 *
 * Routes
 *   GET  /                     → sprite-viewer.html
 *   GET  /api/defs             → src/data/sprite-defs.json
 *   POST /api/upload           → save PNG to public/assets/source/{group}/
 *     ?group=animals&filename=Chicken_01.png, body = raw PNG bytes
 *   POST /api/defs             → overwrite src/data/sprite-defs.json, body = JSON
 *   POST /api/build            → run `node tools/pack-atlases.js`
 */

import { createServer }                                           from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync }    from 'fs';
import { join, dirname }                                          from 'path';
import { fileURLToPath }                                          from 'url';
import { execSync }                                               from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const PORT      = 3456;
const HTML_FILE = join(__dirname, 'sprite-viewer.html');
const DEFS_FILE = join(ROOT, 'src', 'data', 'sprite-defs.json');
const SRC_DIR   = join(ROOT, 'public', 'assets', 'source');

// Bootstrap
mkdirSync(SRC_DIR, { recursive: true });
mkdirSync(join(ROOT, 'src', 'data'), { recursive: true });
if (!existsSync(DEFS_FILE)) {
  writeFileSync(DEFS_FILE, JSON.stringify({ spritesheets: [] }, null, 2), 'utf-8');
}

// ── helpers ───────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function jsonReply(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── server ────────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url   = new URL(req.url, `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  // ── Serve viewer ────────────────────────────────────────────────────────────
  if (route === 'GET /') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(HTML_FILE));
    return;
  }

  // ── Read sprite-defs.json ───────────────────────────────────────────────────
  if (route === 'GET /api/defs') {
    jsonReply(res, JSON.parse(readFileSync(DEFS_FILE, 'utf-8')));
    return;
  }

  // ── Upload PNG → public/assets/source/{group}/{filename} ───────────────────
  if (route === 'POST /api/upload') {
    const group    = url.searchParams.get('group')    || 'misc';
    const filename = url.searchParams.get('filename') || 'sprite.png';
    const destDir  = join(SRC_DIR, group);
    mkdirSync(destDir, { recursive: true });
    const body = await readBody(req);
    writeFileSync(join(destDir, filename), body);
    console.log(`  Saved  public/assets/source/${group}/${filename}  (${body.length} bytes)`);
    jsonReply(res, { ok: true, srcFile: `${group}/${filename}` });
    return;
  }

  // ── Save sprite-defs.json ──────────────────────────────────────────────────
  if (route === 'POST /api/defs') {
    const body = await readBody(req);
    const data = JSON.parse(body.toString());
    writeFileSync(DEFS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  Saved  sprite-defs.json  (${data.spritesheets?.length ?? 0} spritesheets)`);
    jsonReply(res, { ok: true });
    return;
  }

  // ── Build atlases ──────────────────────────────────────────────────────────
  if (route === 'POST /api/build') {
    console.log('  Running pack-atlases.js…');
    try {
      const out = execSync('node tools/pack-atlases.js', {
        cwd:      ROOT,
        encoding: 'utf-8',
        timeout:  120_000,
      });
      console.log('  Build done.');
      jsonReply(res, { ok: true, output: out });
    } catch (err) {
      const output = [err.stdout, err.stderr, err.message].filter(Boolean).join('\n');
      console.error('  Build failed:', err.message);
      jsonReply(res, { ok: false, output }, 500);
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n  ┌─────────────────────────────────────────┐`);
  console.log(`  │  Sprite Sheet Configurator               │`);
  console.log(`  │  http://localhost:${PORT}                  │`);
  console.log(`  │  Ctrl+C to stop                          │`);
  console.log(`  └─────────────────────────────────────────┘\n`);
});
