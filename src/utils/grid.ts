import { TILE_SIZE } from '../config';
import type { TerrainType } from '../types';

let gridCols = 64;
let gridRows = 64;
let occupancy: number[][];
let terrainGrid: TerrainType[][];

export function initGrid(cols: number, rows: number): void {
  gridCols = cols;
  gridRows = rows;
  occupancy   = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  terrainGrid = Array.from({ length: rows }, () => new Array<TerrainType>(cols).fill('grass'));
}

export function initTerrainFromGids(gids: number[][]): void {
  terrainGrid = gids.map(row => row.map(gid => gidToTerrain(gid)));
}

function gidToTerrain(gid: number): TerrainType {
  if (gid <= 0 || (gid >= 1 && gid <= 160))   return 'grass';
  if (gid >= 241 && gid <= 368)                return 'farmland';
  return 'path';
}

export function getTerrainAt(col: number, row: number): TerrainType {
  if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return 'grass';
  return terrainGrid[row][col];
}

export function isTerrainAllowed(
  col:     number,
  row:     number,
  w:       number,
  h:       number,
  allowed: TerrainType[],
): boolean {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (!allowed.includes(getTerrainAt(c, r))) return false;
    }
  }
  return true;
}

export function worldToTile(x: number, y: number): { col: number; row: number } {
  return { col: Math.floor(x / TILE_SIZE), row: Math.floor(y / TILE_SIZE) };
}

export function tileToWorld(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE, y: row * TILE_SIZE };
}

export function isFree(col: number, row: number, w: number, h: number): boolean {
  if (col < 0 || row < 0 || col + w > gridCols || row + h > gridRows) return false;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (occupancy[r][c] !== 0) return false;
    }
  }
  return true;
}

export function occupy(col: number, row: number, w: number, h: number, id: number): void {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      occupancy[r][c] = id;
    }
  }
}

export function release(col: number, row: number, w: number, h: number): void {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      occupancy[r][c] = 0;
    }
  }
}
