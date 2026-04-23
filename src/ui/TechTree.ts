import { Scene, GameObjects } from 'phaser';
import { UNLOCK_DEFS, type UnlockDef } from '../systems/UnlockSystem';
import type { UnlockSystem } from '../systems/UnlockSystem';

const DEPTH      = 290;
const NODE_W     = 140;
const NODE_H     = 52;
const H_GAP      = 30;
const V_GAP      = 24;
const UNLOCKED_C = 0x2266aa;
const LOCKED_C   = 0x333355;
const EDGE_C     = 0x5577aa;

// Columns: 0 = Tier 1, 1 = Tier 2-3, 2 = Tier 4-6, 3 = Tier 7-9, 4 = Tier 10
const NODE_COLS: Record<string, number> = {
  tier1_starter:    0,
  tier2_farming:    1,
  tier3_residential: 1,
  tier4_marketplace: 2,
  tier5_waterfront:  2,
  tier6_quarry:      2,
  tier7_walls:       3,
  tier8_park:        3,
  tier9_magic:       3,
  tier10_expansion:  4,
};

export class TechTree {
  private readonly scene:   Scene;
  private readonly unlocks: UnlockSystem;
  private container:        GameObjects.Container;
  private visible =         false;

  constructor(scene: Scene, unlocks: UnlockSystem) {
    this.scene   = scene;
    this.unlocks = unlocks;
    this.container = scene.add.container(0, 0).setDepth(DEPTH).setVisible(false);
    this.buildLayout();
  }

  show(): void {
    this.container.removeAll(true);
    this.buildLayout();
    this.container.setVisible(true);
    this.visible = true;
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
  }

  get isVisible(): boolean { return this.visible; }

  // ─── private ──────────────────────────────────────────────────────────────

  private buildLayout(): void {
    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;

    // Full-screen dark overlay
    const overlay = this.scene.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.88);
    this.container.add(overlay);

    // Title
    const title = this.scene.add.text(sw / 2, 18, 'Tech Tree', {
      fontSize:   '20px',
      color:      '#aaccff',
      fontFamily: 'monospace',
      fontStyle:  'bold',
    }).setOrigin(0.5, 0);
    this.container.add(title);

    // Close button
    const closeBtn = this.scene.add.text(sw - 20, 16, '✕', {
      fontSize:   '18px',
      color:      '#ff6666',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Compute node positions
    const maxCols = 5;
    const colW    = (sw - 80) / maxCols;
    const colCounts: number[] = new Array(maxCols).fill(0);
    for (const def of UNLOCK_DEFS) colCounts[NODE_COLS[def.key] ?? 0]++;

    const nodePos: Map<string, { x: number; y: number }> = new Map();
    const colIdx:  number[] = new Array(maxCols).fill(0);

    const usableH = sh - 80;
    for (const def of UNLOCK_DEFS) {
      const col   = NODE_COLS[def.key] ?? 0;
      const count = colCounts[col];
      const totalH = count * (NODE_H + V_GAP) - V_GAP;
      const startY = (usableH - totalH) / 2 + 60;
      const idx    = colIdx[col]++;
      const x      = 40 + col * colW + colW / 2;
      const y      = startY + idx * (NODE_H + V_GAP);
      nodePos.set(def.key, { x, y });
    }

    // Draw edges first (behind nodes)
    const gfx = this.scene.add.graphics();
    gfx.lineStyle(1.5, EDGE_C, 0.7);
    for (const def of UNLOCK_DEFS) {
      const from = nodePos.get(def.key)!;
      for (const prereq of def.prereqs) {
        const to = nodePos.get(prereq);
        if (!to) continue;
        gfx.moveTo(to.x + NODE_W / 2, to.y);
        gfx.lineTo(from.x - NODE_W / 2, from.y);
        gfx.strokePath();
      }
    }
    this.container.add(gfx);

    // Draw nodes
    for (const def of UNLOCK_DEFS) {
      const pos       = nodePos.get(def.key)!;
      const unlocked  = this.unlocks.isUnlocked(def.key);
      this.addNode(def, pos.x, pos.y, unlocked);
    }
  }

  private addNode(def: UnlockDef, x: number, y: number, unlocked: boolean): void {
    const color = unlocked ? UNLOCKED_C : LOCKED_C;
    const alpha = unlocked ? 1 : 0.65;

    const bg = this.scene.add.rectangle(x, y, NODE_W - H_GAP, NODE_H, color, 1)
      .setStrokeStyle(1.5, unlocked ? 0x88bbff : 0x445577)
      .setAlpha(alpha);

    const labelText = this.scene.add.text(x, y - 10, def.label, {
      fontSize:   '11px',
      color:      unlocked ? '#ddeeff' : '#778899',
      fontFamily: 'monospace',
      fontStyle:  'bold',
      wordWrap:   { width: NODE_W - H_GAP - 8 },
    }).setOrigin(0.5, 0.5).setAlpha(alpha);

    const descText = this.scene.add.text(x, y + 12, def.description, {
      fontSize:   '9px',
      color:      unlocked ? '#aabbcc' : '#556677',
      fontFamily: 'monospace',
      wordWrap:   { width: NODE_W - H_GAP - 8 },
    }).setOrigin(0.5, 0).setAlpha(alpha);

    const badge = this.scene.add.text(x + (NODE_W - H_GAP) / 2 - 6, y - NODE_H / 2 + 4,
      unlocked ? '✓' : '🔒', {
      fontSize: '10px',
      color:    unlocked ? '#44ff88' : '#ff6644',
    }).setOrigin(1, 0);

    this.container.add([bg, labelText, descText, badge]);
  }
}
