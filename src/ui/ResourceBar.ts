import { Scene, GameObjects } from 'phaser';
import type { Resources } from '../systems/EconomySystem';
import type { ResourceType } from '../types';
import { UI_TOP_BAR_H } from '../config';

const ICON_FRAMES: Partial<Record<ResourceType, string>> = {
  Wood:  'res_0',
  Stone: 'res_1',
  Food:  'food_0',
  Gold:  'res_5',
  Mana:  'other_0',
};

const ENTRY_W    = 90;
const ICON_SCALE = 2;

export class ResourceBar {
  private counters:   Map<ResourceType, GameObjects.Text> = new Map();
  private manaEntry:  GameObjects.Container | null = null;
  private manaText:   GameObjects.Text | null = null;

  constructor(scene: Scene) {
    const W = scene.scale.width;

    scene.add
      .rectangle(0, 0, W, UI_TOP_BAR_H, 0x000000, 0.65)
      .setOrigin(0, 0)
      .setDepth(190);

    // Show Wood, Stone, Food, Gold always; Mana only when Mana > 0
    const baseResources: ResourceType[] = ['Wood', 'Stone', 'Food', 'Gold'];
    const totalW  = baseResources.length * ENTRY_W;
    const startX  = (W - totalW) / 2 + 16;

    for (let i = 0; i < baseResources.length; i++) {
      const type  = baseResources[i];
      const baseX = startX + i * ENTRY_W;
      const midY  = UI_TOP_BAR_H / 2;
      const frame = ICON_FRAMES[type];

      if (frame) {
        scene.add
          .image(baseX, midY, 'icons', frame)
          .setOrigin(0.5, 0.5)
          .setScale(ICON_SCALE)
          .setDepth(191);
      }

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

    // Mana entry (hidden until Mana > 0)
    const manaX = startX + baseResources.length * ENTRY_W;
    const midY  = UI_TOP_BAR_H / 2;

    const manaIcon = scene.add
      .image(manaX, midY, 'icons', 'other_0')
      .setOrigin(0.5, 0.5)
      .setScale(ICON_SCALE)
      .setDepth(191)
      .setTint(0xaa66ff)
      .setVisible(false);

    const manaCounter = scene.add
      .text(manaX + 20, midY, '0', {
        fontSize:   '13px',
        fontFamily: 'monospace',
        color:      '#cc88ff',
      })
      .setOrigin(0, 0.5)
      .setDepth(191)
      .setVisible(false);

    this.manaEntry = scene.add.container(0, 0, [manaIcon, manaCounter]).setDepth(191).setVisible(false);
    this.manaText  = manaCounter;
    this.counters.set('Mana', manaCounter);
  }

  update(resources: Resources): void {
    for (const [type, text] of this.counters) {
      const val = resources[type] ?? 0;
      text.setText(Math.floor(val).toString());
    }

    // Show Mana entry when Mana > 0
    if (this.manaEntry && !this.manaEntry.visible && (resources.Mana ?? 0) > 0) {
      this.manaEntry.setVisible(true);
      this.manaText?.setVisible(true);
      // also show the icon which is first child
      this.manaEntry.list.forEach(obj => {
        (obj as GameObjects.GameObject & { setVisible: (v: boolean) => void }).setVisible(true);
      });
    }
  }
}
