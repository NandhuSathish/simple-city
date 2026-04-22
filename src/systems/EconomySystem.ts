import type { Scene } from 'phaser';
import type { BuildingDef, ResourceMap, ResourceType } from '../types';

export interface Resources {
  Wood:  number;
  Stone: number;
  Food:  number;
  Gold:  number;
}

const STARTING_RESOURCES: Resources = {
  Wood:  50,
  Stone: 20,
  Food:  30,
  Gold:  100,
};

export class EconomySystem {
  private readonly scene: Scene;
  private resources: Resources = { ...STARTING_RESOURCES };
  private buildings: BuildingDef[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    scene.events.on('time:tick', this.tick, this);
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

  addBuilding(def: BuildingDef): void {
    this.buildings.push(def);
  }

  getSnapshot(): Resources {
    return { ...this.resources };
  }

  private tick(): void {
    for (const def of this.buildings) {
      for (const [k, v] of Object.entries(def.produces) as [ResourceType, number][]) {
        this.resources[k] = Math.max(0, this.resources[k] + v);
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
