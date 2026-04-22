/**
 * tools/pack-atlases.js
 * Packs building sprites from G:/Cute_Fantasy into public/assets/atlases/buildings.{png,json}.
 * Re-runnable: safe to call after asset updates.
 *
 * Includes:
 *   - All PNGs under G:/Cute_Fantasy/Buildings/Buildings/ (Houses + Unique_Buildings)
 *   - G:/Cute_Fantasy/Outdoor decoration/Well.png
 *
 * Note: written as .js (not .ts) because Node.js --experimental-strip-types has a known
 * issue with inline TypeScript type annotations in callback parameters that causes the
 * free-tex-packer-core callback to receive malformed data.
 *
 * Run: node tools/pack-atlases.js
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const freeTexPacker = require('free-tex-packer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const ASSET_SRC = 'G:/Cute_Fantasy';
const OUT_DIR   = join(ROOT, 'public', 'assets', 'atlases');

function collectPngs(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectPngs(full));
    } else if (extname(entry).toLowerCase() === '.png') {
      results.push(full);
    }
  }
  return results;
}

const sources = [
  ...collectPngs(join(ASSET_SRC, 'Buildings', 'Buildings')),
  join(ASSET_SRC, 'Outdoor decoration', 'Well.png'),
];

const images = sources.map(filePath => ({
  path: basename(filePath),
  contents: readFileSync(filePath),
}));

console.log(`Packing ${images.length} sprites…`);

freeTexPacker(images, {
  textureName: 'buildings',
  width: 4096,
  height: 4096,
  fixedSize: false,
  padding: 2,
  allowRotation: false,
  detectIdentical: false,
  allowTrim: true,
  exporter: 'JsonHash',
  removeFileExtension: true,
  prependFolderName: false,
}, (files, err) => {
  if (err) { console.error('Packing error:', err); process.exit(1); }

  mkdirSync(OUT_DIR, { recursive: true });

  for (const file of files) {
    const outPath = join(OUT_DIR, file.name);
    writeFileSync(outPath, file.buffer);
    console.log(`  → ${outPath}`);
  }

  const jsonFile = files.find(f => f.name.endsWith('.json'));
  if (jsonFile) {
    const frameCount = Object.keys(JSON.parse(jsonFile.buffer.toString()).frames).length;
    console.log(`Done. ${frameCount} frames packed.`);
  }
});
