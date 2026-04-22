import { Scene } from 'phaser';
import { TILE_SIZE, RENDER_SCALE } from '../config';

const GRID_COLS = 10;
const GRID_ROWS = 10;

export class WorldScene extends Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.add.image(col * TILE_SIZE, row * TILE_SIZE, 'grass').setOrigin(0, 0);
      }
    }

    const gridCenterX = (GRID_COLS * TILE_SIZE) / 2;
    const gridCenterY = (GRID_ROWS * TILE_SIZE) / 2;

    // Static player sprite, frame 0 (idle facing down)
    this.add.sprite(gridCenterX, gridCenterY, 'player', 0);

    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(gridCenterX, gridCenterY);
  }
}
