import { Scene } from 'phaser';
import { PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT } from '../config';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.image('grass', 'assets/grass_tile.png');
    this.load.spritesheet('player', 'assets/player.png', {
      frameWidth: PLAYER_FRAME_WIDTH,
      frameHeight: PLAYER_FRAME_HEIGHT,
    });
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
