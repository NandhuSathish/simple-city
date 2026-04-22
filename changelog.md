# changelog.md

All notable changes to the Cute Fantasy City Builder, by phase/session.

---

## [Phase 1 — Tilemap & camera] 2026-04-22 (revised)

Goal: Scrollable, zoomable 64×64 Tiled map with god's-eye camera controls. No player avatar — this is a pure city builder.

### Added
- **`src/systems/InputSystem.ts`** (rewritten) — God's-eye camera: WASD/arrow-key pan with momentum (exponential friction, `PAN_ACCEL=1200 px/s²`, `PAN_FRICTION=10/s`); mouse-wheel zoom 1×–4× around cursor position (zoom-to-cursor math: world point under cursor held fixed); middle-drag pan; camera bounded to map extents via `cam.setBounds()`.
- **`tools/build-tilesets.ts`** — Composes `terrain_base.png` from 5 tile source PNGs. Run: `npm run build:tilesets`.
- **`tools/gen-starter-map.ts`** — Generates `world.tmj` (64×64, 7 layers). Run: `npm run gen:map`.
- **`public/assets/maps/world.tmj`** — 64×64 starter map (ground, ground_detail, decoration_below, buildings_baked, decoration_above, collision, spawns).
- **`public/assets/tilesets/terrain_base.png`** — Composed tileset (gitignored, rebuild with `npm run build:tilesets`).

### Changed
- **`src/scenes/PreloadScene.ts`** — Loads tilemap + tileset only. Removed player spritesheet load and all animation registration.
- **`src/scenes/WorldScene.ts`** — Renders 5 Tiled layers, no player sprite. `InputSystem.init(mapWidth, mapHeight)` replaces old player-follow init. `InputSystem.update(delta)` replaces `update(player, delta)`.
- **`src/config.ts`** — Removed `PLAYER_FRAME_WIDTH` / `PLAYER_FRAME_HEIGHT` (no avatar).

### Removed
- **`public/assets/player.png`** — Deleted. `.gitignore` entry kept for Phase 5 NPC sprites.
- **Player spawn logic** in WorldScene — not applicable to city builder.
- **Player animation registration** in PreloadScene.

### Discovered
- See entries below in knowledge.md (camera section).

---

## [Phase 1 — Tilemap & movement] 2026-04-22

Goal: Scrollable 64×64 Tiled map with a WASD-controlled player, 4-direction idle/walk animations, GPU-accelerated tilemap layers.

### Added
- **`tools/build-tilesets.ts`** — Composes `public/assets/tilesets/terrain_base.png` (256×592) from Grass_Tiles_1, Cobble_Road_1, FarmLand_Tile, Pavement_Tiles, Wooden_Deck_Tiles. Run: `npm run build:tilesets`.
- **`tools/gen-starter-map.ts`** — Generates `public/assets/maps/world.tmj` (64×64 tiles, 7 layers). Run: `npm run gen:map`. See knowledge.md §Tiled for re-authoring in Tiled.
- **`public/assets/maps/world.tmj`** — 64×64 starter map with layers: `ground`, `ground_detail`, `decoration_below`, `buildings_baked`, `decoration_above`, `collision` (tile), `spawns` (object, player spawn at 32,32).
- **`public/assets/tilesets/terrain_base.png`** — Composed tileset (256×592, gitignored, rebuild with `npm run build:tilesets`).
- **`src/systems/InputSystem.ts`** — Camera zoom (wheel, clamped 1×–4×), middle-drag pan (disables `startFollow` during drag, re-enables on release), WASD player movement with diagonal normalisation and 4-direction facing.
- **`package.json`** — Added `build:tilesets` and `gen:map` npm scripts.
- **`jimp@1.6.1`** — Dev dependency for `build-tilesets.ts` PNG composition.

### Changed
- **`src/scenes/PreloadScene.ts`** — Replaced `grass` image load with `tilemapTiledJSON('world', ...)` + `image('terrain_base', ...)`. Added `registerPlayerAnims()`: registers `idle_{down,up,right,left}` and `walk_{down,up,right,left}` into the global AnimationManager (frame indices UNVERIFIED — confirm during playtesting).
- **`src/scenes/WorldScene.ts`** — Replaced 10×10 manual grid with Tiled map. Creates 5 GPU tilemap layers (`TilemapGPULayer`). Player spawns at tile (32, 32), plays `idle_down`, drives `InputSystem.update()` on every frame tick with smooth camera follow.
- **`src/config.ts`** — No changes needed; `TILE_SIZE` and `RENDER_SCALE` already correct.

