import type { Scene } from 'phaser';
import type { BuildingDef, ResourceMap, ResourceType } from '../types';
import type { ResourceNodeSystem } from './ResourceNodeSystem';

export interface Resources {
  Wood:  number;
  Stone: number;
  Food:  number;
  Gold:  number;
  Mana:  number;
}

interface PlacedEntry {
  def: BuildingDef;
  col: number;
  row: number;
}

const STARTING_RESOURCES: Resources = {
  Wood:  50,
  Stone: 20,
  Food:  30,
  Gold:  100,
  Mana:  0,
};

export class EconomySystem {
  private readonly scene:    Scene;
  private resources:         Resources = { ...STARTING_RESOURCES };
  private entries:           PlacedEntry[] = [];
  private resourceNodes:     ResourceNodeSystem | null = null;
  private happinessMultiplier = 1.0;
  // Cumulative totals — only go up, never deducted
  private _cumulativeGold  = 0;
  private _cumulativeStone = 0;

  constructor(scene: Scene) {
    this.scene = scene;
    scene.events.on('time:tick', this.tick, this);
  }

  setResourceNodeSystem(rns: ResourceNodeSystem): void {
    this.resourceNodes = rns;
  }

  /** Set the production speed multiplier from the happiness system (1.0 – 1.3). */
  setHappinessMultiplier(m: number): void {
    this.happinessMultiplier = m;
  }

  canAfford(cost: ResourceMap): boolean {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      const cur = this.resources[k] ?? 0;
      if (cur < v) return false;
    }
    return true;
  }

  deductCost(cost: ResourceMap): void {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      this.resources[k] = Math.max(0, (this.resources[k] ?? 0) - v);
    }
    this.emit();
  }

  addBuilding(def: BuildingDef, col: number, row: number): void {
    this.entries.push({ def, col, row });
  }

  removeBuilding(col: number, row: number): void {
    this.entries = this.entries.filter(e => !(e.col === col && e.row === row));
  }

  getSnapshot(): Resources {
    return { ...this.resources };
  }

  get cumulativeGold():  number { return this._cumulativeGold; }
  get cumulativeStone(): number { return this._cumulativeStone; }

  /** Directly set resources (used by SaveSystem during load). */
  restoreResources(r: Resources): void {
    this.resources = { ...r };
    this.emit();
  }

  restoreStats(goldEarned: number, stoneGathered: number): void {
    this._cumulativeGold  = goldEarned;
    this._cumulativeStone = stoneGathered;
  }

  getEffectiveRate(def: BuildingDef, col: number, row: number): ResourceMap {
    const workers = def.workerSlots ?? 1;
    const radius  = def.productionRadius ?? 0;
    const hm      = this.happinessMultiplier;

    if (def.requiresTrees) {
      const density = this.resourceNodes?.getTreeDensity(col, row, radius) ?? 0;
      return scaleMap(def.produces, workers * density * hm);
    }
    if (def.requiresOre) {
      const density = this.resourceNodes?.getOreDensity(col, row, radius) ?? 0;
      return scaleMap(def.produces, workers * density * hm);
    }
    return scaleMap(def.produces, workers * hm);
  }

  getResourceMessage(def: BuildingDef, col: number, row: number): string {
    const radius = def.productionRadius ?? 0;
    if (def.requiresTrees) {
      const count   = this.resourceNodes?.countInRadius(col, row, radius, 'tree') ?? 0;
      const density = this.resourceNodes?.getTreeDensity(col, row, radius) ?? 0;
      if (count === 0) return 'No trees in range';
      return `Trees in range: ${count}  (${Math.round(density * 100)}% full)`;
    }
    if (def.requiresOre) {
      const count   = this.resourceNodes?.countInRadius(col, row, radius, 'ore') ?? 0;
      const density = this.resourceNodes?.getOreDensity(col, row, radius) ?? 0;
      if (count === 0) return 'No ore in range';
      return `Ore in range: ${count}  (${Math.round(density * 100)}% full)`;
    }
    return '';
  }

  private tick(): void {
    for (const { def, col, row } of this.entries) {
      const workers = def.workerSlots ?? 1;
      const radius  = def.productionRadius ?? 0;
      const hm      = this.happinessMultiplier;

      let density = 1;
      if (def.requiresTrees) {
        density = this.resourceNodes?.getTreeDensity(col, row, radius) ?? 0;
        if (density > 0) {
          const totalProduced = Object.values(def.produces).reduce((a, b) => a + (b ?? 0), 0);
          this.resourceNodes?.depleteInRadius(col, row, radius, workers * density * totalProduced, 'tree');
        }
      } else if (def.requiresOre) {
        density = this.resourceNodes?.getOreDensity(col, row, radius) ?? 0;
        if (density > 0) {
          const totalProduced = Object.values(def.produces).reduce((a, b) => a + (b ?? 0), 0);
          this.resourceNodes?.depleteInRadius(col, row, radius, workers * density * totalProduced, 'ore');
        }
      }

      const effectiveScale = workers * density * hm;
      for (const [k, v] of Object.entries(def.produces) as [ResourceType, number][]) {
        const gained = v * effectiveScale;
        this.resources[k] = (this.resources[k] ?? 0) + gained;
        if (k === 'Gold')  this._cumulativeGold  += gained;
        if (k === 'Stone') this._cumulativeStone += gained;
      }
      for (const [k, v] of Object.entries(def.consumes) as [ResourceType, number][]) {
        this.resources[k] = Math.max(0, (this.resources[k] ?? 0) - v);
      }
    }
    this.emit();
  }

  private emit(): void {
    this.scene.events.emit('economy:changed', this.getSnapshot());
  }
}

function scaleMap(map: ResourceMap, factor: number): ResourceMap {
  const result: ResourceMap = {};
  for (const [k, v] of Object.entries(map) as [ResourceType, number][]) {
    result[k] = v * factor;
  }
  return result;
}
