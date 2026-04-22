import { Scene } from 'phaser';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildMenu } from '../ui/BuildMenu';
import { BuildingInfoPanel } from '../ui/BuildingInfoPanel';
import type { Resources } from '../systems/EconomySystem';
import type { BuildingInfo } from '../types';
import type { WorldScene } from './WorldScene';

export class UIScene extends Scene {
  private resourceBar!:   ResourceBar;
  private buildMenu!:     BuildMenu;
  private infoPanel!:     BuildingInfoPanel;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const world = this.scene.get('WorldScene') as WorldScene;

    this.resourceBar = new ResourceBar(this);
    this.buildMenu   = new BuildMenu(this, (key: string) => {
      world.events.emit('build:start', key);
    });
    this.infoPanel = new BuildingInfoPanel(this);

    world.events.on('economy:changed', (res: Resources) => {
      this.resourceBar.update(res);
      this.buildMenu.onResourceUpdate(res);
    }, this);

    world.events.on('building:info', (info: BuildingInfo) => {
      this.infoPanel.show(info);
    }, this);

    world.events.on('building:deselected', () => {
      this.infoPanel.hide();
    }, this);

    // Right-click anywhere in UIScene closes the panel
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 2) this.infoPanel.hide();
    });

    const snapshot = world.getEconomySnapshot();
    this.resourceBar.update(snapshot);
    this.buildMenu.onResourceUpdate(snapshot);
  }
}
