import type { Scene } from 'phaser';

/** 1 real second = 1 game-minute. Change this multiplier to speed up / slow down time. */
export const GAME_MINUTE_MS = 1000;

export class TimeSystem {
  private readonly scene: Scene;
  private accumulator = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  update(delta: number): void {
    this.accumulator += delta;
    while (this.accumulator >= GAME_MINUTE_MS) {
      this.accumulator -= GAME_MINUTE_MS;
      this.scene.events.emit('time:tick');
    }
  }
}
