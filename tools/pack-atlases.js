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

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await packBuildings();
  await packIcons();
  console.log('\nAll atlases done.');
}

main().catch(e => { console.error(e); process.exit(1); });
