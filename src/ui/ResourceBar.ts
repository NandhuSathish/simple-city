import { Scene, GameObjects } from 'phaser';
import type { Resources } from '../systems/EconomySystem';
import type { ResourceType } from '../types';
import { UI_TOP_BAR_H } from '../config';

/** Icon frame names in the icons atlas. Verify positions visually during playtesting. */
const ICON_FRAMES: Record<ResourceType, string> = {
  Wood:  'res_0',
  Stone: 'res_1',
  Food:  'food_0',
  Gold:  'res_5',
};

const RESOURCES: ResourceType[] = ['Wood', 'Stone', 'Food', 'Gold'];
const ENTRY_W    = 100;
const ICON_SCALE = 2;   // 16×16 → 32×32 on screen

export class ResourceBar {
  private counters: Map<ResourceType, GameObjects.Text> = new Map();

  constructor(scene: Scene) {
    const W = scene.scale.width;

    // Background
    scene.add
      .rectangle(0, 0, W, UI_TOP_BAR_H, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setDepth(190);

    // Total width of 4 entries, centered
    const totalW = RESOURCES.length * ENTRY_W;
    const startX = (W - totalW) / 2 + 16;

    for (let i = 0; i < RESOURCES.length; i++) {
      const type  = RESOURCES[i];
      const baseX = startX + i * ENTRY_W;
      const midY  = UI_TOP_BAR_H / 2;

      // Icon
      scene.add
        .image(baseX, midY, 'icons', ICON_FRAMES[type])
        .setOrigin(0.5, 0.5)
        .setScale(ICON_SCALE)
        .setDepth(191);

      // Counter text
      const text = scene.add
        .text(baseX + 20, midY, '0', {
          fontSize:   '13px',
          fontFamily: 'monospace',
          color:      '#ffffff',
        })
        .setOrigin(0, 0.5)
        .setDepth(191);

      this.counters.set(type, text);
    }
  }

  update(resources: Resources): void {
    for (const [type, text] of this.counters) {
      text.setText(Math.floor(resources[type]).toString());
    }
  }
}
