# knowledge.md — Discovered Facts & Decisions

Running log of non-obvious things learned during development. Update after every session.
Never delete entries — mark outdated ones with ~~strikethrough~~ and add a correction.

---

## Phaser 4

### Module / Import style (2026-04-22)
- Phaser 4.0.0 ships a webpack-bundled ESM at `dist/phaser.esm.js`. Named imports work correctly:
  ```ts
  import { Game, Scene, AUTO } from 'phaser';
  ```
- The CJS entry (`src/phaser.js`) is used internally; always import from `'phaser'` and let Vite resolve the ESM build automatically.
- `skipLibCheck: true` is required in `tsconfig.json` because Phaser's type definitions reference internal webpack types.

### Game config (2026-04-22)
- `pixelArt: true` in the Phaser `Game` config disables texture smoothing globally — no per-texture workaround needed.
- `backgroundColor` accepts hex strings (`'#1a1a2e'`).
- `parent: 'app'` mounts the canvas inside `<div id="app">` — matches the index.html layout.
- `type: AUTO` lets Phaser pick WebGL or Canvas automatically.

### Camera zoom for pixel art (2026-04-22)
- Preferred pattern: place all sprites at their **native pixel size** in world space, then apply `this.cameras.main.setZoom(RENDER_SCALE)` in the scene.
- This is cleaner than `setDisplaySize` or `setScale` on every sprite.
- With RENDER_SCALE=2, the camera renders 400×300 world pixels onto an 800×600 canvas — effectively 2× zoom.

### Scene transitions (2026-04-22)
- `this.scene.start('NextScene')` stops the current scene and starts the target.
- Only `BootScene` and `PreloadScene` use `start()` to chain. `WorldScene` and `UIScene` will run in parallel (Phase 3+) using `this.scene.launch('UIScene')`.

---

## Asset Pack — Cute Fantasy (kenmi-art)

### Tile dimensions (2026-04-22)
- All tiles confirmed **16×16 px**. Verified via `System.Drawing.Image` on `Grass_1_Middle.png` → (16, 16).
- `TILE_SIZE = 16` is the authoritative constant.

### Player spritesheet (2026-04-22)
- File: `G:\Cute_Fantasy\Player\Player_Base\Player_Base_animations.png`
- Full sheet size: **576 × 3584 px**
- Frame size: **64 × 64 px** — confirmed by visual crop (3 frames visible in a 200px-wide crop = 200/3 ≈ 66px ≈ 64px).
- Layout: 9 columns × 56 rows = 504 total frames covering all animations (idle, walk, run, etc. in all directions).
- Frame 0 = idle, facing down (front-facing). Safe to use as a static placeholder.
- At `RENDER_SCALE=2`, the player renders as **128×128 screen pixels** (= 4 tiles × 4 tiles). Large but intentional — kenmi-art "cute" chibi style.

### Grass tiles available (2026-04-22)
- `Tiles/Grass/` contains: `Grass_1_Middle.png`, `Grass_2_Middle.png`, `Grass_3_Middle.png`, `Grass_4_Middle.png`, plus full `Grass_Tiles_1..4.png` tileset sheets.
- Phase 0 uses `Grass_1_Middle.png` only (plain 16×16).
- Phase 1 will switch to `Grass_Tiles_1.png` for terrain variety via Tiled.

---

## God's-eye camera (city builder)

### Input pattern (2026-04-22)
- **No player avatar.** PLAN.md §4.8 is explicit: this is a pure city builder (Banished / Anno lineage). The camera is the player. WASD = camera pan, not character movement.
- `cam.setBounds(0, 0, mapWidth, mapHeight)` clamps scroll to map extents automatically. Phaser applies the clamping each frame; manually setting `cam.scrollX` in the update loop is fine — the bounds take effect at render time.
- `cam.centerOn(x, y)` is the cleanest way to set the initial scroll position to the map centre.

### Zoom-to-cursor math (2026-04-22)
- Standard formula: save the world-space point under the cursor **before** changing zoom, then adjust scroll so the same world point sits under the cursor **after** the new zoom.
  ```ts
  const worldX = cam.scrollX + ptr.x / oldZoom;
  const worldY = cam.scrollY + ptr.y / oldZoom;
  cam.zoom    = newZoom;
  cam.scrollX = worldX - ptr.x / newZoom;
  cam.scrollY = worldY - ptr.y / newZoom;
  ```
- `ptr.x / oldZoom` converts the screen-space pointer offset into a world-space offset from `scrollX`.

### WASD momentum (2026-04-22)
- Velocity accumulates while key held (`PAN_ACCEL = 1200 world px/s²`), decays with frame-rate-independent exponential friction when key released (`Math.exp(-PAN_FRICTION * dt)`, `PAN_FRICTION = 10`).
- Cap at `PAN_MAX = 400 world px/s`. Kill sub-0.1 velocities to prevent endless micro-drift.
- Wheel event signature: `(pointer, gameObjects, deltaX, deltaY)` — use `pointer.x/y` for cursor position; ignore the rest.

## Tilemap (Phaser 4 + Tiled)

