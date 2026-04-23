import { Scene, GameObjects } from 'phaser';
import { TILE_SIZE, UI_TOP_BAR_H, UI_BOTTOM_BAR_H } from '../config';
import type { BuildingDef, PlacedBuildingData } from '../types';
import { buildingCatalog } from '../data/buildingCatalog';
import { worldToTile, isFree, isTerrainAllowed, occupy, hasWaterAdjacent } from '../utils/grid';
import type { EconomySystem } from './EconomySystem';

const TINT_VALID      = 0x00ff00;
const TINT_INVALID    = 0xff0000;
const GHOST_ALPHA     = 0.65;
const DEPTH_GHOST     = 50;
const DEPTH_BUILDINGS = 30;

let nextBuildingId = 1;

interface PlacedEntry {
  data:   PlacedBuildingData;
  sprite: GameObjects.Image;
}

export class BuildSystem {
  private readonly scene:   Scene;
  private readonly economy: EconomySystem;
  private ghost?:           GameObjects.Image;
  private activeDef?:       BuildingDef;
  private currentValid =    false;
  private ghostCol =        0;
  private ghostRow =        0;
  private placed:           PlacedEntry[] = [];

  constructor(scene: Scene, economy: EconomySystem) {
    this.scene   = scene;
    this.economy = economy;
  }

  init(): void {
    this.scene.input.on('pointermove',           this.onPointerMove, this);
    this.scene.input.on('pointerdown',           this.onPointerDown, this);
    this.scene.input.keyboard!.on('keydown-ESC', this.cancel,        this);
    this.scene.events.on('build:start', (key: string) => this.startPlacing(key));
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
    this.ghost     = undefined;
    this.activeDef = undefined;
  }

  getPlaced(): readonly PlacedBuildingData[] {
    return this.placed.map(e => e.data);
  }

  /**
   * Restore a building from save data — bypasses cost deduction and building:placed event.
   * Marks occupancy, creates sprite, and registers with economy.
   */
  silentPlace(key: string, col: number, row: number): PlacedBuildingData | null {
    const def = buildingCatalog.find(b => b.key === key);
    if (!def) return null;
    const id = nextBuildingId++;
    occupy(col, row, def.footprint.w, def.footprint.h, id);
    this.economy.addBuilding(def, col, row);

    const pos = this.ghostWorldPos2(col, row, def);
    const sprite = this.scene.add
      .image(pos.x, pos.y, 'buildings', def.spriteFrame)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_BUILDINGS)
      .setInteractive({ useHandCursor: true });

    if (def.isMagic) sprite.setTint(0x9966ff);

    const data: PlacedBuildingData = { id, def, col, row };
    this.placed.push({ data, sprite });

    sprite.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button !== 0) return;
      if (this.activeDef) return;
      ptr.event.stopPropagation();
      this.scene.events.emit('building:selected', data);
    });

    return data;
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private footprintOrigin(worldX: number, worldY: number): { col: number; row: number } {
    const def  = this.activeDef!;
    const tile = worldToTile(worldX, worldY);
    return {
      col: tile.col - Math.floor(def.footprint.w / 2),
      row: tile.row - Math.floor(def.footprint.h / 2),
    };
  }

  private ghostWorldPos2(col: number, row: number, def: BuildingDef): { x: number; y: number } {
    return {
      x: (col + def.footprint.w / 2) * TILE_SIZE,
      y: (row + def.footprint.h)     * TILE_SIZE,
    };
  }

  private ghostWorldPos(col: number, row: number): { x: number; y: number } {
    return this.ghostWorldPos2(col, row, this.activeDef!);
  }

  private isOverUI(pointer: Phaser.Input.Pointer): boolean {
    const H = this.scene.scale.height;
    return pointer.y < UI_TOP_BAR_H || pointer.y > H - UI_BOTTOM_BAR_H;
  }

  private isValidPlacement(def: BuildingDef, col: number, row: number): boolean {
    const { w, h } = def.footprint;
    const footprintFree = isFree(col, row, w, h);
    const terrainOk     = isTerrainAllowed(col, row, w, h, def.terrainAllowed);
    const canAfford     = this.economy.canAfford(def.cost);
    const waterOk       = !def.requiresWaterAdj || hasWaterAdjacent(col, row, w, h);
    return footprintFree && terrainOk && canAfford && waterOk;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.ghost || !this.activeDef) return;
    if (this.isOverUI(pointer)) {
      this.ghost.setTint(TINT_INVALID);
      this.currentValid = false;
      return;
    }
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const { col, row } = this.footprintOrigin(world.x, world.y);
    this.ghostCol = col;
    this.ghostRow = row;
    const pos = this.ghostWorldPos(col, row);
    this.ghost.setPosition(pos.x, pos.y);

    this.currentValid = this.isValidPlacement(this.activeDef, col, row);
    this.ghost.setTint(this.currentValid ? TINT_VALID : TINT_INVALID);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.activeDef) {
      if (pointer.button === 0 && !this.isOverUI(pointer)) {
        this.checkBuildingClick(pointer);
      }
      return;
    }
    if (pointer.button === 2) { this.cancel(); return; }
    if (pointer.button !== 0 || !this.currentValid) return;
    if (this.isOverUI(pointer)) return;

    const def = this.activeDef;
    const col = this.ghostCol;
    const row = this.ghostRow;
    const id  = nextBuildingId++;

    this.economy.deductCost(def.cost);
    this.economy.addBuilding(def, col, row);
    occupy(col, row, def.footprint.w, def.footprint.h, id);

    const pos = this.ghostWorldPos(col, row);
    const sprite = this.scene.add
      .image(pos.x, pos.y, 'buildings', def.spriteFrame)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_BUILDINGS)
      .setInteractive({ useHandCursor: true });

    if (def.isMagic) sprite.setTint(0x9966ff);

    const data: PlacedBuildingData = { id, def, col, row };
    this.placed.push({ data, sprite });

    sprite.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (ptr.button !== 0) return;
      if (this.activeDef) return;
      ptr.event.stopPropagation();
      this.scene.events.emit('building:selected', data);
    });

    this.cancel();
    this.scene.events.emit('building:placed', data);
  }

  private checkBuildingClick(pointer: Phaser.Input.Pointer): void {
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile  = worldToTile(world.x, world.y);

    for (const entry of this.placed) {
      const { col, row, def } = entry.data;
      if (
        tile.col >= col && tile.col < col + def.footprint.w &&
        tile.row >= row && tile.row < row + def.footprint.h
      ) {
        this.scene.events.emit('building:selected', entry.data);
        return;
      }
    }
    this.scene.events.emit('building:deselected');
  }
}
