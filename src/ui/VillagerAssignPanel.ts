import { Scene, GameObjects } from 'phaser';
import type { Villager } from '../entities/Villager';
import type { VillagerSystem } from '../systems/VillagerSystem';
import type { PlacedBuildingData } from '../types';

const PANEL_W    = 200;
const PANEL_H    = 220;
const PANEL_DEPTH = 210;
const PAD         = 8;
const ROW_H       = 22;

export class VillagerAssignPanel {
  private readonly scene:            Scene;
  private readonly villagerSystem:   VillagerSystem;
  private container!:                GameObjects.Container;
  private bg!:                       GameObjects.Rectangle;
  private titleText!:                GameObjects.Text;
  private rowTexts:                  GameObjects.Text[] = [];
  private currentBuilding:           PlacedBuildingData | null = null;

  constructor(scene: Scene, villagerSystem: VillagerSystem) {
    this.scene          = scene;
    this.villagerSystem = villagerSystem;
    this.build();
  }

  /** Show the panel for a workplace building that accepts workers. */
  show(buildingData: PlacedBuildingData): void {
    this.currentBuilding = buildingData;
    this.refresh();
    this.container.setVisible(true);
  }

  hide(): void {
    this.currentBuilding = null;
    this.container.setVisible(false);
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private build(): void {
    const x = this.scene.scale.width - PANEL_W - 4;
    const y = 40 + 10; // sits near the info panel area

    this.bg = this.scene.add
      .rectangle(0, 0, PANEL_W, PANEL_H, 0x1a1a3a, 0.95)
      .setOrigin(0, 0);

    this.titleText = this.scene.add
      .text(PAD, PAD, 'Assign Villager', {
        fontSize:   '11px',
        fontFamily: 'monospace',
        color:      '#ffdd88',
      })
      .setOrigin(0, 0);

    // Pre-create row slots
    for (let i = 0; i < 7; i++) {
      const t = this.scene.add
        .text(PAD, PAD + 20 + i * ROW_H, '', {
          fontSize:   '10px',
          fontFamily: 'monospace',
          color:      '#aaccff',
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      this.rowTexts.push(t);
    }

    this.container = this.scene.add
      .container(x, y, [this.bg, this.titleText, ...this.rowTexts])
      .setDepth(PANEL_DEPTH)
      .setVisible(false);
  }

  private refresh(): void {
    const building = this.currentBuilding;
    if (!building) return;

    const maxSlots   = building.def.workerSlots ?? 1;
    const unassigned = this.villagerSystem.getUnassignedVillagers();

    this.titleText.setText(
      `${building.def.label}\nAssign worker (${maxSlots} slot${maxSlots > 1 ? 's' : ''})`,
    );

    for (let i = 0; i < this.rowTexts.length; i++) {
      const t = this.rowTexts[i];
      const v: Villager | undefined = unassigned[i];

      if (v) {
        t.setText(`> Villager #${v.id} [${v.currentState}]`);
        t.setColor('#aaddff');

        // Remove old listeners, add fresh one
        t.removeAllListeners('pointerdown');
        const captured = v;
        t.on('pointerdown', () => {
          if (!this.currentBuilding) return;
          this.villagerSystem.assignVillager(captured.id, this.currentBuilding);
          this.hide();
        });
      } else {
        t.setText('');
        t.removeAllListeners('pointerdown');
      }
    }
  }
}
