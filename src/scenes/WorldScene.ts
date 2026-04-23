import { Scene, Input, GameObjects } from 'phaser';
import { InputSystem } from '../systems/InputSystem';
import { BuildSystem } from '../systems/BuildSystem';
import { TimeSystem, HOUR_DAWN, HOUR_DAY, HOUR_NIGHT } from '../systems/TimeSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { ResourceNodeSystem } from '../systems/ResourceNodeSystem';
import { VillagerSystem } from '../systems/VillagerSystem';
import { Animal } from '../entities/Animal';
import type { Resources } from '../systems/EconomySystem';
import type { PlacedBuildingData, BuildingInfo, AnimalType } from '../types';
import { initGrid, initTerrainFromGids } from '../utils/grid';
import { buildingCatalog } from '../data/buildingCatalog';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';

const DEPTH_GROUND    = 0;
const DEPTH_ABOVE     = 20;
const DEPTH_OVERLAY   = 80; // day/night overlay — above world, below UI

/** Particle count for rain emitter. */
const RAIN_COUNT = 40;

/** ms between weather rolls (5 game-minutes = 5000ms at GAME_MINUTE_MS=1000). */
const WEATHER_CHECK_INTERVAL = 5;
const WEATHER_RAIN_CHANCE    = 0.10;
/** Game-minutes rain lasts once triggered. */
const WEATHER_RAIN_DURATION  = 2;

export class WorldScene extends Scene {
  private inputSystem!:        InputSystem;
  private buildSystem!:        BuildSystem;
  private timeSystem!:         TimeSystem;
  readonly economySystem!:     EconomySystem;
  private resourceNodeSystem!: ResourceNodeSystem;
  private villagerSystem!:     VillagerSystem;
  private animals:             Animal[] = [];
  private dayNightOverlay!:    GameObjects.Rectangle;
  private rainEmitter:         Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private weatherTickCounter = 0;
  private rainTicksRemaining = 0;
  private keys!: {
    one:   Input.Keyboard.Key;
    two:   Input.Keyboard.Key;
    three: Input.Keyboard.Key;
  };

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const map     = this.make.tilemap({ key: 'world' });
    const tileset = map.addTilesetImage('terrain_base', 'terrain_base')!;

    map.createLayer('ground',           tileset)!.setDepth(DEPTH_GROUND);
    map.createLayer('ground_detail',    tileset)!.setDepth(DEPTH_GROUND + 1);
    map.createLayer('decoration_below', tileset)!.setDepth(DEPTH_GROUND + 2);
    map.createLayer('buildings_baked',  tileset)!.setDepth(DEPTH_GROUND + 3);
    map.createLayer('decoration_above', tileset)!.setDepth(DEPTH_ABOVE);

    initGrid(map.width, map.height);

    const groundLayerData = map.getLayer('ground');
    if (groundLayerData) {
      const gids = groundLayerData.data.map(row => row.map(tile => tile.index));
      initTerrainFromGids(gids);
    }

    this.inputSystem = new InputSystem(this);
    this.inputSystem.init(map.widthInPixels, map.heightInPixels);

    (this as { economySystem: EconomySystem }).economySystem = new EconomySystem(this);

    this.resourceNodeSystem = new ResourceNodeSystem(this, map.width, map.height);
    this.resourceNodeSystem.spawnNodes();
    this.resourceNodeSystem.registerAsPathfindingBlocker();

    this.economySystem.setResourceNodeSystem(this.resourceNodeSystem);

    this.buildSystem = new BuildSystem(this, this.economySystem);
    this.buildSystem.init();

    this.timeSystem     = new TimeSystem(this);
    this.villagerSystem = new VillagerSystem(this);

    // Spawn animals and villagers when buildings are placed
    this.events.on('building:placed', (data: PlacedBuildingData) => {
      if (data.def.isHouse) {
        this.villagerSystem.spawnForHouse(data);
      }
      if (data.def.isCoop) {
        this.spawnAnimals('chicken', data, 2);
      }
      if (data.def.isBarn) {
        this.spawnAnimals('cow', data, 1);
        this.spawnAnimals('pig', data, 2);
      }
    });

    // Enrich building:selected with economy data, then broadcast as building:info
    this.events.on('building:selected', (data: PlacedBuildingData) => {
      const info = this.computeBuildingInfo(data);
      this.events.emit('building:info', info);

      // If the building has worker slots, also emit for assign panel
      if ((data.def.workerSlots ?? 0) > 0) {
        this.events.emit('building:workplace:selected', data);
      }
    });

    this.events.on('building:deselected', () => {
      this.events.emit('building:workplace:deselected');
    });

