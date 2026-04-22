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
