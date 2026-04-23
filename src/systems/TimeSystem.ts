import type { Scene } from 'phaser';

/** 1 real second = 1 game-minute. Change this multiplier to speed up / slow down time. */
export const GAME_MINUTE_MS = 1000;

/** Hours in a full game day. Each game-minute = one game-hour here (24 ticks = 1 day). */
export const HOURS_PER_DAY = 24;

/** Hour at which dawn is announced (villagers wake). */
export const HOUR_DAWN  = 5;
/** Hour at which the day phase starts (full brightness). */
export const HOUR_DAY   = 6;
/** Hour at which night begins (villagers go home). */
export const HOUR_NIGHT = 20;

export class TimeSystem {
  private readonly scene:  Scene;
  private accumulator =    0;
  private _gameHour =      6;    // start at dawn
  private _minuteOfDay =   0;    // 0-23 within the current day

  constructor(scene: Scene) {
    this.scene = scene;
  }

  get gameHour(): number { return this._gameHour; }

  /** 0-1 progress through the current day (useful for smooth day/night lerp). */
  get dayProgress(): number { return this._minuteOfDay / HOURS_PER_DAY; }

  update(delta: number): void {
    this.accumulator += delta;
    while (this.accumulator >= GAME_MINUTE_MS) {
      this.accumulator -= GAME_MINUTE_MS;
      this.tick();
    }
  }

  private tick(): void {
    this.scene.events.emit('time:tick');

    this._minuteOfDay = (this._minuteOfDay + 1) % HOURS_PER_DAY;
    this._gameHour    = this._minuteOfDay;

    if (this._gameHour === HOUR_DAWN) {
      this.scene.events.emit('time:dawn');
    } else if (this._gameHour === HOUR_DAY) {
      this.scene.events.emit('time:day');
    } else if (this._gameHour === HOUR_NIGHT) {
      this.scene.events.emit('time:night');
    }
  }
}
