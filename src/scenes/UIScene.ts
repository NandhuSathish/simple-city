import { Scene, GameObjects } from 'phaser';
import { ResourceBar } from '../ui/ResourceBar';
import { BuildMenu } from '../ui/BuildMenu';
import { BuildingInfoPanel } from '../ui/BuildingInfoPanel';
import { VillagerAssignPanel } from '../ui/VillagerAssignPanel';
import { ClockWidget } from '../ui/ClockWidget';
import { PauseMenu } from '../ui/PauseMenu';
import { TechTree } from '../ui/TechTree';
import type { Resources } from '../systems/EconomySystem';
import type { BuildingInfo, PlacedBuildingData } from '../types';
import type { WorldScene } from './WorldScene';

const TOAST_DEPTH = 250;

export class UIScene extends Scene {
  private resourceBar!:      ResourceBar;
  private buildMenu!:        BuildMenu;
  private infoPanel!:        BuildingInfoPanel;
  private assignPanel!:      VillagerAssignPanel;
  private clockWidget!:      ClockWidget;
  private pauseMenu!:        PauseMenu;
  private techTree!:         TechTree;
  private toastQueue:        Array<{ text: string; timer: number }> = [];
  private toastLabel:        GameObjects.Text | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const world   = this.scene.get('WorldScene') as WorldScene;
    const unlocks = world.getUnlockSystem();
    const save    = world.getSaveSystem();

    this.resourceBar = new ResourceBar(this);
    this.buildMenu   = new BuildMenu(
      this,
      (key: string) => { world.events.emit('build:start', key); },
      (uk: string)  => unlocks.isUnlocked(uk),
    );
    this.infoPanel   = new BuildingInfoPanel(this);
    this.assignPanel = new VillagerAssignPanel(this, world.getVillagerSystem());
    this.clockWidget = new ClockWidget(this);

    this.pauseMenu = new PauseMenu(
      this,
      () => { save.save(); this.showToast('Game saved!'); },
      () => {
        const ok = save.load();
        this.showToast(ok ? 'Game loaded!' : 'No save found.');
        // Refresh UI after load
        if (ok) {
          this.buildMenu.onUnlockChanged(uk => unlocks.isUnlocked(uk));
          this.resourceBar.update(world.getEconomySnapshot());
        }
      },
      () => { this.techTree.show(); },
    );

    this.techTree = new TechTree(this, unlocks);

    // ─── World events ──────────────────────────────────────────────────────

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

    // Unlock gained — rebuild build menu and show toast
    world.events.on('unlock:gained', (payload: { key: string; label: string }) => {
      this.buildMenu.onUnlockChanged(uk => unlocks.isUnlocked(uk));
      this.showToast(`🏙 Unlocked: ${payload.label}!`);
    }, this);

    // Pause toggle from WorldScene (Esc key)
    world.events.on('pause:toggle', () => {
      const pausing = !this.pauseMenu.isVisible;
      this.pauseMenu.toggle();
      world.setPaused(pausing);
    }, this);

    // Save/load feedback
    world.events.on('save:ok',   () => this.showToast('Game saved ✓'),    this);
    world.events.on('load:ok',   () => {
      this.buildMenu.onUnlockChanged(uk => unlocks.isUnlocked(uk));
      this.resourceBar.update(world.getEconomySnapshot());
    }, this);
    world.events.on('save:error', (msg: string) => this.showToast(`Save failed: ${msg}`), this);

    // Fog reveal feedback
    world.events.on('fog:revealed', () => this.showToast('Region revealed!'), this);

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

    // Expansion tab: click on fogged region to reveal
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button !== 0) return;
      if (!unlocks.isUnlocked('tier10_expansion')) return;

      const fog = world.getFogOfWar();
      const cam = world.cameras.main;
      const wx  = cam.scrollX + ptr.x / cam.zoom;
      const wy  = cam.scrollY + ptr.y / cam.zoom;
      const REGION_TILES = 10;
      const TILE_SIZE    = 16;
      const rx = Math.floor(wx / (REGION_TILES * TILE_SIZE));
      const ry = Math.floor(wy / (REGION_TILES * TILE_SIZE));

      if (!fog.isRevealed(rx, ry)) {
        const ok = fog.tryRevealRegion(rx, ry);
        if (!ok) this.showToast('Need 50 Gold to reveal region!');
      }
    });
  }

  // ─── Toast system ──────────────────────────────────────────────────────────

  private showToast(msg: string, duration = 2500): void {
    this.toastQueue.push({ text: msg, timer: duration });
    if (!this.toastLabel) this.displayNextToast();
  }

  private displayNextToast(): void {
    if (this.toastQueue.length === 0) { this.toastLabel = null; return; }
    const { text, timer } = this.toastQueue.shift()!;

    const W = this.scale.width;
    const lbl = this.add.text(W / 2, 52, text, {
      fontSize:        '13px',
      fontFamily:      'monospace',
      color:           '#ffeeaa',
      backgroundColor: '#22224499',
      padding:         { x: 10, y: 5 },
    })
      .setOrigin(0.5, 0)
      .setDepth(TOAST_DEPTH)
      .setAlpha(0);

    this.toastLabel = lbl;

    this.tweens.add({
      targets: lbl,
      alpha:   1,
      duration: 200,
      onComplete: () => {
        this.time.delayedCall(timer, () => {
          this.tweens.add({
            targets: lbl,
            alpha:   0,
            duration: 300,
            onComplete: () => {
              lbl.destroy();
              this.displayNextToast();
            },
          });
        });
      },
    });
  }
}
