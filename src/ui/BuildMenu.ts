import { Scene, GameObjects } from 'phaser';
import type { BuildingDef, BuildMenuTab, ResourceType, ResourceMap } from '../types';
import type { Resources } from '../systems/EconomySystem';
import { buildingCatalog } from '../data/buildingCatalog';
import { UI_BOTTOM_BAR_H } from '../config';

const ALL_TABS: BuildMenuTab[] = [
  'Housing', 'Production', 'Resource', 'Decoration',
  'Marketplace', 'Waterfront', 'Defense', 'Magic', 'Expansion',
];
const TAB_H       = 24;
const BUTTON_W    = 72;
const BUTTON_H    = 72;
const BUTTON_PAD  = 6;
const PANEL_DEPTH = 190;

function costLabel(cost: ResourceMap): string {
  return Object.entries(cost)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${k} ${v}`)
    .join('  ');
}

function effectLabel(def: BuildingDef): string {
  const lines: string[] = [];
  const prod = Object.entries(def.produces).filter(([, v]) => (v ?? 0) > 0);
  const cons = Object.entries(def.consumes).filter(([, v]) => (v ?? 0) > 0);
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
  private readonly scene:      Scene;
  private readonly onSelect:   (key: string) => void;
  private isUnlocked:          (key: string) => boolean;
  private activeTab:           BuildMenuTab = 'Housing';
  private lastResources:       Resources | null = null;

  private tabContainer!: GameObjects.Container;
  private tabButtons:    Map<BuildMenuTab, GameObjects.Rectangle> = new Map();
  private tabLabels:     Map<BuildMenuTab, GameObjects.Text>      = new Map();
  private buttons:       ButtonState[] = [];

  private tooltip!:     GameObjects.Container;
  private tooltipBg!:   GameObjects.Rectangle;
  private tooltipText!: GameObjects.Text;

  constructor(
    scene:      Scene,
    onSelect:   (key: string) => void,
    isUnlocked: (key: string) => boolean,
  ) {
    this.scene      = scene;
    this.onSelect   = onSelect;
    this.isUnlocked = isUnlocked;
    this.build();
  }

  onResourceUpdate(resources: Resources): void {
    this.lastResources = resources;
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

  /** Called when an unlock is gained — rebuilds tabs and buttons. */
  onUnlockChanged(isUnlocked: (key: string) => boolean): void {
    this.isUnlocked = isUnlocked;
    this.rebuildTabs();
    this.buildButtons();
    if (this.lastResources) this.onResourceUpdate(this.lastResources);
  }

  // ─── private ─────────────────────────────────────────────────────────────

  private canAfford(cost: ResourceMap, resources: Resources): boolean {
    for (const [k, v] of Object.entries(cost) as [ResourceType, number][]) {
      if ((resources[k] ?? 0) < v) return false;
    }
    return true;
  }

  /** Returns catalog entries visible on the current tab (unlocked only). */
  private visibleDefs(): BuildingDef[] {
    return buildingCatalog.filter(b => {
      if (b.tab !== this.activeTab) return false;
      const uk = b.unlockKey ?? 'tier1_starter';
      return this.isUnlocked(uk);
    });
  }

  /** Returns tabs that have at least one unlocked building. */
  private activeTabs(): BuildMenuTab[] {
    return ALL_TABS.filter(tab =>
      buildingCatalog.some(b => {
        if (b.tab !== tab) return false;
        return this.isUnlocked(b.unlockKey ?? 'tier1_starter');
      })
    );
  }

  private build(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const panelY = H - UI_BOTTOM_BAR_H;

    this.scene.add
      .rectangle(0, panelY, W, UI_BOTTOM_BAR_H, 0x111122, 0.85)
      .setOrigin(0, 0)
      .setDepth(PANEL_DEPTH);

    this.tabContainer = this.scene.add.container(0, 0).setDepth(PANEL_DEPTH + 1);

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

    this.rebuildTabs();
    this.buildButtons();
  }

  private rebuildTabs(): void {
    // Destroy old tab objects
    this.tabContainer.removeAll(true);
    this.tabButtons.clear();
    this.tabLabels.clear();

    const W        = this.scene.scale.width;
    const H        = this.scene.scale.height;
    const panelY   = H - UI_BOTTOM_BAR_H;
    const tabs     = this.activeTabs();
    const tabW     = Math.min(96, (W - 16) / Math.max(1, tabs.length));

    // Ensure activeTab is valid
    if (!tabs.includes(this.activeTab)) {
      this.activeTab = tabs[0] ?? 'Housing';
    }

    for (let i = 0; i < tabs.length; i++) {
      const tab      = tabs[i];
      const tx       = 8 + i * (tabW + 4);
      const ty       = panelY + 4;
      const isActive = tab === this.activeTab;

      const tabBg = this.scene.add
        .rectangle(tx, ty, tabW, TAB_H, isActive ? 0x3355aa : 0x223355, 1)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });

      const tabLbl = this.scene.add
        .text(tx + tabW / 2, ty + TAB_H / 2, tab, {
          fontSize:   '9px',
          fontFamily: 'monospace',
          color:      '#ccddff',
        })
        .setOrigin(0.5, 0.5);

      tabBg.on('pointerdown', () => this.selectTab(tab));
      tabBg.on('pointerover',  () => { if (tab !== this.activeTab) tabBg.setFillStyle(0x2a4488); });
      tabBg.on('pointerout',   () => { if (tab !== this.activeTab) tabBg.setFillStyle(0x223355); });

      this.tabContainer.add([tabBg, tabLbl]);
      this.tabButtons.set(tab, tabBg);
      this.tabLabels.set(tab, tabLbl);
    }
  }

  private buildButtons(): void {
    for (const btn of this.buttons) {
      btn.bg.destroy();
      btn.sprite.destroy();
      btn.label.destroy();
    }
    this.buttons = [];

    const H    = this.scene.scale.height;
    const W    = this.scene.scale.width;
    const byY  = H - UI_BOTTOM_BAR_H + TAB_H + 10;
    const defs = this.visibleDefs();

    // Expansion tab: show a hint instead of building buttons
    if (this.activeTab === 'Expansion') {
      const hint = this.scene.add.text(
        8, byY,
        'Click a fogged region to reveal it (50 Gold)',
        { fontSize: '11px', fontFamily: 'monospace', color: '#aabbdd' },
      ).setDepth(PANEL_DEPTH + 2);
      // Store hint as a pseudo-button so it gets cleaned up on next rebuild
      this.buttons.push({
        bg:     this.scene.add.rectangle(0, 0, 0, 0, 0x000000, 0).setVisible(false),
        sprite: this.scene.add.image(0, 0, 'icons', 'res_0').setVisible(false),
        label:  hint,
        def:    buildingCatalog[0],
      });
      return;
    }

    const atlas = 'buildings';
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const bx  = 8 + i * (BUTTON_W + BUTTON_PAD);
      if (bx + BUTTON_W > W - 8) break;

      const spriteAtlas = ['Fountain', 'Benches', 'Flowers', 'Boat', 'Minecrats'].includes(def.spriteFrame)
        ? 'decor' : atlas;

      const bg = this.scene.add
        .rectangle(bx, byY, BUTTON_W, BUTTON_H, 0x333355, 1)
        .setOrigin(0, 0)
        .setDepth(PANEL_DEPTH + 1)
        .setInteractive({ useHandCursor: true });

      const iconArea = BUTTON_W - 8;
      let frame: { realWidth: number; realHeight: number };
      try {
        frame = this.scene.textures.getFrame(spriteAtlas, def.spriteFrame);
      } catch {
        frame = { realWidth: 32, realHeight: 32 };
      }
      const scale = Math.min(iconArea / (frame.realWidth || 32), iconArea / (frame.realHeight || 32));

      const sprite = this.scene.add
        .image(bx + BUTTON_W / 2, byY + 4, spriteAtlas, def.spriteFrame)
        .setOrigin(0.5, 0)
        .setScale(scale)
        .setDepth(PANEL_DEPTH + 2);

      if (def.isMagic) sprite.setTint(0x9966ff);

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
    if (this.lastResources) this.onResourceUpdate(this.lastResources);
  }

  private showTooltip(def: BuildingDef, px: number, py: number): void {
    const costStr   = costLabel(def.cost);
    const effectStr = effectLabel(def);
    const waterNote = def.requiresWaterAdj ? 'Requires water adjacency' : '';
    const lines     = [def.label, costStr ? `Cost: ${costStr}` : '', effectStr, waterNote].filter(Boolean);

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
