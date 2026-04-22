import { Scene } from 'phaser';
import { InputSystem } from '../systems/InputSystem';

const DEPTH_GROUND = 0;
const DEPTH_ABOVE  = 20;

export class WorldScene extends Scene {
  private inputSystem!: InputSystem;

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

    this.inputSystem = new InputSystem(this);
    this.inputSystem.init(map.widthInPixels, map.heightInPixels);
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update(delta);
  }
}
