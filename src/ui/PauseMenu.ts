import { Scene, GameObjects } from 'phaser';

const BG_COLOR  = 0x111122;
const BTN_COLOR = 0x2255aa;
const BTN_HOVER = 0x3377cc;
const MENU_W    = 260;
const MENU_H    = 300;
const BTN_W     = 200;
const BTN_H     = 42;
const DEPTH     = 300;

interface MenuItem {
  label:    string;
  action:   () => void;
}

export class PauseMenu {
  private readonly scene:    Scene;
  private container:         GameObjects.Container;
  private visible =          false;
  private onSave:            () => void;
  private onLoad:            () => void;
  private onTechTree:        () => void;

  constructor(
    scene:       Scene,
    onSave:      () => void,
    onLoad:      () => void,
    onTechTree:  () => void,
  ) {
    this.scene      = scene;
    this.onSave     = onSave;
    this.onLoad     = onLoad;
    this.onTechTree = onTechTree;
    this.container  = scene.add.container(0, 0).setDepth(DEPTH).setVisible(false);
    this.build();
  }

  get isVisible(): boolean { return this.visible; }

  show(): void {
    this.visible = true;
    this.container.setVisible(true);
    this.layout();
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.visible) this.hide(); else this.show();
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private layout(): void {
    const cx = this.scene.scale.width  / 2;
    const cy = this.scene.scale.height / 2;
    this.container.setPosition(cx, cy);
  }

  private build(): void {
    // Dark background overlay
    const overlay = this.scene.add.rectangle(0, 0,
      this.scene.scale.width * 2, this.scene.scale.height * 2, 0x000000, 0.55);
    this.container.add(overlay);

    // Menu panel
    const panel = this.scene.add.rectangle(0, 0, MENU_W, MENU_H, BG_COLOR, 0.97)
      .setStrokeStyle(2, 0x5588cc);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -MENU_H / 2 + 24, 'PAUSED', {
      fontSize:   '18px',
      color:      '#aaccff',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    const items: MenuItem[] = [
      { label: 'Resume',    action: () => this.hide() },
      { label: 'Save Game', action: () => { this.onSave(); this.hide(); } },
      { label: 'Load Game', action: () => { this.onLoad(); this.hide(); } },
      { label: 'Tech Tree', action: () => { this.hide(); this.onTechTree(); } },
    ];

    const startY = -MENU_H / 2 + 70;
    const step   = BTN_H + 10;

    for (let i = 0; i < items.length; i++) {
      this.addButton(items[i].label, 0, startY + i * step, items[i].action);
    }
  }

  private addButton(label: string, x: number, y: number, action: () => void): void {
    const bg = this.scene.add.rectangle(x, y, BTN_W, BTN_H, BTN_COLOR, 1)
      .setStrokeStyle(1, 0x6699dd)
      .setInteractive({ useHandCursor: true });

    const text = this.scene.add.text(x, y, label, {
      fontSize:   '14px',
      color:      '#eeeeff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0.5);

    bg.on('pointerover',  () => bg.setFillStyle(BTN_HOVER));
    bg.on('pointerout',   () => bg.setFillStyle(BTN_COLOR));
    bg.on('pointerdown',  () => action());

    this.container.add([bg, text]);
  }
}
