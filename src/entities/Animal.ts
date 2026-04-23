import { Scene, GameObjects, Math as PhaserMath } from 'phaser';
import { TILE_SIZE } from '../config';
import type { AnimalType } from '../types';
import spriteDefs from '../data/sprite-defs.json';

interface AnimDef { name: string; row: number; cols: number; flipForOpposite?: boolean; }
interface SheetDef {
  id: string; category: string; atlasGroup: string;
  frameWidth: number; frameHeight: number;
  animations: AnimDef[];
}

const ALL_SHEETS = (spriteDefs as { spritesheets: SheetDef[] }).spritesheets;

/** Walk speed in world-px per ms. */
const ANIMAL_SPEED = 16 / 1000;

/** ms between random direction changes. */
const WANDER_INTERVAL_MS = 2000 + Math.random() * 2000;

/** Pick a random sprite-sheet variant for this animal category. */
function pickVariant(category: string): SheetDef | null {
  const matches = ALL_SHEETS.filter(
    s => s.atlasGroup === 'animals' && s.category === category && s.animations.length > 0,
  );
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

/** Display scale so the animal appears ~1.5 tiles wide regardless of source frame size. */
function computeScale(sheet: SheetDef): number {
  return (TILE_SIZE * 1.5) / sheet.frameWidth;
}

export class Animal {
  private sprite:        GameObjects.Sprite;
  private wx:            number;
  private wy:            number;
  private vx =           0;
  private vy =           0;
  private wanderTimer =  0;
  private readonly minX: number;
  private readonly maxX: number;
  private readonly minY: number;
  private readonly maxY: number;

  // Sprite-def driven animation data (null = no valid config yet)
  private readonly sheet:       SheetDef | null;
  private readonly walkAnim:    AnimDef  | null;
  private readonly idleAnim:    AnimDef  | null;

  constructor(
    scene:        Scene,
    type:         AnimalType,
    buildingCol:  number,
    buildingRow:  number,
    buildingW:    number,
    buildingH:    number,
  ) {
    const RADIUS = 3;
    this.minX = (buildingCol - RADIUS + 0.5)              * TILE_SIZE;
    this.maxX = (buildingCol + buildingW + RADIUS - 0.5)  * TILE_SIZE;
    this.minY = (buildingRow - RADIUS + 1)                * TILE_SIZE;
    this.maxY = (buildingRow + buildingH + RADIUS - 1)    * TILE_SIZE;

    this.wx = PhaserMath.Between(
      (buildingCol + 0.5) * TILE_SIZE,
      (buildingCol + buildingW - 0.5) * TILE_SIZE,
    );
    this.wy = PhaserMath.Between(
      (buildingRow + 0.5) * TILE_SIZE,
      (buildingRow + buildingH - 0.5) * TILE_SIZE,
    );

    this.sheet     = pickVariant(type);
    this.walkAnim  = this.sheet?.animations.find(a => a.name === 'walk')  ?? null;
    this.idleAnim  = this.sheet?.animations.find(a => a.name === 'idle')  ?? null;

    if (this.sheet) {
      const scale  = computeScale(this.sheet);
      const first  = this.idleAnim ?? this.walkAnim ?? this.sheet.animations[0];
      const frame  = first ? `${this.sheet.id}_${first.name}_0` : undefined;

      this.sprite = scene.add
        .sprite(this.wx, this.wy, 'animals', frame)
        .setOrigin(0.5, 1)
        .setDepth(12)
        .setScale(scale);

      if (first) {
        this.sprite.play(`${this.sheet.id}_${first.name}`, true);
      }
    } else {
      // No config yet — render an invisible placeholder so the entity exists
      this.sprite = scene.add
        .sprite(this.wx, this.wy, 'animals')
        .setVisible(false);
    }

    this.pickNewDirection();
  }

  update(delta: number): void {
    this.wanderTimer += delta;
    if (this.wanderTimer >= WANDER_INTERVAL_MS) {
      this.wanderTimer = 0;
      this.pickNewDirection();
    }

    this.wx = PhaserMath.Clamp(this.wx + this.vx * delta, this.minX, this.maxX);
    this.wy = PhaserMath.Clamp(this.wy + this.vy * delta, this.minY, this.maxY);
    this.sprite.setPosition(this.wx, this.wy);

    if (this.wx <= this.minX || this.wx >= this.maxX) this.vx = -this.vx;
    if (this.wy <= this.minY || this.wy >= this.maxY) this.vy = -this.vy;

    this.updateAnim();
  }

  destroy(): void {
    this.sprite.destroy();
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private pickNewDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = ANIMAL_SPEED * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  private updateAnim(): void {
    if (!this.sheet) return;
    const moving = Math.abs(this.vx) + Math.abs(this.vy) > 0.001;
    const anim   = moving ? (this.walkAnim ?? this.idleAnim) : (this.idleAnim ?? this.walkAnim);
    if (!anim) return;

    const key = `${this.sheet.id}_${anim.name}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }

    // Flip horizontally when moving left (only for animations with flipForOpposite)
    if (moving && anim.flipForOpposite) {
      this.sprite.setFlipX(this.vx < 0);
    }
  }
}
