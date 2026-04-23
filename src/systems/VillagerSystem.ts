import type { Scene } from 'phaser';
import { Villager } from '../entities/Villager';
import type { NpcKey, PlacedBuildingData } from '../types';

/** NPC assigned to unemployed / house villagers (generic citizen). */
const GENERIC_NPC: NpcKey = 'chef_chloe';

export class VillagerSystem {
  private readonly scene:      Scene;
  private readonly villagers:  Villager[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    scene.events.on('time:day',   this.onDay,   this);
    scene.events.on('time:night', this.onNight, this);
  }

  getVillagers(): readonly Villager[] {
    return this.villagers;
  }

  getUnassignedVillagers(): Villager[] {
    return this.villagers.filter(v => v.workplaceId === null);
  }

  /** Spawn one villager when a house is placed. */
  spawnForHouse(data: PlacedBuildingData): void {
    const spawnCol = data.col + Math.floor(data.def.footprint.w / 2);
    const spawnRow = data.row + data.def.footprint.h;
    const v = new Villager(this.scene, GENERIC_NPC, spawnCol, spawnRow);
    this.villagers.push(v);
    this.scene.events.emit('villager:spawned', v);
  }

  /**
   * Assign an unassigned villager to a workplace building.
   * Returns false if the villager is not found or already assigned.
   */
  assignVillager(villagerId: number, buildingData: PlacedBuildingData): boolean {
    const v = this.villagers.find(v => v.id === villagerId);
    if (!v || v.workplaceId !== null) return false;

    const workerSprite = buildingData.def.workerSprite ?? GENERIC_NPC;
    // Re-create with correct NPC sprite if needed (simulated by reassignment)
    v.assignWorkplace(
      buildingData.id,
      buildingData.col + Math.floor(buildingData.def.footprint.w / 2),
      buildingData.row + buildingData.def.footprint.h,
    );

    this.scene.events.emit('villager:assigned', { villagerId, buildingId: buildingData.id, workerSprite });
    return true;
  }

  unassignVillager(villagerId: number): void {
    const v = this.villagers.find(v => v.id === villagerId);
    v?.unassignWorkplace();
  }

  /** Called each frame from WorldScene.update(). */
  update(delta: number): void {
    for (const v of this.villagers) {
      v.update(delta);
    }
  }

  // ─── day/night handlers ───────────────────────────────────────────────────

  private onDay(): void {
    for (const v of this.villagers) {
      if (v.currentState === 'sleep') {
        v.wake();
      }
      if (v.workplaceId !== null && (v.currentState === 'idle' || v.currentState === 'sleep')) {
        v.startWalkToWork();
      }
    }
  }

  private onNight(): void {
    for (const v of this.villagers) {
      if (v.currentState !== 'sleep' && v.currentState !== 'walkHome') {
        v.startWalkHome();
      }
    }
  }

  destroy(): void {
    this.scene.events.off('time:day',   this.onDay,   this);
    this.scene.events.off('time:night', this.onNight, this);
    for (const v of this.villagers) v.destroy();
    this.villagers.length = 0;
  }
}
