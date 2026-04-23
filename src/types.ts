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

export type ResourceType = 'Wood' | 'Stone' | 'Food' | 'Gold' | 'Mana';
export type ResourceMap = Partial<Record<ResourceType, number>>;

export type BuildMenuTab =
  | 'Housing'
  | 'Production'
  | 'Resource'
  | 'Decoration'
  | 'Marketplace'
  | 'Waterfront'
  | 'Defense'
  | 'Magic'
  | 'Expansion';

export type ResourceNodeType = 'tree' | 'ore';

export type NpcKey =
  | 'farmer_bob'
  | 'farmer_buba'
  | 'lumberjack_jack'
  | 'miner_mike'
  | 'chef_chloe'
  | 'bartender_bruno'
  | 'bartender_katy'
  | 'fisherman_fin';

export type VillagerState = 'idle' | 'walkToWork' | 'work' | 'walkHome' | 'sleep';

export type AnimalType = 'chicken' | 'cow' | 'pig';

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
  /** Unlock key that must be in the unlocks set for this building to appear. */
  unlockKey?:     string;
  /** Number of worker slots (Phase 4: all treated as filled). */
  workerSlots?:   number;
  /** Tile radius within which the building consumes resource nodes. */
  productionRadius?: number;
  /** If true, building requires nearby tree ResourceNodes to produce. */
  requiresTrees?: boolean;
  /** If true, building requires nearby ore ResourceNodes to produce. */
  requiresOre?:   boolean;
  /** If true, footprint must be adjacent to at least one water tile. */
  requiresWaterAdj?: boolean;
  /** NPC sprite key used for workers assigned to this building. */
  workerSprite?:  NpcKey;
  /** If true, placing this building spawns a villager. */
  isHouse?:       boolean;
  /** If true, chickens wander inside this building's zone. */
  isCoop?:        boolean;
  /** If true, cows/pigs wander inside this building's zone. */
  isBarn?:        boolean;
  /** If true, counts as a decoration for happiness calculation. */
  isDecoration?:  boolean;
  /** If true, applies blue/purple tint + particle emitter in WorldScene. */
  isMagic?:       boolean;
  /** If true, this building unlocks the Waterfront tier when placed. */
  triggersWaterfront?: boolean;
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

// ─── Save data ────────────────────────────────────────────────────────────────

export interface SavedBuilding {
  key:     string;
  col:     number;
  row:     number;
  workers: number;
}

export interface SavedVillager {
  id:          number;
  homeId:      number | null;
  workplaceId: number | null;
  col:         number;
  row:         number;
}

export interface SaveStats {
  goldEarned:    number;
  stoneGathered: number;
}

export interface SaveData {
  version:     1;
  camera:      { x: number; y: number; zoom: number };
  resources:   { Wood: number; Stone: number; Food: number; Gold: number; Mana: number };
  time:        { day: number; hour: number };
  buildings:   SavedBuilding[];
  villagers:   SavedVillager[];
  cropPlots:   [];
  unlocks:     string[];
  fogRevealed: Array<[number, number]>;
  stats:       SaveStats;
}
