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

export type ResourceNodeType = 'tree' | 'ore';

export interface BuildingDef {
  key:            string;
  label:          string;
  tab:            BuildMenuTab;
  spriteFrame:    string;
  footprint:      Footprint;
  terrainAllowed: TerrainType[];
  cost:           ResourceMap;
  produces:       ResourceMap;
  consumes:       ResourceMap;
  /** Number of worker slots (Phase 4: all treated as filled). */
  workerSlots?:   number;
  /** Tile radius within which the building consumes resource nodes. */
  productionRadius?: number;
  /** If true, building requires nearby tree ResourceNodes to produce. */
  requiresTrees?: boolean;
  /** If true, building requires nearby ore ResourceNodes to produce. */
  requiresOre?:   boolean;
}

/** Data carried on the `building:selected` event. */
export interface PlacedBuildingData {
  id:     number;
  def:    BuildingDef;
  col:    number;
  row:    number;
}

/** Enriched info emitted as `building:info` for the UI info panel. */
export interface BuildingInfo {
  id:              number;
  def:             BuildingDef;
  col:             number;
  row:             number;
  workerSlots:     number;
  maxWorkerSlots:  number;
  productionRate:  ResourceMap;
  resourceMessage: string;
}
