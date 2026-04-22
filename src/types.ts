export interface TileCoord {
  col: number;
  row: number;
}

export interface WorldCoord {
  x: number;
  y: number;
}

export type TerrainType = 'grass' | 'path' | 'farmland' | 'water';

export interface Footprint {
  w: number;
  h: number;
}

export interface BuildingDef {
  key: string;
  spriteFrame: string;
  footprint: Footprint;
  terrainAllowed: TerrainType[];
}
