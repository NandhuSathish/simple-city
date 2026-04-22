import { Scene, GameObjects } from 'phaser';
import type { BuildingDef, BuildMenuTab, ResourceType, ResourceMap } from '../types';
import type { Resources } from '../systems/EconomySystem';
import { buildingCatalog } from '../data/buildingCatalog';
import { UI_BOTTOM_BAR_H } from '../config';

const TABS: BuildMenuTab[] = ['Housing', 'Production', 'Resource', 'Decoration'];
const TAB_H       = 24;
const BUTTON_W    = 72;
const BUTTON_H    = 72;
const BUTTON_PAD  = 6;
const PANEL_DEPTH = 190;

function costLabel(cost: ResourceMap): string {
  return Object.entries(cost)
    .map(([k, v]) => `${k} ${v}`)
    .join('  ');
}

function effectLabel(def: BuildingDef): string {
  const lines: string[] = [];
  const prod = Object.entries(def.produces);
  const cons = Object.entries(def.consumes);
  if (prod.length) lines.push('Produces: ' + prod.map(([k, v]) => `${k} ${v}/min`).join(', '));
  if (cons.length) lines.push('Consumes: ' + cons.map(([k, v]) => `${k} ${v}/min`).join(', '));
  return lines.join('\n');
}

interface ButtonState {
  bg:     GameObjects.Rectangle;
  sprite: GameObjects.Image;
  label:  GameObjects.Text;
  def:    BuildingDef;
}

export class BuildMenu {
  private readonly scene: Scene;
  private readonly onSelect: (key: string) => void;
  private activeTab: BuildMenuTab = 'Housing';

  private tabButtons: Map<BuildMenuTab, GameObjects.Rectangle> = new Map();
  private tabLabels:  Map<BuildMenuTab, GameObjects.Text>      = new Map();
  private buttons:    ButtonState[] = [];

  private tooltip!:     GameObjects.Container;
  private tooltipBg!:   GameObjects.Rectangle;
  private tooltipText!: GameObjects.Text;

  constructor(scene: Scene, onSelect: (key: string) => void) {
    this.scene    = scene;
    this.onSelect = onSelect;
    this.build();
  }

  onResourceUpdate(resources: Resources): void {
    for (const btn of this.buttons) {
      const affordable = this.canAfford(btn.def.cost, resources);
      btn.bg.setFillStyle(affordable ? 0x333355 : 0x222222);
      btn.sprite.setAlpha(affordable ? 1 : 0.4);
      if (affordable) {
        btn.bg.setInteractive();
      } else {
        btn.bg.disableInteractive();
      }
    }
  }

  // ─── private ─────────────────────────────────────────────────────────────

