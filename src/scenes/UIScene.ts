import { Scene } from 'phaser';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildMenu } from '../ui/BuildMenu';
import { BuildingInfoPanel } from '../ui/BuildingInfoPanel';
import { VillagerAssignPanel } from '../ui/VillagerAssignPanel';
import { ClockWidget } from '../ui/ClockWidget';
import type { Resources } from '../systems/EconomySystem';
import type { BuildingInfo, PlacedBuildingData } from '../types';
import type { WorldScene } from './WorldScene';

export class UIScene extends Scene {
  private resourceBar!:      ResourceBar;
  private buildMenu!:        BuildMenu;
  private infoPanel!:        BuildingInfoPanel;
  private assignPanel!:      VillagerAssignPanel;
  private clockWidget!:      ClockWidget;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const world = this.scene.get('WorldScene') as WorldScene;

    this.resourceBar = new ResourceBar(this);
    this.buildMenu   = new BuildMenu(this, (key: string) => {
      world.events.emit('build:start', key);
    });
    this.infoPanel   = new BuildingInfoPanel(this);
    this.assignPanel = new VillagerAssignPanel(this, world.getVillagerSystem());
    this.clockWidget = new ClockWidget(this);

    world.events.on('economy:changed', (res: Resources) => {
      this.resourceBar.update(res);
      this.buildMenu.onResourceUpdate(res);
    }, this);

    world.events.on('time:tick', (data: { hour: number; day: number }) => {
      this.clockWidget.update(data.hour, data.day);
    }, this);

    world.events.on('building:info', (info: BuildingInfo) => {
      this.infoPanel.show(info);
    }, this);

    world.events.on('building:deselected', () => {
      this.infoPanel.hide();
      this.assignPanel.hide();
    }, this);

    world.events.on('building:workplace:selected', (data: PlacedBuildingData) => {
      if ((data.def.workerSlots ?? 0) > 0) {
        this.assignPanel.show(data);
      }
    }, this);

    world.events.on('building:workplace:deselected', () => {
      this.assignPanel.hide();
    }, this);

    // Right-click anywhere in UIScene closes panels
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button === 2) {
        this.infoPanel.hide();
        this.assignPanel.hide();
      }
    });

    const snapshot = world.getEconomySnapshot();
    this.resourceBar.update(snapshot);
    this.buildMenu.onResourceUpdate(snapshot);
  }
}
