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

export type ResourceType = 'Wood' | 'Stone' | 'Food' | 'Gold';
export type ResourceMap = Partial<Record<ResourceType, number>>;

export type BuildMenuTab = 'Housing' | 'Production' | 'Resource' | 'Decoration';

export interface BuildingDef {
  key: string;
  label: string;
  tab: BuildMenuTab;
  spriteFrame: string;
  footprint: Footprint;
  terrainAllowed: TerrainType[];
  cost: ResourceMap;
  produces: ResourceMap;
  consumes: ResourceMap;
}
