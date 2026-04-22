# changelog.md

All notable changes to the Cute Fantasy City Builder, by phase/session.

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
