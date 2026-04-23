import { Scene, GameObjects } from 'phaser';
import type { Villager } from '../entities/Villager';
import type { VillagerSystem } from '../systems/VillagerSystem';
import type { PlacedBuildingData } from '../types';

const PANEL_W     = 200;
const PANEL_H     = 200;
const PANEL_DEPTH = 210;
const PANEL_X_OFF = 4;   // from right edge
const PANEL_Y     = 165; // sits below BuildingInfoPanel (~120px tall at y=40)
const PAD         = 8;
const ROW_H       = 22;

export class VillagerAssignPanel {
  private readonly scene:            Scene;
  private readonly villagerSystem:   VillagerSystem;
  private container!:                GameObjects.Container;
  private bg!:                       GameObjects.Rectangle;
  private titleText!:                GameObjects.Text;
  private emptyText!:                GameObjects.Text;
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
    const x = this.scene.scale.width - PANEL_W - PANEL_X_OFF;
    const y = PANEL_Y;

    this.bg = this.scene.add
      .rectangle(0, 0, PANEL_W, PANEL_H, 0x0d1b2a, 0.96)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x334466);

    this.titleText = this.scene.add
      .text(PAD, PAD, 'Assign Villager', {
        fontSize:   '11px',
        fontFamily: 'monospace',
        color:      '#ffdd88',
      })
      .setOrigin(0, 0);

    // Shown when there are no unassigned villagers
    this.emptyText = this.scene.add
      .text(PAD, PAD + 28, 'No idle villagers.\nPlace a Wood House first.', {
        fontSize:   '10px',
        fontFamily: 'monospace',
        color:      '#668899',
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    // Pre-create row slots
    for (let i = 0; i < 7; i++) {
      const t = this.scene.add
        .text(PAD, PAD + 24 + i * ROW_H, '', {
          fontSize:   '10px',
          fontFamily: 'monospace',
          color:      '#aaccff',
        })
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      this.rowTexts.push(t);
    }

    this.container = this.scene.add
      .container(x, y, [this.bg, this.titleText, this.emptyText, ...this.rowTexts])
      .setDepth(PANEL_DEPTH)
      .setVisible(false);
  }

  private refresh(): void {
    const building = this.currentBuilding;
    if (!building) return;

    const maxSlots   = building.def.workerSlots ?? 1;
    const unassigned = this.villagerSystem.getUnassignedVillagers();

    this.titleText.setText(
      `${building.def.label}  [${maxSlots} slot${maxSlots > 1 ? 's' : ''}]`,
    );

    const hasVillagers = unassigned.length > 0;
    this.emptyText.setVisible(!hasVillagers);

    for (let i = 0; i < this.rowTexts.length; i++) {
      const t = this.rowTexts[i];
      const v: Villager | undefined = unassigned[i];

      if (v) {
        t.setText(`> #${v.id}  ${v.npcKey}  [${v.currentState}]`);
        t.setColor('#aaddff');

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