### createLayer GPU flag (2026-04-22)
- `Tilemap.createLayer(id, tileset, x?, y?, gpu?)` — the `gpu` flag is the **5th positional argument**, not an options object.
- With `gpu: true`, Phaser 4 returns a `TilemapGPULayer` instead of `TilemapLayer`. Single draw call per layer, no tile seams.
- `TilemapGPULayer` is WebGL-only and orthographic-only — fine for this project.
- Type definition in `phaser.d.ts` correctly reflects this signature.

### TilemapGPULayer breaks sprite depth ordering — DO NOT USE yet (2026-04-22)
- **Problem:** `TilemapGPULayer` renders via a full-screen framebuffer pass. Sprites placed between two GPU layers in the scene graph become invisible (the GPU layer pass appears to override sprite rendering).
- **Symptom:** Solid-colour map, no player sprite visible, no console errors.
- **Fix applied:** Reverted all layers to standard `TilemapLayer` with explicit `.setDepth()` values (`DEPTH_GROUND=0`, `DEPTH_PLAYER=10`, `DEPTH_ABOVE=20`).
- **Future:** Re-evaluate GPU layers in Phase 6 when map content and render order are stable. May need to render all sprites onto a `DynamicTexture` or use a scene-level depth sort.

### Tiled — programmatic map generation (2026-04-22)
- Tiled cannot be invoked headlessly from Node; map authored via `tools/gen-starter-map.ts` as a baseline.
- To re-author visually: install Tiled, open `public/assets/maps/world.tmj`, add each terrain PNG from `G:\Cute_Fantasy\Tiles\` as a separate tileset OR use the composed `public/assets/tilesets/terrain_base.png`.
- The composed tileset `terrain_base.png` (256×592) must be built first: `npm run build:tilesets`.
- GID layout: Grass GIDs 1–160, Cobble 161–240, FarmLand 241–368, Pavement 369–496, Wooden Deck 497–592.

### terrain_base.png GID layout (2026-04-22)
- `GRASS_FILL_GID = 81` is an educated guess for the plain-middle grass tile (col 0, row 5 of Grass_Tiles_1.png).
- Needs visual confirmation during playtesting: run `npm run dev`, observe the ground color, then inspect `terrain_base.png` to find the correct GID and update `GRASS_FILL_GID` in `tools/gen-starter-map.ts`.

## Player Animations

### ~~Frame layout guess (2026-04-22)~~ — REPLACED, see below

~~Player_Base_animations.png was used but produced a naked character (no clothing). Switched to NPCs (Premade).~~

### NPC Premade spritesheet layout — CONFIRMED via reference image (2026-04-22)
- Player sprite is now `Farmer_Bob.png` copied from `G:\Cute_Fantasy\NPCs (Premade)\`.
- Sheet: 384×832 px, **6 cols × 13 rows**, 64×64 frames — all 6 columns filled (no blank frames).
- Confirmed row order (from official kenmi-art reference image):
  - Row 0  (frames  0– 5): `idle_down`   — Standing, facing down
  - Row 1  (frames  6–11): `idle_left`   — Standing, facing left
  - Row 2  (frames 12–17): `idle_right`  — Standing, facing right
  - Row 3  (frames 18–23): `idle_up`     — Standing, facing up
  - Row 4  (frames 24–29): `walk_down`   — Running/moving, facing down
  - Row 5  (frames 30–35): `walk_left`   — Running/moving, facing left
  - Row 6  (frames 36–41): `walk_right`  — Running/moving, facing right
  - Row 7  (frames 42–47): `walk_up`     — Running/moving, facing up
  - Rows 8–12: attack/special actions (not used in Phase 1)
- Other NPCs from the same pack: Bartender_Bruno/Katy, Chef_Chloe (384×448, 7 rows), Lumberjack_Jack, Miner_Mike (384×640, 10 rows), Fisherman_Fin (576×832, different column count).
- All NPC sheets use identical row ordering for the first 8 rows (idle + run in 4 directions).

## Vite + TypeScript

### Template quirks (2026-04-22)
- `npm create vite@latest -- --template vanilla-ts` (v9.0.5) generates boilerplate files that must be deleted: `src/counter.ts`, `src/style.css`, `src/assets/`.
- No `vite.config.ts` is generated for vanilla-ts — Vite works with defaults. Do not create one unless a specific override is needed.
- `tsconfig.json` defaults include `"noUnusedLocals": true` and `"noUnusedParameters": true` — keep these on; they catch dead code early.

### Bundle size (2026-04-22)
- A production build of Phaser 4 + minimal game code = **~1.35 MB JS** (351 kB gzip). Vite will warn about chunks > 500 kB — this warning is expected and safe to ignore for a game project.
- Build time: ~825ms on this machine.

---

## Project Setup

### Confirmed directory layout (2026-04-22)
- Project root: `G:\Cute_Fantasy\cute-fantasy-city\`
- Assets source: `G:\Cute_Fantasy\` (outside the project, never committed)
- Phase 0 assets in `public/assets/`: `grass_tile.png`, `player.png` (copied manually, .gitignored)
- Future atlases will go in `public/assets/atlases/` (generated, also .gitignored)
