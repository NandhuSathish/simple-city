import type { Scene } from 'phaser';
import type { SaveData } from '../types';
import type { EconomySystem } from './EconomySystem';
import type { TimeSystem } from './TimeSystem';
import type { BuildSystem } from './BuildSystem';
import type { VillagerSystem } from './VillagerSystem';
import type { UnlockSystem } from './UnlockSystem';
import type { FogOfWar } from './FogOfWar';

const SAVE_KEY = 'cf_city_save_v1';

export class SaveSystem {
  private readonly scene:    Scene;
  private readonly economy:  EconomySystem;
  private readonly time:     TimeSystem;
  private readonly build:    BuildSystem;
  private readonly villagers: VillagerSystem;
  private readonly unlocks:  UnlockSystem;
  private readonly fog:      FogOfWar;

  constructor(
    scene:     Scene,
    economy:   EconomySystem,
    time:      TimeSystem,
    build:     BuildSystem,
    villagers: VillagerSystem,
    unlocks:   UnlockSystem,
    fog:       FogOfWar,
  ) {
    this.scene    = scene;
    this.economy  = economy;
    this.time     = time;
    this.build    = build;
    this.villagers = villagers;
    this.unlocks  = unlocks;
    this.fog      = fog;
  }

  hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  save(): void {
    const cam  = this.scene.cameras.main;
    const snap = this.economy.getSnapshot();

    const data: SaveData = {
      version:  1,
      camera:   { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom },
      resources: {
        Wood:  snap.Wood,
        Stone: snap.Stone,
        Food:  snap.Food,
        Gold:  snap.Gold,
        Mana:  snap.Mana,
      },
      time: { day: this.time.gameDay, hour: this.time.gameHour },
      buildings: this.build.getPlaced().map(b => ({
        key:     b.def.key,
        col:     b.col,
        row:     b.row,
        workers: 0,
      })),
      villagers: this.villagers.getVillagers().map(v => ({
        id:          v.id,
        homeId:      null,
        workplaceId: v.workplaceId,
        col:         v.tileCol,
        row:         v.tileRow,
      })),
      cropPlots: [],
      unlocks:   this.unlocks.getUnlocks(),
      fogRevealed: this.fog.getRevealedRegions(),
      stats: {
        goldEarned:    this.economy.cumulativeGold,
        stoneGathered: this.economy.cumulativeStone,
      },
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      this.scene.events.emit('save:ok');
    } catch {
      this.scene.events.emit('save:error', 'Storage full or unavailable');
    }
  }

  load(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    let data: SaveData;
    try {
      data = JSON.parse(raw) as SaveData;
    } catch {
      return false;
    }
    if (data.version !== 1) return false;

    this.applyData(data);
    this.scene.events.emit('load:ok');
    return true;
  }

  deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  private applyData(data: SaveData): void {
    // Restore resources
    this.economy.restoreResources({
      Wood:  data.resources.Wood,
      Stone: data.resources.Stone,
      Food:  data.resources.Food,
      Gold:  data.resources.Gold,
      Mana:  data.resources.Mana ?? 0,
    });
    this.economy.restoreStats(data.stats?.goldEarned ?? 0, data.stats?.stoneGathered ?? 0);

    // Restore buildings (silent — no cost, no event side-effects like villager spawns)
    for (const b of data.buildings) {
      this.build.silentPlace(b.key, b.col, b.row);
    }

    // Restore unlocks
    this.unlocks.restoreUnlocks(data.unlocks ?? []);

    // Restore fog
    if (data.fogRevealed) {
      this.fog.restoreRevealed(data.fogRevealed);
    }

    // Restore camera
    const cam = this.scene.cameras.main;
    cam.scrollX = data.camera.x;
    cam.scrollY = data.camera.y;
    cam.setZoom(data.camera.zoom);

    // Emit economy:changed so the HUD refreshes
    this.scene.events.emit('economy:changed', this.economy.getSnapshot());
  }
}
