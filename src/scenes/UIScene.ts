import { Scene } from 'phaser';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildMenu } from '../ui/BuildMenu';
import type { Resources } from '../systems/EconomySystem';
import type { WorldScene } from './WorldScene';

export class UIScene extends Scene {
  private resourceBar!: ResourceBar;
  private buildMenu!: BuildMenu;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // UIScene always runs on top of WorldScene. Its camera is independent
    // (zoom=1, scroll=0) so all coordinates here are screen pixels.
    const world = this.scene.get('WorldScene') as WorldScene;

    this.resourceBar = new ResourceBar(this);

    this.buildMenu = new BuildMenu(this, (key: string) => {
      // Route build:start through WorldScene's event bus so BuildSystem picks it up
      world.events.emit('build:start', key);
    });

    // Subscribe to economy changes emitted by EconomySystem in WorldScene
    world.events.on('economy:changed', (res: Resources) => {
      this.resourceBar.update(res);
      this.buildMenu.onResourceUpdate(res);
    }, this);

    // Prime the UI with the current economy snapshot immediately
    const snapshot = world.getEconomySnapshot();
    this.resourceBar.update(snapshot);
    this.buildMenu.onResourceUpdate(snapshot);
  }
}
