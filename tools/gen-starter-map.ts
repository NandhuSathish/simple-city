/**
 * tools/gen-starter-map.ts
 * Generates public/assets/maps/world.tmj — a 64×64 Tiled map with all Phase 1 layers.
 *
 * WHY this script exists: Tiled is a GUI tool and cannot be scripted from CI/Node.
 * This produces a valid baseline map the user can later re-author visually in Tiled.
 * See knowledge.md §Tiled for notes on opening and editing this file.
 *
 * Tileset reference (terrain_base.png, 256×592, 16-col):
 *   GIDs   1–160  Grass_Tiles_1      (rows  0– 9)
 *   GIDs 161–240  Cobble_Road_1      (rows 10–14, cols 0–2 occupied)
 *   GIDs 241–368  FarmLand_Tile      (rows 15–22, cols 0–6 occupied)
 *   GIDs 369–496  Pavement_Tiles     (rows 23–30, cols 0–8 occupied)
 *   GIDs 497–592  Wooden_Deck_Tiles  (rows 31–36, cols 0–4 occupied)
 *
 * Ground fill uses GID 1 (top-left tile of Grass_Tiles_1). If that looks wrong
 * after running, open terrain_base.png to find the plain-middle grass GID and
 * update GRASS_FILL_GID below. Typical plain-middle positions in this pack vary
 * per Grass_Tiles_N variant — inspect the sheet and update.
 *
 * Run: node --experimental-strip-types tools/gen-starter-map.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MAP_W = 64;
const MAP_H = 64;
const TILE_SIZE = 16;

// Grass: GIDs 1–160 (Grass_Tiles_1, 16 cols × 10 rows). GID 81 = plain-middle.
const GRASS_FILL_GID  = 81;
// FarmLand: GIDs 241–368 (FarmLand_Tile, 16 cols). GID 241 = first farmland tile.
const FARM_FILL_GID   = 241;
// FarmLand zone: south-centre of map — rows 44–54, cols 8–55 (48 wide × 11 tall).
const FARM_ROW_START  = 44;
const FARM_ROW_END    = 55;  // inclusive
const FARM_COL_START  = 8;
const FARM_COL_END    = 55;  // inclusive

const SPAWN_X = (MAP_W / 2) * TILE_SIZE;  // 512
const SPAWN_Y = (MAP_H / 2) * TILE_SIZE;  // 512

function fillLayer(gid: number): number[] {
  return new Array<number>(MAP_W * MAP_H).fill(gid);
}

function emptyLayer(): number[] {
  return new Array<number>(MAP_W * MAP_H).fill(0);
}

/** Build the ground layer: grass everywhere, with a farmland patch in the south-centre. */
function groundLayer(): number[] {
  const data = fillLayer(GRASS_FILL_GID);
  const variants = [GRASS_FILL_GID, GRASS_FILL_GID, GRASS_FILL_GID, GRASS_FILL_GID + 1, GRASS_FILL_GID - 1];
  let seed = 12345;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0xffffffff; };

  for (let r = 0; r < MAP_H; r++) {
    for (let c = 0; c < MAP_W; c++) {
      const idx = r * MAP_W + c;
      if (r >= FARM_ROW_START && r <= FARM_ROW_END && c >= FARM_COL_START && c <= FARM_COL_END) {
        // Farmland patch — FarmLand_Tile GIDs 241+ for slight variety
        data[idx] = FARM_FILL_GID + (rng() < 0.15 ? Math.floor(rng() * 3) : 0);
      } else {
        if (rng() < 0.08) data[idx] = variants[Math.floor(rng() * variants.length)];
      }
    }
  }
  return data;
}

function tileLayer(id: number, name: string, data: number[]) {
  return {
    data,
    height: MAP_H,
    id,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: MAP_W,
    x: 0,
    y: 0,
  };
}

function objectLayer(id: number, name: string) {
  return {
    draworder: 'topdown',
    id,
    name,
    objects: [
      {
        height: 0,
        id: 1,
        name: 'player_spawn',
        rotation: 0,
        type: 'player',
        visible: true,
        width: 0,
        x: SPAWN_X,
        y: SPAWN_Y,
      },
    ],
    opacity: 1,
    type: 'objectgroup',
    visible: false,
    x: 0,
    y: 0,
  };
}

const map = {
  compressionlevel: -1,
  height: MAP_H,
  infinite: false,
  layers: [
    tileLayer(1, 'ground',           groundLayer()),
    tileLayer(2, 'ground_detail',    emptyLayer()),
    tileLayer(3, 'decoration_below', emptyLayer()),
    tileLayer(4, 'buildings_baked',  emptyLayer()),
    tileLayer(5, 'decoration_above', emptyLayer()),
    tileLayer(6, 'collision',        emptyLayer()),
    objectLayer(7, 'spawns'),
  ],
  nextlayerid: 8,
  nextobjectid: 2,
  orientation: 'orthogonal',
  renderorder: 'right-down',
  tileheight: TILE_SIZE,
  tilesets: [
    {
      columns: 16,            // terrain_base.png is 256px wide → 16 tiles/row
      firstgid: 1,
      image: '../tilesets/terrain_base.png',
      imageheight: 592,
      imagewidth: 256,
      margin: 0,
      name: 'terrain_base',
      spacing: 0,
      tilecount: 592,         // 16 cols × 37 rows
      tileheight: TILE_SIZE,
      tilewidth: TILE_SIZE,
    },
  ],
  tiledversion: '1.12.0',
  tilewidth: TILE_SIZE,
  type: 'map',
  version: '1.10',
  width: MAP_W,
};

const outDir  = join(ROOT, 'public', 'assets', 'maps');
const outPath = join(outDir, 'world.tmj');

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf-8');
console.log(`world.tmj written — ${MAP_W}×${MAP_H} tiles`);
console.log('Layers: ground, ground_detail, decoration_below, buildings_baked, decoration_above, collision, spawns');
console.log(`Player spawn: (${SPAWN_X}, ${SPAWN_Y}) world px`);
console.log('');
console.log('NOTE: Open in Tiled to re-author with visual precision.');
console.log('      Update GRASS_FILL_GID in this script if the grass tile looks wrong.');