  private canAfford(cost: ResourceMap, resources: Resources): boolean {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      if (resources[k] < v) return false;
    }
    return true;
  }

  private build(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const panelY = H - UI_BOTTOM_BAR_H;

    // Background panel
    this.scene.add
      .rectangle(0, panelY, W, UI_BOTTOM_BAR_H, 0x111122, 0.85)
      .setOrigin(0, 0)
      .setDepth(PANEL_DEPTH);

    // Tabs
    const tabW = Math.min(100, (W - 16) / TABS.length);
    for (let i = 0; i < TABS.length; i++) {
      const tab     = TABS[i];
      const tx      = 8 + i * (tabW + 4);
      const ty      = panelY + 4;
      const isActive = tab === this.activeTab;

      const tabBg = this.scene.add
        .rectangle(tx, ty, tabW, TAB_H, isActive ? 0x3355aa : 0x223355, 1)
        .setOrigin(0, 0)
        .setDepth(PANEL_DEPTH + 1)
        .setInteractive({ useHandCursor: true });

      const tabLbl = this.scene.add
        .text(tx + tabW / 2, ty + TAB_H / 2, tab, {
          fontSize:   '10px',
          fontFamily: 'monospace',
          color:      '#ccddff',
        })
        .setOrigin(0.5, 0.5)
        .setDepth(PANEL_DEPTH + 2);

      tabBg.on('pointerdown', () => this.selectTab(tab));
      tabBg.on('pointerover',  () => { if (tab !== this.activeTab) tabBg.setFillStyle(0x2a4488); });
      tabBg.on('pointerout',   () => { if (tab !== this.activeTab) tabBg.setFillStyle(0x223355); });

      this.tabButtons.set(tab, tabBg);
      this.tabLabels.set(tab, tabLbl);
    }

    // Tooltip (shared, hidden by default)
    this.tooltipBg   = this.scene.add.rectangle(0, 0, 170, 56, 0x000000, 0.85).setOrigin(0, 1);
    this.tooltipText = this.scene.add
      .text(6, -4, '', {
        fontSize:   '10px',
        fontFamily: 'monospace',
        color:      '#ffffff',
        wordWrap:   { width: 158 },
      })
      .setOrigin(0, 1);
    this.tooltip = this.scene.add
      .container(0, 0, [this.tooltipBg, this.tooltipText])
      .setDepth(210)
      .setVisible(false);

    this.buildButtons();
  }

  private buildButtons(): void {
    for (const btn of this.buttons) {
      btn.bg.destroy();
      btn.sprite.destroy();
      btn.label.destroy();
    }
    this.buttons = [];

    const W    = this.scene.scale.width;
    const H    = this.scene.scale.height;
    const byY  = H - UI_BOTTOM_BAR_H + TAB_H + 10;
    const defs = buildingCatalog.filter(b => b.tab === this.activeTab);

    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const bx  = 8 + i * (BUTTON_W + BUTTON_PAD);
      if (bx + BUTTON_W > W - 8) break;

      const bg = this.scene.add
        .rectangle(bx, byY, BUTTON_W, BUTTON_H, 0x333355, 1)
        .setOrigin(0, 0)
        .setDepth(PANEL_DEPTH + 1)
        .setInteractive({ useHandCursor: true });

      // Scale sprite to fit within the icon area
      const iconArea = BUTTON_W - 8;
      const frame    = this.scene.textures.getFrame('buildings', def.spriteFrame);
      const scale    = Math.min(iconArea / frame.realWidth, iconArea / frame.realHeight);

      const sprite = this.scene.add
        .image(bx + BUTTON_W / 2, byY + 4, 'buildings', def.spriteFrame)
        .setOrigin(0.5, 0)
        .setScale(scale)
        .setDepth(PANEL_DEPTH + 2);

      const lbl = this.scene.add
        .text(bx + BUTTON_W / 2, byY + BUTTON_H - 14, def.label, {
          fontSize:   '9px',
          fontFamily: 'monospace',
          color:      '#aabbff',
        })
        .setOrigin(0.5, 0)
        .setDepth(PANEL_DEPTH + 2);

      bg.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        ptr.event.stopPropagation();
        this.onSelect(def.key);
      });
      bg.on('pointerover', (ptr: Phaser.Input.Pointer) => {
        bg.setFillStyle(0x4466cc);
        this.showTooltip(def, ptr.x, ptr.y);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x333355);
        this.tooltip.setVisible(false);
      });

      this.buttons.push({ bg, sprite, label: lbl, def });
    }
  }

  private selectTab(tab: BuildMenuTab): void {
    this.tabButtons.get(this.activeTab)?.setFillStyle(0x223355);
    this.activeTab = tab;
    this.tabButtons.get(tab)?.setFillStyle(0x3355aa);
    this.buildButtons();
  }

  private showTooltip(def: BuildingDef, px: number, py: number): void {
    const costStr   = costLabel(def.cost);
    const effectStr = effectLabel(def);
    const lines     = [def.label, costStr ? `Cost: ${costStr}` : '', effectStr].filter(Boolean);

    this.tooltipText.setText(lines.join('\n'));

    const th = this.tooltipText.height + 8;
    this.tooltipBg.setSize(170, th);

    const W  = this.scene.scale.width;
    const cx = Math.min(px, W - 176);
    const cy = Math.max(py - 6, th + 4);
    this.tooltip.setPosition(cx, cy);
    this.tooltip.setVisible(true);
  }
}
