import { Game, AUTO, Scale } from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';

new Game({
  type: AUTO,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  parent: 'app',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, WorldScene],
});
