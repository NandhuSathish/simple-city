/**
 * tools/build-tilesets.ts
 * Composes public/assets/tilesets/terrain_base.png from the Cute Fantasy tile sources.
 * Re-runnable: safe to call again after asset updates.
 *
 * Layout (256 × 592, 16×16 tiles):
 *   Y=0    Grass_Tiles_1.png       256×160  GIDs  1–160
 *   Y=160  Cobble_Road_1.png        48×80   GIDs 161–240  (cols 0–2 occupied)
 *   Y=240  FarmLand_Tile.png       112×128  GIDs 241–368  (cols 0–6 occupied)
 *   Y=368  Pavement_Tiles.png      144×128  GIDs 369–496  (cols 0–8 occupied)
 *   Y=496  Wooden_Deck_Tiles.png    80×96   GIDs 497–592  (cols 0–4 occupied)
 *
 * Run: node --experimental-strip-types tools/build-tilesets.ts
 */

import { Jimp } from 'jimp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSET_SRC = 'G:/Cute_Fantasy/Tiles';

const CANVAS_W = 256;
const CANVAS_H = 592;

const SOURCES: Array<{ file: string; x: number; y: number }> = [
  { file: `${ASSET_SRC}/Grass/Grass_Tiles_1.png`,       x: 0, y: 0   },
  { file: `${ASSET_SRC}/Cobble_Road/Cobble_Road_1.png`, x: 0, y: 160 },
  { file: `${ASSET_SRC}/FarmLand/FarmLand_Tile.png`,    x: 0, y: 240 },
  { file: `${ASSET_SRC}/Pavement_Tiles.png`,            x: 0, y: 368 },
  { file: `${ASSET_SRC}/Wooden_Deck_Tiles.png`,         x: 0, y: 496 },
];

const outDir  = join(ROOT, 'public', 'assets', 'tilesets');
const outPath = join(outDir, 'terrain_base.png') as `${string}.png`;

mkdirSync(outDir, { recursive: true });

const canvas = new Jimp({ width: CANVAS_W, height: CANVAS_H, color: 0x00000000 });

for (const src of SOURCES) {
  const img = await Jimp.read(src.file);
  canvas.composite(img, src.x, src.y);
}

await canvas.write(outPath);
console.log(`terrain_base.png written — ${CANVAS_W}×${CANVAS_H} px`);
console.log('GID reference:');
console.log('  Grass tiles     GIDs   1–160  (Y=0,   256×160)');
console.log('  Cobble Road     GIDs 161–240  (Y=160,  48×80 padded)');
console.log('  FarmLand        GIDs 241–368  (Y=240, 112×128 padded)');
console.log('  Pavement        GIDs 369–496  (Y=368, 144×128 padded)');
console.log('  Wooden Deck     GIDs 497–592  (Y=496,  80×96 padded)');