### Fixed
- **`src/scenes/PreloadScene.ts`** — Replaced Player_Base_animations.png spritesheet with `Farmer_Bob.png` (NPC Premade). Corrected all animation frame indices: 6 frames per row (end = start+5), no blank frame flicker. Removed directional order ambiguity — layout confirmed from official reference image. Collapsed idle+walk arrays into a single `anims` array.
- **`public/assets/player.png`** — Replaced with `G:\Cute_Fantasy\NPCs (Premade)\Farmer_Bob.png` (384×832, fully-dressed premade character).
- **`tools/build-player.ts`** — Removed (paper-doll compositing approach abandoned in favour of premade NPC sheets).
- **`public/assets/`** — Removed all diagnostic PNG files created during animation investigation (`row*.png`, `f*_big.png`, `npc_*.png`).

### Discovered
- `createLayer(id, tileset, x, y, gpu)` — the `gpu` flag is a **positional** argument (5th), not an options object. Passing `{ gpu: true }` as the 3rd arg compiled to a type error; correct call is `createLayer('layer', ts, 0, 0, true)`.
- **TilemapGPULayer breaks sprite depth ordering.** Sprites placed between GPU layers become invisible (full-screen framebuffer pass overrides sprite rendering). Reverted all layers to standard `TilemapLayer` with explicit `.setDepth()` values. GPU layers deferred to Phase 6.
- Camera must be snapped to player position (`scrollX/scrollY`) before calling `startFollow` — otherwise the lerp starts from world (0,0) and the player is off-screen on the first frame.
- `GRASS_FILL_GID = 81` in gen-starter-map.ts is an educated guess. Confirm visually during playtesting and update if wrong.
- Player animation row order (rows 2/3 idle right/left, rows 6/7 walk right/left) is assumed but unverified.

### Verification
- `tsc --noEmit` → 0 errors
- `npm run build` → success, 1.36 MB bundle (352 kB gzip), 802ms

---

## [Phase 0 — Scaffold] 2026-04-22

Goal: `npm run dev` shows a static player sprite on a grass background.

### Added
- **`index.html`** — Clean shell with `<div id="app">` and dark `#000` body background; replaces Vite boilerplate.
- **`src/config.ts`** — Exports `TILE_SIZE=16`, `RENDER_SCALE=2`, `GAME_WIDTH=800`, `GAME_HEIGHT=600`, `PLAYER_FRAME_WIDTH=64`, `PLAYER_FRAME_HEIGHT=64`.
- **`src/types.ts`** — Shared `TileCoord` and `WorldCoord` interfaces.
- **`src/main.ts`** — `Phaser.Game` bootstrap: `type: AUTO`, `pixelArt: true`, `backgroundColor: '#1a1a2e'`, mounts to `#app`, registers `[BootScene, PreloadScene, WorldScene]`.
- **`src/scenes/BootScene.ts`** — Immediately transitions to `PreloadScene`.
- **`src/scenes/PreloadScene.ts`** — Loads `assets/grass_tile.png` (image) and `assets/player.png` (spritesheet, 64×64 frames); transitions to `WorldScene`.
- **`src/scenes/WorldScene.ts`** — Draws a 10×10 grid of grass tiles at native 16×16; places `player` sprite at frame 0 at grid center; sets camera zoom to `RENDER_SCALE` and centers on grid.
- **`public/assets/grass_tile.png`** — Copied from `G:\Cute_Fantasy\Tiles\Grass\Grass_1_Middle.png` (16×16).
- **`public/assets/player.png`** — Copied from `G:\Cute_Fantasy\Player\Player_Base\Player_Base_animations.png` (576×3584, 64×64 frames).
- **`README.md`** — Project blurb, asset note, dev commands (`npm run dev`, `npm run build`, `npm run preview`).
- **`.gitignore`** — Extended with `public/assets/grass_tile.png`, `public/assets/player.png`, and atlas/tileset patterns per licence hygiene rules.
- **Directory skeleton** — `src/scenes/`, `src/systems/`, `src/entities/`, `src/data/`, `src/ui/`, `src/utils/`, `public/assets/atlases/`, `public/assets/tilesets/`, `public/assets/maps/`, `public/assets/audio/`, `tests/`, `tools/`.
- **`CLAUDE.md`** — Project rules for all future Claude Code sessions.
- **`knowledge.md`** — Running log of discovered facts; seeded with Phase 0 findings.
- **`changelog.md`** — This file.

### Removed
- Vite boilerplate: `src/counter.ts`, `src/style.css`, `src/assets/` (typescript.svg, vite.svg, hero.png).

### Dependencies installed
- `phaser@4.0.0` (runtime)
- `vite` + `typescript` (dev, from Vite template)

### Verification
- `tsc --noEmit` → 0 errors
- `npm run build` → success, 1.35 MB bundle (351 kB gzip), 825ms
- `npm run dev` → Vite serves on http://localhost:5173; player on grass visible in browser
