import type { Scene } from 'phaser';
import { ResourceNode } from '../entities/ResourceNode';
import type { ResourceNodeType } from '../types';
import { getTerrainAt } from '../utils/grid';

// Seeded LCG for deterministic node placement
function makeLcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 0x7fffffff;
  };
}

const TREE_FRAMES = [
  'Small_Oak_Tree',
  'Small_Birch_Tree',
  'Small_Spruce_Tree',
  'Medium_Oak_Tree',
  'Medium_Birch_Tree',
  'Medium_Spruce_Tree',
];

const ORE_FRAME = 'Ores';

export class ResourceNodeSystem {
  private readonly scene:    Scene;
  private readonly nodes:    ResourceNode[] = [];
  private readonly mapCols:  number;
  private readonly mapRows:  number;

  constructor(scene: Scene, mapCols: number, mapRows: number) {
    this.scene   = scene;
    this.mapCols = mapCols;
    this.mapRows = mapRows;
    scene.events.on('time:tick', this.tick, this);
  }

  /** Deterministic node spawn — call after terrain grid is initialised. */
  spawnNodes(): void {
    const rng = makeLcg(98765);

    // ── trees on grass tiles ─────────────────────────────────────────────────
    // Skip farmland zone and outer 4-tile ring (reserved for ore).
    const farmRowStart = 44, farmRowEnd = 55;
    const farmColStart = 8,  farmColEnd = 55;
    const EDGE         = 6;

    let placed = 0;
    const targetTrees = 90;

    for (let attempt = 0; attempt < 5000 && placed < targetTrees; attempt++) {
      const col = EDGE + Math.floor(rng() * (this.mapCols - EDGE * 2));
      const row = EDGE + Math.floor(rng() * (this.mapRows - EDGE * 2));

      if (row >= farmRowStart && row <= farmRowEnd && col >= farmColStart && col <= farmColEnd) continue;
      if (getTerrainAt(col, row) !== 'grass') continue;
      if (this.nodeAt(col, row)) continue;

      const frame = TREE_FRAMES[Math.floor(rng() * TREE_FRAMES.length)];
      this.nodes.push(new ResourceNode(this.scene, 'tree', col, row, frame, 'trees'));
      placed++;
    }

    // ── ore deposits near map edges ──────────────────────────────────────────
    const ORE_BAND = 5;
    const targetOre = 22;
    placed = 0;

    for (let attempt = 0; attempt < 3000 && placed < targetOre; attempt++) {
      let col: number, row: number;
      const side = Math.floor(rng() * 4);
      if (side === 0) { col = Math.floor(rng() * ORE_BAND) + 1; row = 1 + Math.floor(rng() * (this.mapRows - 2)); }
      else if (side === 1) { col = this.mapCols - 1 - Math.floor(rng() * ORE_BAND); row = 1 + Math.floor(rng() * (this.mapRows - 2)); }
      else if (side === 2) { col = 1 + Math.floor(rng() * (this.mapCols - 2)); row = Math.floor(rng() * ORE_BAND) + 1; }
      else                 { col = 1 + Math.floor(rng() * (this.mapCols - 2)); row = this.mapRows - 1 - Math.floor(rng() * ORE_BAND); }

      if (this.nodeAt(col, row)) continue;

      this.nodes.push(new ResourceNode(this.scene, 'ore', col, row, ORE_FRAME, 'decor'));
      placed++;
    }
  }

  /** Returns 0–1 tree density within `radius` tiles of (col, row). */
  getTreeDensity(col: number, row: number, radius: number): number {
    return this.getDensity(col, row, radius, 'tree');
  }

  /** Returns 0–1 ore density within `radius` tiles of (col, row). */
  getOreDensity(col: number, row: number, radius: number): number {
    return this.getDensity(col, row, radius, 'ore');
  }

  /** Number of nodes of type in radius (for UI display). */
  countInRadius(col: number, row: number, radius: number, type: ResourceNodeType): number {
    return this.nodesInRadius(col, row, radius, type).length;
  }

  /**
   * Spread `amount` depletion across nodes of `type` within `radius`.
   * Distributes evenly; stops when all nodes depleted.
   */
  depleteInRadius(col: number, row: number, radius: number, amount: number, type: ResourceNodeType): void {
    const targets = this.nodesInRadius(col, row, radius, type).filter(n => !n.isDepleted);
    if (targets.length === 0 || amount <= 0) return;
    const share = amount / targets.length;
    for (const n of targets) {
      n.deplete(share);
    }
  }

  private getDensity(col: number, row: number, radius: number, type: ResourceNodeType): number {
    const targets = this.nodesInRadius(col, row, radius, type);
    if (targets.length === 0) return 0;
    const totalVolume = targets.reduce((sum, n) => sum + n.volume, 0);
    const maxPossible = targets.length * targets[0].maxVolume;
    return totalVolume / maxPossible;
  }

  private nodesInRadius(col: number, row: number, radius: number, type: ResourceNodeType): ResourceNode[] {
    return this.nodes.filter(n => {
      if (n.type !== type) return false;
      const dc = n.col - col;
      const dr = n.row - row;
      return dc * dc + dr * dr <= radius * radius;
    });
  }

  private nodeAt(col: number, row: number): boolean {
    return this.nodes.some(n => n.col === col && n.row === row);
  }

  private tick(): void {
    for (const n of this.nodes) n.tickRegrowth();
  }

  destroy(): void {
    this.scene.events.off('time:tick', this.tick, this);
    for (const n of this.nodes) n.destroy();
    this.nodes.length = 0;
  }
}