    // Day/night overlay — fixed to screen, scrolls with nothing
    this.dayNightOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH * 4, GAME_HEIGHT * 4, 0x1a2255, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_OVERLAY);

    // Listen to time events for day/night transitions
    this.events.on('time:dawn',  this.onDawn,  this);
    this.events.on('time:day',   this.onDay,   this);
    this.events.on('time:night', this.onNight, this);
    this.events.on('time:tick',  this.onTick,  this);

    // Set initial overlay to night (starting hour is 6 = just-day)
    this.onDay();

    this.scene.launch('UIScene');

    const kb = this.input.keyboard!;
    this.keys = {
      one:   kb.addKey(Input.Keyboard.KeyCodes.ONE),
      two:   kb.addKey(Input.Keyboard.KeyCodes.TWO),
      three: kb.addKey(Input.Keyboard.KeyCodes.THREE),
    };
  }

  getEconomySnapshot(): Resources {
    return this.economySystem.getSnapshot();
  }

  getVillagerSystem(): VillagerSystem {
    return this.villagerSystem;
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update(delta);
    this.timeSystem.update(delta);
    this.villagerSystem.update(delta);

    for (const a of this.animals) a.update(delta);

    if (Input.Keyboard.JustDown(this.keys.one)) {
      this.events.emit('build:start', buildingCatalog[0].key);
    } else if (Input.Keyboard.JustDown(this.keys.two)) {
      this.events.emit('build:start', buildingCatalog[1].key);
    } else if (Input.Keyboard.JustDown(this.keys.three)) {
      this.events.emit('build:start', buildingCatalog[2].key);
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private spawnAnimals(type: AnimalType, data: PlacedBuildingData, count: number): void {
    for (let i = 0; i < count; i++) {
      this.animals.push(new Animal(
        this,
        type,
        data.col,
        data.row,
        data.def.footprint.w,
        data.def.footprint.h,
      ));
    }
  }

  private computeBuildingInfo(data: PlacedBuildingData): BuildingInfo {
    const { def, col, row } = data;
    const workerSlots    = def.workerSlots ?? 1;
    const productionRate = this.economySystem.getEffectiveRate(def, col, row);
    const resourceMessage = this.economySystem.getResourceMessage(def, col, row);

    return {
      id:             data.id,
      def,
      col,
      row,
      workerSlots,
      maxWorkerSlots: workerSlots,
      productionRate,
      resourceMessage,
    };
  }

  // ─── day/night ────────────────────────────────────────────────────────────

  private onDawn(): void {
    // Fade overlay from night toward day
    this.tweens.add({
      targets:  this.dayNightOverlay,
      alpha:    0.35,
      duration: 800,
    });
  }

  private onDay(): void {
    this.tweens.add({
      targets:  this.dayNightOverlay,
      alpha:    0,
      duration: 1500,
    });
  }

  private onNight(): void {
    this.tweens.add({
      targets:  this.dayNightOverlay,
      alpha:    0.6,
      duration: 2000,
    });
  }

  // ─── weather ──────────────────────────────────────────────────────────────

  private onTick(): void {
    this.weatherTickCounter++;

    if (this.rainTicksRemaining > 0) {
      this.rainTicksRemaining--;
      if (this.rainTicksRemaining === 0) {
        this.stopRain();
      }
    }

    if (this.weatherTickCounter >= WEATHER_CHECK_INTERVAL) {
      this.weatherTickCounter = 0;
      if (this.rainTicksRemaining === 0 && Math.random() < WEATHER_RAIN_CHANCE) {
        this.startRain();
      }
    }
  }

  private startRain(): void {
    if (this.rainEmitter) return;

    const cam = this.cameras.main;
    const w   = cam.width;

    // Emit rain drops scrolling with the camera (use scrollFactor 0 emitter position)
    // Particles use world coords; position at top of viewport
    try {
      this.rainEmitter = this.add.particles(w / 2, -20, 'weather', {
        frame:    'Rain_Drop',
        x:        { min: -w / 2, max: w / 2 },
        y:        { min: -30, max: 0 },
        speedY:   { min: 300, max: 500 },
        speedX:   { min: -20, max: 20 },
        scaleX:   0.6,
        scaleY:   0.6,
        alpha:    { start: 0.7, end: 0 },
        lifespan: { min: 800, max: 1200 },
        quantity: RAIN_COUNT,
        frequency: 30,
      });
      this.rainEmitter.setDepth(DEPTH_OVERLAY - 1);
      this.rainEmitter.setScrollFactor(0);
    } catch {
      // Particle emitter may not be available in all Phaser 4 builds
    }

    // Blue tint bump during rain
    this.tweens.add({
      targets:  this.dayNightOverlay,
      alpha:    Math.min(this.dayNightOverlay.alpha + 0.15, 0.7),
      duration: 1000,
    });

    this.rainTicksRemaining = WEATHER_RAIN_DURATION;
  }

  private stopRain(): void {
    if (this.rainEmitter) {
      this.rainEmitter.stop();
      this.time.delayedCall(2000, () => {
        this.rainEmitter?.destroy();
        this.rainEmitter = null;
      });
    }
    // Restore overlay alpha to pre-rain value based on time of day
    const hour   = this.timeSystem.gameHour;
    const target = (hour >= HOUR_DAY && hour < HOUR_NIGHT) ? 0 :
                   (hour === HOUR_DAWN) ? 0.35 : 0.6;
    this.tweens.add({
      targets:  this.dayNightOverlay,
      alpha:    target,
      duration: 2000,
    });
  }
}
