import { Scene, Math as PhaserMath } from 'phaser';
import { RENDER_SCALE } from '../config';

const PAN_ACCEL  = 1200;  // world px / s²
const PAN_FRICTION = 10;  // exponential decay rate per second when no key held
const PAN_MAX    = 400;   // world px / s cap
const ZOOM_STEP  = 0.002; // zoom change per wheel delta unit
const ZOOM_MIN   = 1;
const ZOOM_MAX   = 4;

interface KeyLike { isDown: boolean }

export class InputSystem {
  private readonly scene: Scene;
  private velX = 0;
  private velY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private scrollAtDragX = 0;
  private scrollAtDragY = 0;
  private keys!: {
    up: KeyLike; down: KeyLike; left: KeyLike; right: KeyLike;
    w: KeyLike;  s: KeyLike;   a: KeyLike;    d: KeyLike;
  };

  constructor(scene: Scene) {
    this.scene = scene;
  }

  init(mapWidth: number, mapHeight: number): void {
    const cam = this.scene.cameras.main;
    cam.setZoom(RENDER_SCALE);
    cam.setBounds(0, 0, mapWidth, mapHeight);
    cam.centerOn(mapWidth / 2, mapHeight / 2);

    const kb = this.scene.input.keyboard!;
    this.keys = {
      up:    kb.addKey('UP'),
      down:  kb.addKey('DOWN'),
      left:  kb.addKey('LEFT'),
      right: kb.addKey('RIGHT'),
      w:     kb.addKey('W'),
      s:     kb.addKey('S'),
      a:     kb.addKey('A'),
      d:     kb.addKey('D'),
    };

    // Zoom around cursor position (not screen centre)
    this.scene.input.on(
      'wheel',
      (ptr: { x: number; y: number }, _gos: unknown, _dx: number, dy: number) => {
        const c = this.scene.cameras.main;
        const oldZoom = c.zoom;
        const newZoom = PhaserMath.Clamp(oldZoom - dy * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX);
        if (newZoom === oldZoom) return;

        // World-space position under the cursor must stay fixed after zoom
        const worldX = c.scrollX + ptr.x / oldZoom;
        const worldY = c.scrollY + ptr.y / oldZoom;
        c.zoom    = newZoom;
        c.scrollX = worldX - ptr.x / newZoom;
        c.scrollY = worldY - ptr.y / newZoom;
      },
    );

    // Middle-drag pan
    this.scene.input.on('pointerdown', (p: { button: number; x: number; y: number }) => {
      if (p.button !== 1) return;
      this.isDragging    = true;
      this.dragStartX    = p.x;
      this.dragStartY    = p.y;
      this.scrollAtDragX = cam.scrollX;
      this.scrollAtDragY = cam.scrollY;
    });

    this.scene.input.on('pointermove', (p: { x: number; y: number }) => {
      if (!this.isDragging) return;
      const c = this.scene.cameras.main;
      c.setScroll(
        this.scrollAtDragX - (p.x - this.dragStartX) / c.zoom,
        this.scrollAtDragY - (p.y - this.dragStartY) / c.zoom,
      );
    });

    this.scene.input.on('pointerup', (p: { button: number }) => {
      if (p.button === 1) this.isDragging = false;
    });
  }

  update(delta: number): void {
    const dt  = delta / 1000;
    const cam = this.scene.cameras.main;

    const goUp    = this.keys.up.isDown    || this.keys.w.isDown;
    const goDown  = this.keys.down.isDown  || this.keys.s.isDown;
    const goLeft  = this.keys.left.isDown  || this.keys.a.isDown;
    const goRight = this.keys.right.isDown || this.keys.d.isDown;

    if (goUp)    this.velY -= PAN_ACCEL * dt;
    if (goDown)  this.velY += PAN_ACCEL * dt;
    if (goLeft)  this.velX -= PAN_ACCEL * dt;
    if (goRight) this.velX += PAN_ACCEL * dt;

    // Frame-rate-independent exponential friction when no key pressed
    const damp = Math.exp(-PAN_FRICTION * dt);
    if (!goLeft && !goRight) this.velX *= damp;
    if (!goUp   && !goDown)  this.velY *= damp;

    this.velX = PhaserMath.Clamp(this.velX, -PAN_MAX, PAN_MAX);
    this.velY = PhaserMath.Clamp(this.velY, -PAN_MAX, PAN_MAX);

    if (Math.abs(this.velX) < 0.1) this.velX = 0;
    if (Math.abs(this.velY) < 0.1) this.velY = 0;

    if (this.velX !== 0 || this.velY !== 0) {
      cam.scrollX += this.velX * dt;
      cam.scrollY += this.velY * dt;
    }
  }
}
