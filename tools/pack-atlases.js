/**
 * tools/pack-atlases.js
 * Packs sprite atlases from G:/Cute_Fantasy into public/assets/atlases/.
 *
 * Run all groups:       node tools/pack-atlases.js
 * Run one group:        node tools/pack-atlases.js --group=npcs
 * Valid group names:    buildings, icons, trees, decor, crops, npcs, animals, weather
 *
 * NPC and building packing is driven by src/data/sprite-defs.json.
 * Animals packing reads source PNGs from public/assets/source/ (set by sprite-server).
 *
 * Note: written as .js (not .ts) due to --experimental-strip-types bug with
 * free-tex-packer-core inline callback type annotations (see knowledge.md).
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jimp } from 'jimp';

const require  = createRequire(import.meta.url);
const packer   = require('free-tex-packer-core');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');
const DEFAULT_ASSET_SRC = 'G:/Cute_Fantasy';
const LOCAL_ASSET_SRC   = join(ROOT, '..');
import { existsSync } from 'node:fs';
const ASSET_SRC = existsSync(DEFAULT_ASSET_SRC) ? DEFAULT_ASSET_SRC : LOCAL_ASSET_SRC;
const OUT_DIR   = join(ROOT, 'public', 'assets', 'atlases');
console.log(`Asset source: ${ASSET_SRC}`);

mkdirSync(OUT_DIR, { recursive: true });

// ─── sprite-defs (shared across NPC, building, and animal packers) ─────────────

const SPRITE_DEFS_PATH = join(ROOT, 'src', 'data', 'sprite-defs.json');
const SPRITE_SOURCE    = join(ROOT, 'public', 'assets', 'source');

let SPRITE_DEFS = { spritesheets: [] };
try {
  SPRITE_DEFS = JSON.parse(readFileSync(SPRITE_DEFS_PATH, 'utf-8'));
} catch {
  console.warn('Warning: sprite-defs.json not found or invalid — NPC/building/animal atlases will be skipped.');
}

// ─── --group flag ─────────────────────────────────────────────────────────────

const GROUP_ARG = (() => {
  const flag = process.argv.find(a => a.startsWith('--group='));
  return flag ? flag.slice('--group='.length) : null;
})();

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function packAtlas(images, options) {
  return new Promise((resolve, reject) => {
    packer(images, options, (files, err) => {
      if (err) { reject(err); return; }
      for (const file of files) {
        const outPath = join(OUT_DIR, file.name);
        writeFileSync(outPath, file.buffer);
        console.log(`  → ${outPath}`);
      }
      const jsonFile = files.find(f => f.name.endsWith('.json'));
      if (jsonFile) {
        const count = Object.keys(JSON.parse(jsonFile.buffer.toString()).frames).length;
        console.log(`  ${count} frames packed.`);
      }
      resolve();
    });
  });
}

// ─── buildings (sprite-defs driven) ──────────────────────────────────────────
//
// Reads entries with atlasGroup="buildings" from sprite-defs.json.
// Looks up each PNG by filename in ASSET_SRC (Buildings/ tree + Well.png).
// Frame names in the atlas = PNG filename without extension (e.g. House_1_Wood_Base_Blue).
// Two catalog entries can share the same PNG (well + wall_segment both use Well.png);
// duplicates are deduplicated before packing.

async function packBuildings() {
  const buildingSheets = SPRITE_DEFS.spritesheets.filter(s => s.atlasGroup === 'buildings');
  if (!buildingSheets.length) {
    console.log('\nNo building entries in sprite-defs.json — skipping buildings atlas.');
    return;
  }

  // Build filename → full-path index from all PNGs in ASSET_SRC Buildings area.
  const allBuildingPngs = [
    ...collectPngs(join(ASSET_SRC, 'Buildings', 'Buildings')),
    join(ASSET_SRC, 'Outdoor decoration', 'Well.png'),
  ];
  const pngIndex = new Map(allBuildingPngs.map(fp => [basename(fp), fp]));

  const images = [];
  const packed = new Set();
  for (const sheet of buildingSheets) {
    const file = basename(sheet.srcFile);
    if (packed.has(file)) continue;  // skip duplicates (e.g. wall_segment shares Well.png)
    const fp = pngIndex.get(file);
    if (!fp) {
      console.warn(`  SKIP building ${sheet.id}: ${file} not found in asset source`);
      continue;
    }
    images.push({ path: file, contents: readFileSync(fp) });
    packed.add(file);
  }

  console.log(`\nPacking buildings atlas — ${images.length} sprites…`);
  await packAtlas(images, {
    textureName:         'buildings',
    width:               4096,
    height:              4096,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           true,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── icons ────────────────────────────────────────────────────────────────────

const ICON_SIZE = 16;
const ICON_SHEETS = [
  { file: 'Resources_Icons_Outline.png', prefix: 'res'    },
  { file: 'Food_Icons_Outline.png',      prefix: 'food'   },
  { file: 'Other_Icons_Outline.png',     prefix: 'other'  },
  { file: 'Other_Icons_2_Outline.png',   prefix: 'other2' },
  { file: 'Tool_Icons_Outline.png',      prefix: 'tool'   },
];

async function packIcons() {
  console.log('\nPacking icons atlas…');
  const iconImages = [];

  for (const sheet of ICON_SHEETS) {
    const imgPath  = join(ASSET_SRC, 'Icons', 'Outline', sheet.file);
    const sheetImg = await Jimp.read(imgPath);
    const cols     = Math.floor(sheetImg.width  / ICON_SIZE);
    const rows     = Math.floor(sheetImg.height / ICON_SIZE);
    console.log(`  ${sheet.file}: ${cols}×${rows} = ${cols * rows} icons`);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = new Jimp({ width: ICON_SIZE, height: ICON_SIZE, color: 0x00000000 });
        for (let py = 0; py < ICON_SIZE; py++) {
          for (let px = 0; px < ICON_SIZE; px++) {
            const color = sheetImg.getPixelColor(c * ICON_SIZE + px, r * ICON_SIZE + py);
            canvas.setPixelColor(color, px, py);
          }
        }
        const buf = await canvas.getBuffer('image/png');
        iconImages.push({ path: `${sheet.prefix}_${r * cols + c}.png`, contents: buf });
      }
    }
  }

  console.log(`  Packing ${iconImages.length} icon frames…`);
  await packAtlas(iconImages, {
    textureName:         'icons',
    width:               512,
    height:              512,
    fixedSize:           false,
    padding:             1,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           false,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── trees ────────────────────────────────────────────────────────────────────

async function packTrees() {
  const treeDir = join(ASSET_SRC, 'Trees');
  const sources = readdirSync(treeDir)
    .filter(f => extname(f).toLowerCase() === '.png' && !f.includes('Particle'))
    .map(f => join(treeDir, f));
  const images = sources.map(fp => ({ path: basename(fp), contents: readFileSync(fp) }));
  console.log(`\nPacking trees atlas — ${images.length} sprites…`);
  await packAtlas(images, {
    textureName:         'trees',
    width:               2048,
    height:              2048,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           true,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── decor (ores + outdoor decorations) ──────────────────────────────────────

const DECOR_FILES = [
  'Ores.png',
  'Fountain.png',
  'Benches.png',
  'Flowers.png',
  'Boat.png',
  'Minecrats.png',
];

async function packDecor() {
  const decorDir = join(ASSET_SRC, 'Outdoor decoration');
  const images = [];
  for (const file of DECOR_FILES) {
    const fp = join(decorDir, file);
    if (!existsSync(fp)) { console.warn(`  SKIP decor ${file}: not found`); continue; }
    images.push({ path: file, contents: readFileSync(fp) });
  }
  console.log(`\nPacking decor atlas (${images.length} sprites)…`);
  await packAtlas(images, {
    textureName:         'decor',
    width:               1024,
    height:              1024,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           true,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── crops ────────────────────────────────────────────────────────────────────

const CROP_FRAME_W = 16;
const CROP_FRAME_H = 16;

async function packCrops() {
  console.log('\nPacking crops atlas…');
  const imgPath  = join(ASSET_SRC, 'Crops', 'Crops.png');
  const sheetImg = await Jimp.read(imgPath);
  const cols     = Math.floor(sheetImg.width  / CROP_FRAME_W);
  const rows     = Math.floor(sheetImg.height / CROP_FRAME_H);
  console.log(`  Crops.png: ${cols}×${rows} = ${cols * rows} frames`);

  const cropImages = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const canvas = new Jimp({ width: CROP_FRAME_W, height: CROP_FRAME_H, color: 0x00000000 });
      for (let py = 0; py < CROP_FRAME_H; py++) {
        for (let px = 0; px < CROP_FRAME_W; px++) {
          const color = sheetImg.getPixelColor(c * CROP_FRAME_W + px, r * CROP_FRAME_H + py);
          canvas.setPixelColor(color, px, py);
        }
      }
      const buf = await canvas.getBuffer('image/png');
      cropImages.push({ path: `crop_${r * cols + c}.png`, contents: buf });
    }
  }

  console.log(`  Packing ${cropImages.length} crop frames…`);
  await packAtlas(cropImages, {
    textureName:         'crops',
    width:               1024,
    height:              1024,
    fixedSize:           false,
    padding:             1,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           false,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── NPCs (sprite-defs driven) ────────────────────────────────────────────────
//
// Reads entries with atlasGroup="npcs" from sprite-defs.json.
// Slices each spritesheet into individual frames and packs them.
// Frame names: {framePrefix}_{linearIndex}  where linearIndex = row * cols + col.
// This matches the naming expected by PreloadScene.ts registerNpcAnims().
//
// totalRows is derived as max(animation.row) + 1 so the loop covers all rows
// defined in animations — identical to the old hardcoded NPC_SHEETS.rows values.
// cols is taken from animations[0].cols; all animations within an NPC sheet use
// the same column count (6 for most, 9 for Fisherman_Fin).

async function packNpcs() {
  const npcSheets = SPRITE_DEFS.spritesheets.filter(s => s.atlasGroup === 'npcs');
  if (!npcSheets.length) {
    console.log('\nNo NPC entries in sprite-defs.json — skipping npcs atlas.');
    return;
  }

  console.log('\nPacking NPCs atlas…');
  const npcImages = [];
  const npcDir = join(ASSET_SRC, 'NPCs (Premade)');

  for (const sheet of npcSheets) {
    const file      = basename(sheet.srcFile);
    const imgPath   = join(npcDir, file);
    const fw        = sheet.frameWidth;
    const fh        = sheet.frameHeight;
    const cols      = sheet.animations[0]?.cols ?? 6;
    const totalRows = Math.max(...sheet.animations.map(a => a.row)) + 1;

    const sheetImg = await Jimp.read(imgPath);
    console.log(`  ${file}: ${cols}×${totalRows} = ${cols * totalRows} frames`);

    for (let r = 0; r < totalRows; r++) {
      for (let c = 0; c < cols; c++) {
        const canvas = new Jimp({ width: fw, height: fh, color: 0x00000000 });
        for (let py = 0; py < fh; py++) {
          for (let px = 0; px < fw; px++) {
            const color = sheetImg.getPixelColor(c * fw + px, r * fh + py);
            canvas.setPixelColor(color, px, py);
          }
        }
        const buf = await canvas.getBuffer('image/png');
        const idx = r * cols + c;
        npcImages.push({ path: `${sheet.framePrefix}_${idx}.png`, contents: buf });
      }
    }
  }

  console.log(`  Packing ${npcImages.length} NPC frames…`);
  await packAtlas(npcImages, {
    textureName:         'npcs',
    width:               4096,
    height:              4096,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           false,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── Animals (sprite-defs driven) ────────────────────────────────────────────
//
// Reads entries with atlasGroup="animals" from sprite-defs.json.
// Source PNGs are looked up in public/assets/source/{srcFile} (set by sprite-server).
// Frame names: {id}_{animName}_{frameIndex}

async function packAnimals() {
  const sheets = SPRITE_DEFS.spritesheets.filter(s => s.atlasGroup === 'animals');
  if (!sheets.length) {
    console.log('\nsprite-defs.json has no animal entries — skipping animals atlas.');
    console.log('  Use `npm run sprites` to open the Sprite Configurator and upload your animal PNGs.');
    return;
  }

  console.log(`\nPacking animals atlas from sprite-defs (${sheets.length} spritesheets)…`);
  const images = [];

  for (const sheet of sheets) {
    const srcPath = join(SPRITE_SOURCE, sheet.srcFile);
    if (!existsSync(srcPath)) {
      console.warn(`  SKIP ${sheet.id}: source not found at ${srcPath}`);
      continue;
    }

    const { frameWidth: fw, frameHeight: fh, animations = [] } = sheet;
    const sheetImg = await Jimp.read(srcPath);
    console.log(`  ${sheet.id}  (${sheetImg.width}×${sheetImg.height}, frame ${fw}×${fh})`);

    for (const anim of animations) {
      const { name, row, cols } = anim;
      for (let c = 0; c < cols; c++) {
        const frame = new Jimp({ width: fw, height: fh, color: 0x00000000 });
        for (let py = 0; py < fh; py++) {
          for (let px = 0; px < fw; px++) {
            frame.setPixelColor(
              sheetImg.getPixelColor(c * fw + px, row * fh + py),
              px, py,
            );
          }
        }
        const buf = await frame.getBuffer('image/png');
        images.push({ path: `${sheet.id}_${name}_${c}.png`, contents: buf });
      }
    }
  }

  if (!images.length) {
    console.log('  No frames extracted — check that source PNGs exist and animations are defined.');
    return;
  }

  console.log(`  Packing ${images.length} frames…`);
  await packAtlas(images, {
    textureName:         'animals',
    width:               4096,
    height:              4096,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           true,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── Weather ──────────────────────────────────────────────────────────────────

async function packWeather() {
  const weatherDir = join(ASSET_SRC, 'Weather effects');
  const sources    = readdirSync(weatherDir)
    .filter(f => extname(f).toLowerCase() === '.png')
    .map(f => join(weatherDir, f));
  const images = sources.map(fp => ({ path: basename(fp), contents: readFileSync(fp) }));
  console.log(`\nPacking weather atlas — ${images.length} sprites…`);
  await packAtlas(images, {
    textureName:         'weather',
    width:               512,
    height:              512,
    fixedSize:           false,
    padding:             2,
    allowRotation:       false,
    detectIdentical:     false,
    allowTrim:           true,
    exporter:            'JsonHash',
    removeFileExtension: true,
    prependFolderName:   false,
  });
}

// ─── main ─────────────────────────────────────────────────────────────────────

const ATLAS_PACKERS = {
  buildings: packBuildings,
  icons:     packIcons,
  trees:     packTrees,
  decor:     packDecor,
  crops:     packCrops,
  npcs:      packNpcs,
  animals:   packAnimals,
  weather:   packWeather,
};

async function main() {
  if (GROUP_ARG) {
    const fn = ATLAS_PACKERS[GROUP_ARG];
    if (!fn) {
      console.error(`Unknown --group: "${GROUP_ARG}". Valid groups: ${Object.keys(ATLAS_PACKERS).join(', ')}`);
      process.exit(1);
    }
    await fn();
    console.log(`\n${GROUP_ARG} atlas done.`);
    return;
  }

  await packBuildings();
  await packIcons();
  await packTrees();
  await packDecor();
  await packCrops();
  await packNpcs();
  await packAnimals();
  await packWeather();
  console.log('\nAll atlases done.');
}

main().catch(e => { console.error(e); process.exit(1); });
