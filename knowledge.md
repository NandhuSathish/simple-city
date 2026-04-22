# knowledge.md — Discovered Facts & Decisions

Running log of non-obvious things learned during development. Update after every session.
Never delete entries — mark outdated ones with ~~strikethrough~~ and add a correction.

---

## Phaser 4

### Phaser global namespace is NOT available at runtime (2026-04-22)
- `phaser.d.ts` declares `declare namespace Phaser { ... }` as a global TypeScript namespace, so `Phaser.Input.Keyboard.KeyCodes.ONE` passes `tsc --noEmit` with zero errors.
- At **runtime** in Vite's ESM bundle, `Phaser` is never assigned to `window`. The ESM exports (`Input`, `Scene`, `Math`, …) are named exports only.
- **Rule:** never reference `Phaser.*` as a runtime value. Use named imports instead:
  ```ts
  import { Input, Math as PhaserMath } from 'phaser';
  Input.Keyboard.KeyCodes.ONE   // ✓ runtime value
  Phaser.Input.Keyboard.Key     // ✓ TYPE annotation only (stripped at compile time)
  Phaser.Input.Keyboard.KeyCodes.ONE  // ✗ ReferenceError at runtime
  ```
- `Phaser.*` is safe ONLY in TypeScript type positions (parameter types, return types, interface fields) — those are erased during compilation and never reach the browser.

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

### Dynamic minimum zoom to prevent showing background outside map (2026-04-22)
- Static `ZOOM_MIN = 1` lets the user zoom out far enough to see the dark `#1a1a2e` Phaser background outside the tilemap.
- Correct pattern: compute `minZoom` from live camera and map dimensions each wheel event:
  ```ts
  const minZoom = Math.max(c.width / this.mapWidth, c.height / this.mapHeight);
  ```
- `c.width` / `c.height` are the Phaser camera viewport dimensions in screen pixels (not affected by zoom). This formula ensures the world is always at least as large as the viewport.
- Also apply this to the *initial* zoom in `init()` so that on very wide/tall screens, RENDER_SCALE isn't too small: `cam.setZoom(Math.max(RENDER_SCALE, minZoom))`.
- `cam.setBounds()` still needed to prevent panning outside map edges — zoom clamp prevents seeing outside via zoom, bounds prevent seeing outside via pan.

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

---

## Atlas pipeline — free-tex-packer-core (2026-04-22)

### Bug: removeFileExtension:true clobbers paths without a dot-extension
- If the image `path` field has no file extension (e.g. `"House_1_Wood_Base_Blue"`), setting `removeFileExtension: true` produces an empty string `""` as the frame name — all frames collapse to `""`, and `JSON.parse` keeps only the last one.
- **Fix:** pass the full filename including `.png` extension in `path` (e.g. `path: basename(filePath)`), then let `removeFileExtension: true` strip it. This produces the correct frame name `"House_1_Wood_Base_Blue"`.
- Verified: 155 frames in atlas, `House_1_Wood_Base_Blue`, `Windmill`, and `Well` all present.

### Bug: detectIdentical:true deduplicates all kenmi-art sprites into one
- With `detectIdentical: true` and the full 155-sprite buildings set, the packer collapses everything to a single frame. Root cause unknown (the sprites are visually distinct).
- **Fix:** always use `detectIdentical: false` for this pack.

### Bug: packAsync method has broken path passthrough
- `free-tex-packer-core@0.3.5` exports `packAsync` as a named property, but it does not correctly pass the `path` field to the output frame names.
- The callback API (`packer(images, options, callback)`) works correctly.
- `tools/pack-atlases.js` uses the callback form wrapped manually.

### Bug: --experimental-strip-types breaks callback type annotations in .ts files
- Running `node --experimental-strip-types tools/pack-atlases.ts` with inline TypeScript type annotations on callback parameters (e.g. `(files: Array<{name: string; buffer: Buffer}>, err: Error | null) => void`) causes the callback to receive malformed data — all frame names become empty strings.
- The same code runs correctly when: (a) piped via stdin with `node --experimental-strip-types -`, (b) passed as a plain `.js` file.
- **Fix:** the actual atlas packer is `tools/pack-atlases.js` (plain ESM). The `.ts` file is kept for documentation / cross-referencing but `npm run pack:atlases` invokes the `.js` version.

### Building sprite dimensions (2026-04-22)
- `House_1_Wood_Base_Blue.png`: **96×128 px**, footprint 2×2 tiles (32×32 px).
- `Windmill.png`: **128×112 px**, footprint 2×3 tiles (32×48 px).
- `Well.png`: **32×48 px**, footprint 1×1 tile (16×16 px).
- All three sprites are taller than their tile footprint — typical kenmi-art style. Origin `(0.5, 1)` anchors the sprite bottom-center to the bottom edge of the footprint; the art extends upward naturally.

### Atlas frame naming convention (2026-04-22)
- Frame keys in `buildings.json` are bare filenames without the `.png` extension: `"House_1_Wood_Base_Blue"`, `"Windmill"`, `"Well"`, etc.
- `prependFolderName: false` is required to prevent folder paths (e.g. `Houses/Wood/`) from being prepended to frame names.
- The `spriteFrame` field in `BuildingDef` must match these exact keys.

---

## BuildSystem (2026-04-22)

### Ghost sprite anchor and placement (2026-04-22)
- Ghost and placed sprites use `setOrigin(0.5, 1)` (bottom-center).
- World position formula: `x = (col + fp.w/2) * TILE_SIZE`, `y = (row + fp.h) * TILE_SIZE` — places the bottom-center of the sprite at the bottom edge of the footprint.
- Cursor-to-footprint snap: `topLeftCol = cursorTile.col - Math.floor(fp.w/2)`, same for row — centers the footprint under the cursor tile.
- Ghost alpha: `0.65`. Depth: `50` (above terrain, below any future UI overlay). Placed buildings: depth `30`.

### Phaser 4 tinting for ghost validation (2026-04-22)
- `sprite.setTint(0x00ff00)` for valid placement, `sprite.setTint(0xff0000)` for invalid.
- Plain `setTint` is sufficient for green/red validation feedback. Phaser 4 filter system reserved for Phase 6 glow/bloom on magic buildings.
- `sprite.clearTint()` is NOT needed — the ghost is destroyed on cancel/place and recreated fresh each time `startPlacing()` is called.

### Pointer event listener notes (2026-04-22)
- `this.scene.input.on('pointermove', cb, this)` — passes `Phaser.Input.Pointer`, not a plain `{x,y}`. Use `pointer.x/y` for screen coords, then `cam.getWorldPoint(pointer.x, pointer.y)` to get world coords.
- Right-click fires `pointerdown` with `pointer.button === 2`. Phaser 4 does NOT suppress the browser context menu by default inside the canvas — for Phase 3, add `this.input.mouse?.disableContextMenu()` if context menus appear.
- `keyboard.on('keydown-ESC', cb, this)` — fires on every keydown, not just JustDown. Safe here because cancel is idempotent.
