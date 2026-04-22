import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE } from '../config';
import type { BuildingDef } from '../types';
import { buildingCatalog } from '../data/buildingCatalog';
import { worldToTile, isFree, occupy } from '../utils/grid';

const TINT_VALID   = 0x00ff00;
const TINT_INVALID = 0xff0000;
const GHOST_ALPHA  = 0.65;
const DEPTH_GHOST     = 50;
const DEPTH_BUILDINGS = 30;

let nextBuildingId = 1;

export class BuildSystem {
  private readonly scene: Scene;
  private ghost?: GameObjects.Image;
  private activeDef?: BuildingDef;
  private currentValid = false;
  private ghostCol = 0;
  private ghostRow = 0;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  init(): void {
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.keyboard!.on('keydown-ESC', this.cancel, this);
  }

  startPlacing(key: string): void {
    this.cancel();
    const def = buildingCatalog.find(b => b.key === key);
    if (!def) return;
    this.activeDef = def;
    this.ghost = this.scene.add
      .image(0, 0, 'buildings', def.spriteFrame)
      .setOrigin(0.5, 1)
      .setAlpha(GHOST_ALPHA)
      .setDepth(DEPTH_GHOST);
  }

  isActive(): boolean {
    return this.activeDef !== undefined;
  }

  cancel(): void {
    this.ghost?.destroy();
    this.ghost = undefined;
    this.activeDef = undefined;
  }

  private footprintOrigin(worldX: number, worldY: number): { col: number; row: number } {
    const def = this.activeDef!;
    const tile = worldToTile(worldX, worldY);
    return {
      col: tile.col - Math.floor(def.footprint.w / 2),
      row: tile.row - Math.floor(def.footprint.h / 2),
    };
  }

  private ghostWorldPos(col: number, row: number): { x: number; y: number } {
    const fp = this.activeDef!.footprint;
    return {
      x: (col + fp.w / 2) * TILE_SIZE,
      y: (row + fp.h) * TILE_SIZE,
    };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.ghost || !this.activeDef) return;
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const { col, row } = this.footprintOrigin(world.x, world.y);
    this.ghostCol = col;
    this.ghostRow = row;
    const pos = this.ghostWorldPos(col, row);
    this.ghost.setPosition(pos.x, pos.y);
    this.currentValid = isFree(col, row, this.activeDef.footprint.w, this.activeDef.footprint.h);
    this.ghost.setTint(this.currentValid ? TINT_VALID : TINT_INVALID);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.activeDef) return;
    if (pointer.button === 2) {
      this.cancel();
      return;
    }
    if (pointer.button !== 0 || !this.currentValid) return;

    const def = this.activeDef;
    const col = this.ghostCol;
    const row = this.ghostRow;
    const id  = nextBuildingId++;
    occupy(col, row, def.footprint.w, def.footprint.h, id);

    const pos = this.ghostWorldPos(col, row);
    this.scene.add
      .image(pos.x, pos.y, 'buildings', def.spriteFrame)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_BUILDINGS);

    this.scene.events.emit('building:placed', { key: def.key, col, row, id });
  }
}
