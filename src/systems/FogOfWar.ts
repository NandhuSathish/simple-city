import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '../config';
import type { EconomySystem } from './EconomySystem';

const REGION_TILES = 10;
const REVEAL_COST  = 50;
const FOG_COLOR    = 0x111122;
const FOG_ALPHA    = 0.82;
const FOG_DEPTH    = 70; // above terrain, below day/night overlay

export class FogOfWar {
  private readonly scene:     Scene;
  private readonly economy:   EconomySystem;
  private readonly regionsX:  number;
  private readonly regionsY:  number;
  private revealed:           boolean[][];
  private panels:             (GameObjects.Rectangle | null)[][];

  constructor(scene: Scene, economy: EconomySystem, mapCols: number, mapRows: number) {
    this.scene   = scene;
    this.economy = economy;
    this.regionsX = Math.ceil(mapCols / REGION_TILES);
    this.regionsY = Math.ceil(mapRows / REGION_TILES);
    this.revealed = Array.from({ length: this.regionsY }, () =>
      new Array<boolean>(this.regionsX).fill(false));
    this.panels = Array.from({ length: this.regionsY }, () =>
      new Array<GameObjects.Rectangle | null>(this.regionsX).fill(null));

    // Reveal the 3×3 block centred on map centre by default (starter area)
    const cx = Math.floor(this.regionsX / 2);
    const cy = Math.floor(this.regionsY / 2);
    for (let ry = cy - 1; ry <= cy + 1; ry++) {
      for (let rx = cx - 1; rx <= cx + 1; rx++) {
        this.setRevealed(rx, ry, true);
      }
    }

    this.buildPanels();
  }

  isRevealed(rx: number, ry: number): boolean {
    if (rx < 0 || ry < 0 || rx >= this.regionsX || ry >= this.regionsY) return false;
    return this.revealed[ry][rx];
  }

  /** Try to reveal a region by paying Gold. Returns false if can't afford or already revealed. */
  tryRevealRegion(rx: number, ry: number): boolean {
    if (this.isRevealed(rx, ry)) return false;
    const cost = { Gold: REVEAL_COST };
    if (!this.economy.canAfford(cost)) return false;
    this.economy.deductCost(cost);
    this.revealRegion(rx, ry);
    return true;
  }

  /** Pixel coordinates for a region's top-left corner. */
  regionToWorld(rx: number, ry: number): { x: number; y: number } {
    return {
      x: rx * REGION_TILES * TILE_SIZE,
      y: ry * REGION_TILES * TILE_SIZE,
    };
  }

  getRevealedRegions(): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    for (let ry = 0; ry < this.regionsY; ry++) {
      for (let rx = 0; rx < this.regionsX; rx++) {
        if (this.revealed[ry][rx]) result.push([rx, ry]);
      }
    }
    return result;
  }

  restoreRevealed(pairs: Array<[number, number]>): void {
    // Reset to all fogged
    for (let ry = 0; ry < this.regionsY; ry++) {
      for (let rx = 0; rx < this.regionsX; rx++) {
        this.setRevealed(rx, ry, false);
      }
    }
    // Rebuild panels from scratch
    for (let ry = 0; ry < this.regionsY; ry++) {
      for (let rx = 0; rx < this.regionsX; rx++) {
        this.panels[ry][rx]?.destroy();
        this.panels[ry][rx] = null;
      }
    }
    for (const [rx, ry] of pairs) {
      this.setRevealed(rx, ry, true);
    }
    this.buildPanels();
  }

  destroy(): void {
    for (let ry = 0; ry < this.regionsY; ry++) {
      for (let rx = 0; rx < this.regionsX; rx++) {
        this.panels[ry][rx]?.destroy();
      }
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private setRevealed(rx: number, ry: number, v: boolean): void {
    if (rx < 0 || ry < 0 || rx >= this.regionsX || ry >= this.regionsY) return;
    this.revealed[ry][rx] = v;
  }

  private revealRegion(rx: number, ry: number): void {
    this.setRevealed(rx, ry, true);
    const panel = this.panels[ry][rx];
    if (panel) {
      this.scene.tweens.add({
        targets:  panel,
        alpha:    0,
        duration: 800,
        onComplete: () => { panel.destroy(); this.panels[ry][rx] = null; },
      });
    }
    this.scene.events.emit('fog:revealed', { rx, ry });
  }

  private buildPanels(): void {
    const w = REGION_TILES * TILE_SIZE;
    const h = REGION_TILES * TILE_SIZE;
    for (let ry = 0; ry < this.regionsY; ry++) {
      for (let rx = 0; rx < this.regionsX; rx++) {
        if (this.revealed[ry][rx]) continue;
        const wx = rx * w + w / 2;
        const wy = ry * h + h / 2;
        const panel = this.scene.add
          .rectangle(wx, wy, w, h, FOG_COLOR, 1)
          .setAlpha(FOG_ALPHA)
          .setDepth(FOG_DEPTH);
        this.panels[ry][rx] = panel;
      }
    }
  }
}
