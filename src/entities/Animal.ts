import { Scene, GameObjects, Math as PhaserMath } from 'phaser';
import { TILE_SIZE } from '../config';
import type { AnimalType } from '../types';

/** Walk speed in world-px per ms. */
const ANIMAL_SPEED = 12 / 1000; // half a tile per second

/** ms between random direction changes. */
const WANDER_INTERVAL_MS = 2000 + Math.random() * 2000;

/** Chicken animation frames: Chicken_01 … Chicken_18 (18 frames). */
function chickenFrames(frameCount: number): string[] {
  return Array.from({ length: frameCount }, (_, i) =>
    `Chicken_${String(i + 1).padStart(2, '0')}`,
  );
}

/** Generic animal sprite frame sequence. */
const ANIMAL_FRAMES: Record<AnimalType, string[]> = {
  chicken: chickenFrames(18),
  cow:     Array.from({ length: 9  }, (_, i) => `Cow_${String(i + 1).padStart(2, '0')}`),
  pig:     Array.from({ length: 16 }, (_, i) => `Pig_${String(i + 1).padStart(2, '0')}`),
};

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

  constructor(
    scene:    Scene,
    type:     AnimalType,
    buildingCol: number,
    buildingRow: number,
    buildingW:   number,
    buildingH:   number,
  ) {
    const RADIUS = 3; // wander 3 tiles beyond the building footprint
    this.minX = (buildingCol - RADIUS + 0.5)         * TILE_SIZE;
    this.maxX = (buildingCol + buildingW + RADIUS - 0.5) * TILE_SIZE;
    this.minY = (buildingRow - RADIUS + 1)            * TILE_SIZE;
    this.maxY = (buildingRow + buildingH + RADIUS - 1)   * TILE_SIZE;

    // Start at a random position inside the building footprint
    this.wx = PhaserMath.Between(
      (buildingCol + 0.5) * TILE_SIZE,
      (buildingCol + buildingW - 0.5) * TILE_SIZE,
    );
    this.wy = PhaserMath.Between(
      (buildingRow + 0.5) * TILE_SIZE,
      (buildingRow + buildingH - 0.5) * TILE_SIZE,
    );

    const frames = ANIMAL_FRAMES[type];
    // Animal PNGs are large (256×512 individual frames); scale to ~1 tile width in world space.
    // 16 world px / 256 px = 0.0625 scale → displayed at 32 screen px at RENDER_SCALE=2.
    this.sprite = scene.add
      .sprite(this.wx, this.wy, 'animals', frames[0])
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setScale(0.06);

    // Manual frame-cycling animation using Phaser's sprite anim system
    this.sprite.play({
      key:       `animal_${type}`,
      frameRate: 8,
      repeat:    -1,
    });

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
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private pickNewDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = ANIMAL_SPEED * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
}
