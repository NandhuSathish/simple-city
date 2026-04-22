import { Scene, Input } from 'phaser';
import { InputSystem } from '../systems/InputSystem';
import { BuildSystem } from '../systems/BuildSystem';
import { TimeSystem } from '../systems/TimeSystem';
import { EconomySystem } from '../systems/EconomySystem';
import type { Resources } from '../systems/EconomySystem';
import { initGrid } from '../utils/grid';
import { buildingCatalog } from '../data/buildingCatalog';
const DEPTH_GROUND = 0;
const DEPTH_ABOVE  = 20;

export class WorldScene extends Scene {
  private inputSystem!:   InputSystem;
  private buildSystem!:   BuildSystem;
  private timeSystem!:    TimeSystem;
  readonly economySystem!: EconomySystem;
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

    this.inputSystem = new InputSystem(this);
    this.inputSystem.init(map.widthInPixels, map.heightInPixels);

    // economySystem is declared readonly; cast to allow assignment in create()
    (this as { economySystem: EconomySystem }).economySystem = new EconomySystem(this);

    this.buildSystem = new BuildSystem(this, this.economySystem);
    this.buildSystem.init();

    this.timeSystem = new TimeSystem(this);

    // Launch UIScene on top — its create() will grab this scene's event bus
    this.scene.launch('UIScene');

    const kb = this.input.keyboard!;
    this.keys = {
      one:   kb.addKey(Input.Keyboard.KeyCodes.ONE),
      two:   kb.addKey(Input.Keyboard.KeyCodes.TWO),
      three: kb.addKey(Input.Keyboard.KeyCodes.THREE),
    };
  }

  /** Called by UIScene to prime the initial HUD state. */
  getEconomySnapshot(): Resources {
    return this.economySystem.getSnapshot();
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update(delta);
    this.timeSystem.update(delta);

    if (Input.Keyboard.JustDown(this.keys.one)) {
      this.events.emit('build:start', buildingCatalog[0].key);
    } else if (Input.Keyboard.JustDown(this.keys.two)) {
      this.events.emit('build:start', buildingCatalog[1].key);
    } else if (Input.Keyboard.JustDown(this.keys.three)) {
      this.events.emit('build:start', buildingCatalog[2].key);
    }
  }
}
