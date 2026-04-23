import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '../config';
import type { VillagerState, NpcKey } from '../types';
import type { GridPoint } from '../utils/pathfinding';
import { findPath } from '../utils/pathfinding';

/** World-units per millisecond villager movement speed. */
const WALK_SPEED = 32 / 1000; // 32 world px / second = 2 tiles/second

let _nextId = 1;

export class Villager {
  readonly id:        number;
  readonly npcKey:    NpcKey;
  homeCol:            number;
  homeRow:            number;
  workCol:            number | null = null;
  workRow:            number | null = null;
  workplaceId:        number | null = null;

  private state:       VillagerState = 'idle';
  private sprite:      GameObjects.Sprite;
  private path:        GridPoint[] = [];
  private pathIndex =  0;
  private wx:          number;  // current world x
  private wy:          number;  // current world y

  constructor(
    scene:    Scene,
    npcKey:   NpcKey,
    homeCol:  number,
    homeRow:  number,
  ) {
    this.id      = _nextId++;
    this.npcKey  = npcKey;
    this.homeCol = homeCol;
    this.homeRow = homeRow;

    this.wx = (homeCol + 0.5) * TILE_SIZE;
    this.wy = (homeRow + 1)   * TILE_SIZE;

    this.sprite = scene.add
      .sprite(this.wx, this.wy, 'npcs', `${npcKey}_0`)
      .setOrigin(0.5, 1)
      .setDepth(15);

    this.playAnim('idle_down');
  }

  get currentState(): VillagerState { return this.state; }

  getWorldPos(): { x: number; y: number } {
    return { x: this.wx, y: this.wy };
  }

  /** Called by VillagerSystem when a workplace is assigned. */
  assignWorkplace(buildingId: number, col: number, row: number): void {
    this.workplaceId = buildingId;
    this.workCol     = col;
    this.workRow     = row;
  }

  unassignWorkplace(): void {
    this.workplaceId = null;
    this.workCol     = null;
    this.workRow     = null;
    if (this.state === 'walkToWork' || this.state === 'work') {
      this.startWalkHome();
    }
  }

  startWalkToWork(): void {
    if (!this.workCol || !this.workRow) return;
    if (this.state === 'walkToWork' || this.state === 'work') return;
    const { col, row } = this.tilePos();
    this.path       = findPath(col, row, this.workCol, this.workRow);
    this.pathIndex  = 0;
    this.state      = 'walkToWork';
  }

  startWalkHome(): void {
    if (this.state === 'walkHome' || this.state === 'sleep') return;
    const { col, row } = this.tilePos();
    this.path       = findPath(col, row, this.homeCol, this.homeRow);
    this.pathIndex  = 0;
    this.state      = 'walkHome';
  }

  /** Called by VillagerSystem once per game-minute tick for work-state logic. */
  onTick(): void {
    // work output is handled by EconomySystem — nothing to do here
  }

  /** Called every frame. delta in milliseconds. */
  update(delta: number): void {
    if (this.state === 'walkToWork' || this.state === 'walkHome') {
      this.stepAlongPath(delta);
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private tilePos(): GridPoint {
    return {
      col: Math.floor(this.wx / TILE_SIZE),
      row: Math.floor(this.wy / TILE_SIZE),
    };
  }

  private stepAlongPath(delta: number): void {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      this.onPathComplete();
      return;
    }

    const target   = this.path[this.pathIndex];
    const targetX  = (target.col + 0.5) * TILE_SIZE;
    const targetY  = (target.row + 1)   * TILE_SIZE;
    const dx       = targetX - this.wx;
    const dy       = targetY - this.wy;
    const dist     = Math.sqrt(dx * dx + dy * dy);
    const step     = WALK_SPEED * delta;

    if (dist <= step) {
      this.wx = targetX;
      this.wy = targetY;
      this.pathIndex++;
    } else {
      this.wx += (dx / dist) * step;
      this.wy += (dy / dist) * step;
    }

    this.sprite.setPosition(this.wx, this.wy);
    this.updateWalkAnim(dx, dy);
  }

  private onPathComplete(): void {
    this.path      = [];
    this.pathIndex = 0;

    if (this.state === 'walkToWork') {
      this.state = 'work';
      this.playAnim('idle_down');
    } else if (this.state === 'walkHome') {
      this.state = 'sleep';
      this.playAnim('idle_down');
      this.sprite.setVisible(false);
    }
  }

  private updateWalkAnim(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.playAnim(dx > 0 ? 'walk_right' : 'walk_left');
    } else {
      this.playAnim(dy > 0 ? 'walk_down' : 'walk_up');
    }
  }

  /** Plays the named animation if not already playing. */
  private playAnim(name: string): void {
    const key = `${this.npcKey}_${name}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }

  /** Make sprite visible (waking up from sleep). */
  wake(): void {
    this.sprite.setVisible(true);
    this.state = 'idle';
    this.playAnim('idle_down');
  }
}
