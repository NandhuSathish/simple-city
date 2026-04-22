import { Scene, Input } from 'phaser';
import { InputSystem } from '../systems/InputSystem';
import { BuildSystem } from '../systems/BuildSystem';
import { initGrid } from '../utils/grid';
import { buildingCatalog } from '../data/buildingCatalog';
import { RENDER_SCALE } from '../config';

const DEPTH_GROUND = 0;
const DEPTH_ABOVE  = 20;
const DEPTH_UI     = 100;

export class WorldScene extends Scene {
  private inputSystem!: InputSystem;
  private buildSystem!: BuildSystem;
  private keys!: {
    one: Input.Keyboard.Key;
    two: Input.Keyboard.Key;
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

    this.buildSystem = new BuildSystem(this);
    this.buildSystem.init();

    const kb = this.input.keyboard!;
    this.keys = {
      one:   kb.addKey(Input.Keyboard.KeyCodes.ONE),
      two:   kb.addKey(Input.Keyboard.KeyCodes.TWO),
      three: kb.addKey(Input.Keyboard.KeyCodes.THREE),
    };

    // setScrollFactor(0) positions are in world space * zoom = screen pixels.
    // Divide by RENDER_SCALE so the text lands at the correct screen position.
    const hintX = 8 / RENDER_SCALE;
    const hintY = (this.scale.height / RENDER_SCALE) - 14;
    this.add.text(hintX, hintY, '1: Wood House  2: Windmill  3: Well  ·  Esc: cancel', {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    }).setScrollFactor(0).setDepth(DEPTH_UI);
  }

  update(_time: number, delta: number): void {
    this.inputSystem.update(delta);

    if (Input.Keyboard.JustDown(this.keys.one)) {
      this.buildSystem.startPlacing(buildingCatalog[0].key);
    } else if (Input.Keyboard.JustDown(this.keys.two)) {
      this.buildSystem.startPlacing(buildingCatalog[1].key);
    } else if (Input.Keyboard.JustDown(this.keys.three)) {
      this.buildSystem.startPlacing(buildingCatalog[2].key);
    }
  }
}
