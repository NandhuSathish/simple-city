import { Scene } from 'phaser';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.tilemapTiledJSON('world',     'assets/maps/world.tmj');
    this.load.image('terrain_base',          'assets/tilesets/terrain_base.png');
    this.load.atlas('buildings',             'assets/atlases/buildings.png', 'assets/atlases/buildings.json');
    this.load.atlas('icons',                 'assets/atlases/icons.png',     'assets/atlases/icons.json');
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
