/**
 * tools/pack-atlases.js
 * Packs sprite atlases from G:/Cute_Fantasy into public/assets/atlases/.
 * Emits:
 *   buildings.{png,json} — all Buildings/ PNGs + Well
 *   icons.{png,json}     — Icons/Outline/ sheets sliced into 16×16 frames
 *
 * Run: node tools/pack-atlases.js
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
const ASSET_SRC = 'G:/Cute_Fantasy';
const OUT_DIR   = join(ROOT, 'public', 'assets', 'atlases');

mkdirSync(OUT_DIR, { recursive: true });

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

// ─── buildings ────────────────────────────────────────────────────────────────

async function packBuildings() {
  const sources = [
    ...collectPngs(join(ASSET_SRC, 'Buildings', 'Buildings')),
    join(ASSET_SRC, 'Outdoor decoration', 'Well.png'),
  ];
  const images = sources.map(fp => ({ path: basename(fp), contents: readFileSync(fp) }));
  console.log(`\nPacking buildings atlas — ${images.length} sprites…`);
  await packAtlas(images, {
    textureName:        'buildings',
    width:              4096,
    height:             4096,
    fixedSize:          false,
    padding:            2,
    allowRotation:      false,
    detectIdentical:    false,
    allowTrim:          true,
    exporter:           'JsonHash',
    removeFileExtension: true,
    prependFolderName:  false,
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

// ─── decor (ores) ─────────────────────────────────────────────────────────────

async function packDecor() {
  const decorDir = join(ASSET_SRC, 'Outdoor decoration');
  const oreFile  = join(decorDir, 'Ores.png');
  const images   = [{ path: 'Ores.png', contents: readFileSync(oreFile) }];
  console.log('\nPacking decor atlas (Ores)…');
  await packAtlas(images, {
    textureName:         'decor',
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

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await packBuildings();
  await packIcons();
  await packTrees();
  await packDecor();
  await packCrops();
  console.log('\nAll atlases done.');
}

main().catch(e => { console.error(e); process.exit(1); });
