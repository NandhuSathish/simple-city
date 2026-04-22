import { TILE_SIZE } from '../config';

let gridCols = 64;
let gridRows = 64;
let occupancy: number[][];

export function initGrid(cols: number, rows: number): void {
  gridCols = cols;
  gridRows = rows;
  occupancy = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
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
