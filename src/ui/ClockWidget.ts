import { Scene, GameObjects } from 'phaser';
import { GAME_WIDTH, UI_TOP_BAR_H } from '../config';
import { HOUR_DAWN, HOUR_DAY, HOUR_NIGHT } from '../systems/TimeSystem';

const W   = 144;
const H   = UI_TOP_BAR_H - 8;
const X   = GAME_WIDTH - W - 6;
const Y   = 4;
const DEP = 192;

export class ClockWidget {
  private readonly phaseIcon: GameObjects.Text;
  private readonly timeText:  GameObjects.Text;
  private readonly dayText:   GameObjects.Text;
  private readonly barFill:   GameObjects.Rectangle;

  constructor(scene: Scene) {
    scene.add
      .rectangle(X, Y, W, H, 0x0a1628, 0.88)
      .setOrigin(0, 0)
      .setDepth(DEP);

    this.phaseIcon = scene.add
      .text(X + 6, Y + 5, 'DAY', {
        fontSize:   '9px',
        fontFamily: 'monospace',
        color:      '#ffdd44',
      })
      .setDepth(DEP + 1);

    this.timeText = scene.add
      .text(X + 32, Y + 4, '06:00', {
        fontSize:   '13px',
        fontFamily: 'monospace',
        color:      '#ffffff',
      })
      .setDepth(DEP + 1);

    this.dayText = scene.add
      .text(X + 90, Y + 6, 'Day 1', {
        fontSize:   '10px',
        fontFamily: 'monospace',
        color:      '#99bb77',
      })
      .setDepth(DEP + 1);

    // Day-progress bar (thin strip at the bottom of the widget)
    const barY = Y + H - 5;
    scene.add
      .rectangle(X + 2, barY, W - 4, 3, 0x333355, 1)
      .setOrigin(0, 0)
      .setDepth(DEP + 1);

    this.barFill = scene.add
      .rectangle(X + 2, barY, 1, 3, 0xffdd44, 1)
      .setOrigin(0, 0)
      .setDepth(DEP + 2);

    this.refresh(6, 1);
  }

  update(hour: number, day: number): void {
    this.refresh(hour, day);
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private refresh(hour: number, day: number): void {
    const isNight = hour >= HOUR_NIGHT || hour < HOUR_DAWN;
    const isDawn  = hour >= HOUR_DAWN && hour < HOUR_DAY;

    if (isNight) {
      this.phaseIcon.setText('NGT').setColor('#6688ff');
    } else if (isDawn) {
      this.phaseIcon.setText('DWN').setColor('#ffaa44');
    } else {
      this.phaseIcon.setText('DAY').setColor('#ffdd44');
    }

    this.timeText.setText(`${String(hour).padStart(2, '0')}:00`);
    this.dayText.setText(`Day ${day}`);

    // Progress bar: fraction of day elapsed
    const progress = hour / 24;
    const maxW = W - 4;
    this.barFill.setSize(Math.max(2, Math.floor(maxW * progress)), 3);

    // Bar colour shifts at night
    this.barFill.setFillStyle(isNight ? 0x334499 : isDawn ? 0xff9933 : 0xffdd44);
  }
}
