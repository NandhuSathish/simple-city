import type { Scene, GameObjects } from 'phaser';
import type { ResourceNodeType } from '../types';
import { TILE_SIZE } from '../config';

/** Minutes of game time for a fully-depleted node to fully regrow. */
const REGROW_MINUTES_TREE = 5;
const REGROW_MINUTES_ORE  = 10;

export class ResourceNode {
  readonly type:    ResourceNodeType;
  readonly col:     number;
  readonly row:     number;
  volume:           number;
  readonly maxVolume = 100;
  private regrowTimer = 0;
  private readonly regrowDuration: number;
  private readonly sprite: GameObjects.Image;

  constructor(
    scene:   Scene,
    type:    ResourceNodeType,
    col:     number,
    row:     number,
    frame:   string,
    atlas:   string,
  ) {
    this.type  = type;
    this.col   = col;
    this.row   = row;
    this.volume = this.maxVolume;
    this.regrowDuration = type === 'tree' ? REGROW_MINUTES_TREE : REGROW_MINUTES_ORE;

    const worldX = (col + 0.5) * TILE_SIZE;
    const worldY = (row + 1)   * TILE_SIZE;
    this.sprite = scene.add
      .image(worldX, worldY, atlas, frame)
      .setOrigin(0.5, 1)
      .setDepth(5);
  }

  get isDepleted(): boolean {
    return this.volume <= 0;
  }

  /** Consume up to `amount` volume. Returns how much was actually taken. */
  deplete(amount: number): number {
    const taken  = Math.min(amount, this.volume);
    this.volume  = Math.max(0, this.volume - taken);
    this.updateVisual();
    return taken;
  }

  /** Called each game-minute tick. Handles regrowth. */
  tickRegrowth(): void {
    if (this.volume >= this.maxVolume) return;
    if (this.volume > 0) return; // only regrow from zero

    this.regrowTimer++;
    if (this.regrowTimer >= this.regrowDuration) {
      this.volume      = this.maxVolume;
      this.regrowTimer = 0;
      this.updateVisual();
    }
  }

  /** 0–1 fraction of max volume remaining. */
  get volumeRatio(): number {
    return this.volume / this.maxVolume;
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private updateVisual(): void {
    const r = this.volumeRatio;
    this.sprite.setAlpha(0.25 + r * 0.75);   // 0.25 when empty, 1.0 when full
    this.sprite.setScale(0.6 + r * 0.4);      // slightly smaller when depleted
  }
}
