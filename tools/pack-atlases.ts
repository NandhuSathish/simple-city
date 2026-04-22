/**
 * tools/pack-atlases.ts
 * Packs building sprites from G:/Cute_Fantasy into public/assets/atlases/buildings.{png,json}.
 * Re-runnable: safe to call after asset updates.
 *
 * Includes:
 *   - All PNGs under G:/Cute_Fantasy/Buildings/Buildings/ (Houses + Unique_Buildings)
 *   - G:/Cute_Fantasy/Outdoor decoration/Well.png
 *
 * Note: uses the callback form of free-tex-packer-core (packAsync has a known bug with
 * frame name passthrough — the callback API is correct).
 *
 * Run: node --experimental-strip-types tools/pack-atlases.ts
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const freeTexPacker: (
  images: Array<{ path: string; contents: Buffer }>,
  options: Record<string, unknown>,
  callback: (files: Array<{ name: string; buffer: Buffer }>, err: Error | null) => void,
) => void = require('free-tex-packer-core');

function pack(
  images: Array<{ path: string; contents: Buffer }>,
  options: Record<string, unknown>,
): Promise<Array<{ name: string; buffer: Buffer }>> {
  return new Promise((resolve, reject) => {
    freeTexPacker(images, options, (files, err) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const ASSET_SRC = 'G:/Cute_Fantasy';
const OUT_DIR   = join(ROOT, 'public', 'assets', 'atlases');

function collectPngs(dir: string): string[] {
  const results: string[] = [];
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

const sources: string[] = [
  ...collectPngs(join(ASSET_SRC, 'Buildings', 'Buildings')),
  join(ASSET_SRC, 'Outdoor decoration', 'Well.png'),
];

// Keep .png in path so removeFileExtension:true can strip it correctly
// (passing a path without extension causes removeFileExtension to produce "")
const images = sources.map(filePath => ({
  path: basename(filePath),
  contents: readFileSync(filePath),
}));

console.log(`Packing ${images.length} sprites…`);

const files = await pack(images, {
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
});

mkdirSync(OUT_DIR, { recursive: true });

for (const file of files) {
  const outPath = join(OUT_DIR, file.name);
  writeFileSync(outPath, file.buffer);
  console.log(`  → ${outPath}`);
}

console.log('Done.');
