import { Scene, GameObjects } from 'phaser';
import type { BuildingInfo } from '../types';

const PANEL_W     = 200;
const PANEL_DEPTH = 200;
const PAD         = 8;
const LINE_H      = 14;

function rateLabel(rate: BuildingInfo['productionRate']): string {
  const parts = Object.entries(rate)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${k} ${((v ?? 0)).toFixed(2)}/min`);
  return parts.length > 0 ? parts.join('\n') : 'None';
}

export class BuildingInfoPanel {
  private readonly scene:  Scene;
  private container!:      GameObjects.Container;
  private bg!:             GameObjects.Rectangle;
  private lines:           GameObjects.Text[] = [];
  private visible =        false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.build();
  }

  show(info: BuildingInfo): void {
    this.visible = true;
    this.refresh(info);
    this.container.setVisible(true);
  }

  hide(): void {
    this.visible = false;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.visible;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private build(): void {
    const W = this.scene.scale.width;
    const panelX = W - PANEL_W - 4;
    const panelY = 40;

    this.bg = this.scene.add
      .rectangle(0, 0, PANEL_W, 10, 0x111122, 0.92)
      .setOrigin(0, 0);

    const maxLines = 8;
    for (let i = 0; i < maxLines; i++) {
      this.lines.push(
        this.scene.add
          .text(PAD, PAD + i * LINE_H, '', {
            fontSize:   '10px',
            fontFamily: 'monospace',
            color:      '#ccddff',
            wordWrap:   { width: PANEL_W - PAD * 2 },
          })
          .setOrigin(0, 0),
      );
    }

    this.container = this.scene.add
      .container(panelX, panelY, [this.bg, ...this.lines])
      .setDepth(PANEL_DEPTH)
      .setVisible(false);
  }

  private refresh(info: BuildingInfo): void {
    const maxSlots = info.maxWorkerSlots;
    const filled   = info.workerSlots;
    const rateStr  = rateLabel(info.productionRate);

    const textRows = [
      info.def.label,
      `Workers: ${filled}/${maxSlots}`,
      '',
      'Production:',
      rateStr,
      '',
      info.resourceMessage,
    ];

    for (let i = 0; i < this.lines.length; i++) {
      this.lines[i].setText(textRows[i] ?? '');
    }

    // Resize background to fit content
    const usedLines = textRows.filter(Boolean).length;
    const panelH    = PAD * 2 + Math.max(usedLines, 4) * LINE_H + 4;
    this.bg.setSize(PANEL_W, panelH);
  }
}
