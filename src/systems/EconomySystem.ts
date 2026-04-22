import type { Scene } from 'phaser';
import type { BuildingDef, ResourceMap, ResourceType } from '../types';
import type { ResourceNodeSystem } from './ResourceNodeSystem';

export interface Resources {
  Wood:  number;
  Stone: number;
  Food:  number;
  Gold:  number;
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
};

export class EconomySystem {
  private readonly scene:    Scene;
  private resources:         Resources = { ...STARTING_RESOURCES };
  private entries:           PlacedEntry[] = [];
  private resourceNodes:     ResourceNodeSystem | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    scene.events.on('time:tick', this.tick, this);
  }

  setResourceNodeSystem(rns: ResourceNodeSystem): void {
    this.resourceNodes = rns;
  }

  canAfford(cost: ResourceMap): boolean {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      if (this.resources[k] < v) return false;
    }
    return true;
  }

  deductCost(cost: ResourceMap): void {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      this.resources[k] = Math.max(0, this.resources[k] - v);
    }
    this.emit();
  }

  addBuilding(def: BuildingDef, col: number, row: number): void {
    this.entries.push({ def, col, row });
  }

  getSnapshot(): Resources {
    return { ...this.resources };
  }

  /**
   * Returns the effective production rate of a placed building, factoring in
   * nearby resource density. Used by the info panel for display.
   */
  getEffectiveRate(def: BuildingDef, col: number, row: number): ResourceMap {
    const workers = def.workerSlots ?? 1;
    const radius  = def.productionRadius ?? 0;

    if (def.requiresTrees) {
      const density = this.resourceNodes?.getTreeDensity(col, row, radius) ?? 0;
      return scaleMap(def.produces, workers * density);
    }
    if (def.requiresOre) {
      const density = this.resourceNodes?.getOreDensity(col, row, radius) ?? 0;
      return scaleMap(def.produces, workers * density);
    }
    // Farm or simple producer — flat rate
    return scaleMap(def.produces, workers);
  }

  /** Returns a human-readable resource availability message for the info panel. */
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

      const effectiveScale = workers * density;
      for (const [k, v] of Object.entries(def.produces) as [ResourceType, number][]) {
        this.resources[k] += v * effectiveScale;
      }
      for (const [k, v] of Object.entries(def.consumes) as [ResourceType, number][]) {
        this.resources[k] = Math.max(0, this.resources[k] - v);
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
