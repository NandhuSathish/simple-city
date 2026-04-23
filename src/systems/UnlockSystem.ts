import type { Scene } from 'phaser';
import type { PlacedBuildingData } from '../types';
import type { EconomySystem } from './EconomySystem';
import type { VillagerSystem } from './VillagerSystem';
import type { BuildSystem } from './BuildSystem';

export interface UnlockDef {
  key:         string;
  label:       string;
  description: string;
  prereqs:     string[];
}

export const UNLOCK_DEFS: UnlockDef[] = [
  {
    key:         'tier1_starter',
    label:       'Starter Village',
    description: 'Wood houses, windmills, wells — always available.',
    prereqs:     [],
  },
  {
    key:         'tier2_farming',
    label:       'Farming',
    description: 'Farms, lumberjack huts, quarries. Place a Wood House.',
    prereqs:     ['tier1_starter'],
  },
  {
    key:         'tier3_residential',
    label:       'Residential',
    description: 'Stone & Limestone houses. Place 3 Wood Houses.',
    prereqs:     ['tier2_farming'],
  },
  {
    key:         'tier4_marketplace',
    label:       'Marketplace',
    description: 'Market Stalls & Fountain. Earn 100 Gold cumulative.',
    prereqs:     ['tier3_residential'],
  },
  {
    key:         'tier5_waterfront',
    label:       'Waterfront',
    description: 'Fisherman House & Boat. Place a Market Stall.',
    prereqs:     ['tier4_marketplace'],
  },
  {
    key:         'tier6_quarry',
    label:       'Quarry',
    description: 'Mining Post & extra ore. Gather 50 Stone cumulative.',
    prereqs:     ['tier2_farming'],
  },
  {
    key:         'tier7_walls',
    label:       'Wall & Gate',
    description: 'Wall segments. Reach 10 villagers.',
    prereqs:     ['tier3_residential'],
  },
  {
    key:         'tier8_park',
    label:       'Decoration Park',
    description: 'Benches, flowers & happiness buffs. Decorations ≥ half your houses.',
    prereqs:     ['tier4_marketplace'],
  },
  {
    key:         'tier9_magic',
    label:       'Magic District',
    description: 'Magic Academy & Mana resource. Earn 200 Gold cumulative.',
    prereqs:     ['tier4_marketplace'],
  },
  {
    key:         'tier10_expansion',
    label:       'Expansion Land',
    description: 'Reveal fogged regions for 50 Gold each. Unlock Magic District.',
    prereqs:     ['tier9_magic'],
  },
];

export class UnlockSystem {
  private readonly scene:    Scene;
  private readonly economy:  EconomySystem;
  private readonly villagers: VillagerSystem;
  private readonly build:    BuildSystem;
  private unlocks:           Set<string> = new Set(['tier1_starter']);
  private marketStallPlaced = false;

  constructor(
    scene:    Scene,
    economy:  EconomySystem,
    villagers: VillagerSystem,
    build:    BuildSystem,
  ) {
    this.scene    = scene;
    this.economy  = economy;
    this.villagers = villagers;
    this.build    = build;

    scene.events.on('time:tick',       this.check, this);
    scene.events.on('building:placed', this.onBuildingPlaced, this);
  }

  isUnlocked(key: string): boolean {
    return this.unlocks.has(key);
  }

  getUnlocks(): string[] {
    return [...this.unlocks];
  }

  restoreUnlocks(keys: string[]): void {
    for (const k of keys) this.unlocks.add(k);
  }

  /** Happiness: decoration_count / house_count (0..1). */
  getHappiness(): number {
    const placed    = this.build.getPlaced();
    const houses    = placed.filter(b => b.def.isHouse).length;
    const decors    = placed.filter(b => b.def.isDecoration).length;
    return Math.min(1, decors / Math.max(1, houses));
  }

  /** Expose for save. */
  wasMarketStallPlaced(): boolean {
    return this.marketStallPlaced;
  }

  restoreMarketStall(v: boolean): void {
    this.marketStallPlaced = v;
  }

  private onBuildingPlaced(data: PlacedBuildingData): void {
    if (data.def.triggersWaterfront) this.marketStallPlaced = true;
    this.check();
  }

  private tryUnlock(key: string): void {
    if (this.unlocks.has(key)) return;
    this.unlocks.add(key);
    const def = UNLOCK_DEFS.find(d => d.key === key);
    this.scene.events.emit('unlock:gained', { key, label: def?.label ?? key });
  }

  private check(): void {
    const placed        = this.build.getPlaced();
    const woodHouses    = placed.filter(b => b.def.key === 'wood_house_blue').length;
    const villagerCount = this.villagers.getVillagers().length;
    const goldEarned    = this.economy.cumulativeGold;
    const stoneGathered = this.economy.cumulativeStone;
    const happiness     = this.getHappiness();

    if (woodHouses >= 1)        this.tryUnlock('tier2_farming');
    if (woodHouses >= 3)        this.tryUnlock('tier3_residential');
    if (goldEarned  >= 100)     this.tryUnlock('tier4_marketplace');
    if (this.marketStallPlaced) this.tryUnlock('tier5_waterfront');
    if (stoneGathered >= 50)    this.tryUnlock('tier6_quarry');
    if (villagerCount >= 10)    this.tryUnlock('tier7_walls');
    if (happiness >= 0.5)       this.tryUnlock('tier8_park');
    if (goldEarned >= 200)      this.tryUnlock('tier9_magic');
    if (this.unlocks.has('tier9_magic')) this.tryUnlock('tier10_expansion');

    // Propagate happiness multiplier to economy each tick
    this.economy.setHappinessMultiplier(1 + happiness * 0.3);
  }
}
