# knowledge.md — Discovered Facts & Decisions

Running log of non-obvious things learned during development. Update after every session.
Never delete entries — mark outdated ones with ~~strikethrough~~ and add a correction.

---

## Phase 5 Bugfixes (2026-04-23)

### Phaser 4 Rectangle fillAlpha vs game-object alpha
- `this.add.rectangle(x, y, w, h, color, fillAlpha)` — the 6th argument is the **fill** alpha, separate from the game-object's `alpha` property.
- Tweening `alpha` on an object created with `fillAlpha=0` has zero visible effect: final visual = `fillAlpha × objectAlpha = 0 × anything = 0`.
- **Fix pattern for a fading overlay:** create with `fillAlpha=1`, set the game-object alpha to 0 via `setAlpha(0)`, then tween `alpha` between 0 (transparent) and the target opacity.

### BuildSystem — placement mode persists after place (bug, now fixed)
- After placing a building, `activeDef` was never cleared, so the placed building's sprite handler (`if (this.activeDef) return`) silently swallowed any immediate click on it.
- **Root cause of assign panel never appearing:** user places a building → still in placement mode → click on it ignored → `building:selected` never emitted.
- **Fix:** call `this.cancel()` immediately after a successful placement. One click = place once = return to select mode automatically.

### TimeSystem initial state mismatch (bug, now fixed)
- `_gameHour` was 6 but `_minuteOfDay` was 0. First tick set both to 1, resetting the clock to 1am.
- **Fix:** initialise `_minuteOfDay = 6` to match the starting `_gameHour`.

### Sprite-defs pipeline (2026-04-23)
- `src/data/sprite-defs.json` is the canonical config for all sprite sheets managed through the Sprite Configurator tool.
- `pack-atlases.js` reads it at build time; `Animal.ts` and `PreloadScene.ts` import it statically (Vite handles JSON imports natively — no `fetch` needed).
- Frame naming: `{id}_{animName}_{frameIndex}` (e.g. `chicken_01_walk_0`).
- `flipForOpposite: true` → only one direction of frames is packed; `sprite.setFlipX()` produces the mirrored direction at runtime. No second animation is registered.
- Source PNGs live in `public/assets/source/{atlasGroup}/` after upload via `npm run sprites`.

### Animal sprite sheets — correct structure confirmed (2026-04-23)
- **Previous assumption was wrong:** `Chicken_01.png` is NOT a single frame — it is a full spritesheet for one color variant.
- Each `Chicken_NN.png` = one color variant. Rows = animations; columns = frames per animation.
- Frame size confirmed: 32×32 px (256 px wide ÷ variable cols depending on animation row).
- The old `ANIMAL_FRAMES` array (which listed `Chicken_01`…`Chicken_18` as individual frames) was incorrect and has been removed.

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

## Economy & UI (Phase 3, 2026-04-22)

### EconomySystem event bus pattern
- WorldScene.events acts as the shared bus between WorldScene and UIScene.
- EconomySystem emits `economy:changed` on `scene.events` (WorldScene's events).
- BuildSystem listens to `build:start` on `scene.events`.
- UIScene subscribes to WorldScene's events via `this.scene.get('WorldScene').events.on(...)` from within UIScene.create().
- UIScene routes `build:start` back to WorldScene.events via the `onSelect` callback — no direct scene coupling beyond the scene.get() call.
- UIScene primes the HUD immediately by calling `world.getEconomySnapshot()` — no need to wait for the first `economy:changed` event.

### erasableSyntaxOnly: true — no parameter properties
- `tsconfig.json` has `erasableSyntaxOnly: true` (TypeScript 5.5+). This forbids constructor parameter properties (`constructor(private readonly x: T)`) because they generate non-erasable JavaScript code (constructor body assignments).
- **Fix:** Declare fields explicitly, then assign in the constructor body:
  ```ts
  private readonly scene: Scene;
  constructor(scene: Scene) { this.scene = scene; }
  ```

### Phaser text() style argument
- `scene.add.text(x, y, content, style)` — the `style` parameter is the **4th** argument.
- `Parameters<Scene['add']['text']>[2]` resolves to `string | string[]` (the text content), NOT the style.
- Do not create a TextStyle alias via `Parameters<Scene['add']['text']>[2]`. Just pass the style object inline — TypeScript infers the type from the method signature.

### UIScene camera and screen coordinates
- UIScene launched via `this.scene.launch('UIScene')` gets an independent camera with `zoom=1`, `scroll=(0,0)`.
- Coordinates in UIScene are screen pixels directly. `this.scale.width/height` = current viewport size.
- No `setScrollFactor(0)` needed — UIScene objects are already fixed to screen.

### icons atlas frame naming (2026-04-22)
- Icon sheets sliced into 16×16 px frames. Frame names: `{prefix}_{rowMajorIndex}`.
- Resources_Icons_Outline.png → `res_0`…`res_35` (6×6 grid)
- Food_Icons_Outline.png → `food_0`…`food_95` (8×12 grid)
- Other_Icons_Outline.png → `other_0`…`other_14` (5×3 grid)
- Other_Icons_2_Outline.png → `other2_0`…`other2_19` (4×5 grid)
- Tool_Icons_Outline.png → `tool_0`…`tool_9` (10×1 grid)
- **Exact icon-to-resource mapping UNVERIFIED** — confirm during playtesting and update ResourceBar.ts ICON_FRAMES if wrong. Current guesses: Wood=res_0, Stone=res_1, Food=food_0, Gold=res_5.

### BuildSystem UI zone guard (2026-04-22)
- Phaser does not automatically stop WorldScene pointer events when UIScene interactive objects handle them.
- BuildSystem.isOverUI() checks `pointer.y < UI_TOP_BAR_H || pointer.y > H - UI_BOTTOM_BAR_H` to block ghost placement and clicks within HUD bands.
- `UI_TOP_BAR_H = 36` and `UI_BOTTOM_BAR_H = 106` are exported from `src/config.ts`.

---

## Phase 4 — Resource Production (2026-04-22)

### Sprite frame names for new buildings
- Lumberjack Hut: `Shed_Base_Blue` (96×112 px, Buildings/Unique_Buildings/Shed/). Fits 2×2 footprint with the kenmi-art tall-sprite style.
- Quarry: `Silo` (48×80 px, single file at Buildings/Buildings/Unique_Buildings/Silo/Silo.png — no colour variant).
- Farm: `Barn_Base_Blue` (128×144 px). Barn used instead of GreenHouse because GreenHouse_Wood.png is 384×128 — likely a 3-panel horizontal composite not suitable as a single building sprite. Barn reads clearly as a farm building.

### GreenHouse_Wood.png is a 3-panel horizontal image (2026-04-22)
- Dimensions: 384×128 px. At TILE_SIZE=16 this would be 24 tiles wide in world space — clearly not a single-building sprite.
- The file appears to be three 128×128 section panels placed side-by-side (roof, middle, side wall).
- **Rule:** Do not use GreenHouse_*.png as a single placed-building sprite. Either composite sections or use a different building.

### Crops.png layout (2026-04-22)
- File: `G:\Cute_Fantasy\Crops\Crops.png`, 112×688 px.
- At 16×16 frames: 7 cols × 43 rows = 301 frames, packed as `crop_0`…`crop_300` in the crops atlas.
- Frame ordering: row-major. Row 0 is the first crop type at growth stage 0, row 1 is stage 1 for that type, etc. Exact crop-type-to-row mapping is unverified — inspect the atlas visually during playtesting.
- For farm growth stage cycling, use frames from column 0 of rows 0–3 (indices 0, 7, 14, 21) as a minimal 4-stage progression.

### Trees atlas frame names (2026-04-22)
- 12 tree PNGs packed (excluding Particle files): `Small_Oak_Tree`, `Small_Birch_Tree`, `Small_Spruce_Tree`, `Medium_Oak_Tree`, `Medium_Birch_Tree`, `Medium_Spruce_Tree`, `Big_Oak_Tree`, `Big_Birch_Tree`, `Big_Spruce_tree` (note: Spruce is lowercase "t"), `Small_Fruit_Tree`, `Medium_Fruit_Tree`, `Big_Fruit_Tree`.
- Big_Oak_Tree and Big_Spruce are 192×80 — likely 2-frame horizontal sheets. Packed as single frames; visual confirms needed during playtesting.
- All tree sprites use `setOrigin(0.5, 1)` (bottom-centre anchor) and depth 5 (above ground, below buildings).

### Decor atlas (2026-04-22)
- Only `Ores.png` (128×128) packed into decor atlas as frame name `Ores`.
- Ores.png may contain a 4-frame grid (64×64 per frame) of different ore types. Used as a static decoration for ore nodes.

### Terrain GID ranges (2026-04-22)
- Derived from terrain_base.png tileset composition:
  - GIDs 1–160: grass (Grass_Tiles_1)
  - GIDs 161–240: cobble road / path
  - GIDs 241–368: farmland (FarmLand_Tile)
  - GIDs 369–496: pavement / path
  - GIDs 497–592: wooden deck / path
  - GID 0 or negative: empty → treated as grass
- `initTerrainFromGids()` in grid.ts reads the ground layer from WorldScene after `map.getLayer('ground').data`.

### ResourceNodeSystem spawn parameters (2026-04-22)
- 90 tree nodes on grass tiles, seeded LCG (seed 98765), avoiding farmland zone (rows 44–55, cols 8–55) and outer 6-tile ring (reserved for ore).
- 22 ore deposits in a 5-tile band around all 4 map edges.
- Density computed as sum(node.volume) / (count × 100). Returns 0 if no nodes in radius.
- Depletion spread evenly across all non-depleted nodes in radius each tick.

### EconomySystem — resource-aware production (2026-04-22)
- `addBuilding(def, col, row)` stores position; tick uses it to query ResourceNodeSystem density.
- For `requiresTrees` buildings: `effective_output = workerSlots × base × treeDensity`; depletes equivalent volume from nearby trees.
- For `requiresOre` buildings: same pattern with ore nodes.
- For flat producers (farm, windmill): `effective_output = workerSlots × base` (no density modifier).
- `getEffectiveRate(def, col, row)` and `getResourceMessage(def, col, row)` are synchronous queries used by the info panel on click.

### BuildSystem click-selection (2026-04-22)
- Placed building sprites have `setInteractive({ useHandCursor: true })`. Click emits `building:selected` with `PlacedBuildingData`.
- `checkBuildingClick(pointer)` is the fallback when no placement is active — it checks tile coordinates against the placed-buildings list (handles clicks that miss the sprite hit area).
- Clicking empty space emits `building:deselected`.
- `building:selected` → WorldScene enriches → `building:info` → UIScene shows panel.

---

## NPC Spritesheets (Phase 5, 2026-04-23)

### Frame layout — confirmed for all 7 premade NPCs
- All sheets: 6 columns × 64px = 384px wide (confirmed by Jimp read)
- Row order (same for all NPCs, confirmed from knowledge.md Phase 1 reference image):
  - Row 0 (frames 0–5):   `idle_down`  — Standing, facing down
  - Row 1 (frames 6–11):  `idle_left`  — Standing, facing left
  - Row 2 (frames 12–17): `idle_right` — Standing, facing right
  - Row 3 (frames 18–23): `idle_up`    — Standing, facing up
  - Row 4 (frames 24–29): `walk_down`  — Walking, facing down
  - Row 5 (frames 30–35): `walk_left`  — Walking, facing left
  - Row 6 (frames 36–41): `walk_right` — Walking, facing right
  - Row 7 (frames 42–47): `walk_up`    — Walking, facing up
  - Row 8+ : Work/action animations (profession-specific)

### Sheet sizes
| NPC | File size | Rows | Work rows |
|---|---|---|---|
| Farmer_Bob | 384×832 | 13 | Rows 8–12 (plant, harvest, etc.) |
| Farmer_Buba | 384×832 | 13 | Same as Bob |
| Lumberjack_Jack | 384×640 | 10 | Rows 8–9 (chop) |
| Miner_Mike | 384×640 | 10 | Rows 8–9 (mine) |
| Chef_Chloe | 384×448 | 7 | None (idle + walk only; missing walk_up row 7) |
| Bartender_Bruno | 384×448 | 7 | None |
| Bartender_Katy | 384×448 | 7 | None |
| Fisherman_Fin | 576×832 | — | Deferred to Phase 6; different column count (9 cols) |

- Chef/Bartender sheets have 7 rows → rows 0–6 only. Row 7 (walk_up) is absent. The animation registration skips rows ≥ npc.rows.
- Work anim names registered: `work_chop`, `work_chop2` (lumberjack), `work_mine`, `work_mine2` (miner), `work_plant`, `work_harvest` (farmers).
- Exact action semantics for rows 8–12 of Farmer sheets are UNVERIFIED — named `work_plant`/`work_harvest` by convention. Inspect visually during playtesting.

### Atlas packing (npcs.{png,json})
- Frame naming: `{npc_prefix}_{frameIndex}` where frameIndex = rowIndex × 6 + colIndex
- Total: 402 frames packed into a single 4096×4096 page.
- Animation registration in PreloadScene uses `anims.generateFrameNames('npcs', { prefix: '{prefix}_', start, end })`.

---

## Animal Sprites (Phase 5, 2026-04-23)

### Individual frame PNGs (not spritesheets)
- `Animals/Chicken/Chicken_01.png` … `Chicken_18.png` — individual animation frame PNGs, each **256×512 px**
- `Animals/Cow/Cow_01.png` … `Cow_09.png` — each **256×480 px**
- `Animals/Pig/Pig_01.png` … `Pig_16.png` — each **288×480 px**
- These are NOT spritesheet grid layouts. Each file = one animation frame of the animal.
- `Rooster.png` excluded from atlas (separate decorative sprite).
- Animals atlas: 43 frames packed into a 4096×4096 page (required due to large source frame sizes).
- Frame names: `Chicken_01` … `Chicken_18`, `Cow_01` … `Cow_09`, `Pig_01` … `Pig_16`.
- **Display scale:** Since source frames are ~256×512, use `setScale(0.06)` to get ~16 world-px wide appearance (1 tile). At RENDER_SCALE=2, appears as ~32 screen px wide.

### Animations registered
- `animal_chicken` — frames Chicken_01 through Chicken_18 at 8 fps
- `animal_cow` — frames Cow_01 through Cow_09 at 8 fps
- `animal_pig` — frames Pig_01 through Pig_16 at 8 fps

---

## Phase 5 — Life (2026-04-23)

### A* pathfinding
- Implemented in `src/utils/pathfinding.ts`. 4-directional Manhattan heuristic. Capped at 3000 iterations to avoid frame stalls.
- Blockers registered via `registerPathfindingBlocker(fn)`. ResourceNodeSystem registers trees/ore as blockers.
- If destination tile is occupied, resolves nearest walkable neighbour within radius 4.
- Returns `[]` if no path found (VillagerSystem handles gracefully — villager stays idle).

### Villager spawning
- One villager spawns per `wood_house_blue` placed (checking `def.isHouse === true`).
- Spawn position: one tile below the house center (bottom edge of footprint).
- Generic NPC (`chef_chloe`) used for all villagers — sprite shows chef appearance regardless of workplace.
- **Phase 6 TODO:** Reassign villager NPC sprite to match `def.workerSprite` on assignment (requires re-creating the Sprite object or using a texture swap).

### Day/night visual
- Single full-screen `Rectangle` in WorldScene at depth 80, scrollFactor 0.
- Color: `0x1a2255` (dark blue night tint). Alpha: 0.0 day, 0.35 dawn, 0.6 night.
- Transitions use Phaser tweens (800ms dawn, 1500ms day, 2000ms night).
- Game starts at hour 6 (day) so overlay initialises at alpha 0.

### Weather system
- Particle emitter uses `this.add.particles(...)` with `'weather'` atlas and `'Rain_Drop'` frame.
- Emitter positioned at top of viewport with `setScrollFactor(0)` to follow screen not world.
- `depth` is NOT a valid key in `ParticleEmitterConfig` (Phaser 4 type error). Use `emitter.setDepth()` after creation instead.
- `scrollFactorX/Y` are NOT in `ParticleEmitterConfig`. Use `emitter.setScrollFactor(0)` after creation.
- Rain wrapped in try/catch — if particle emitter API differs across builds, it silently skips particles.

### pack-atlases.js multi-machine fix
- Hardcoded `ASSET_SRC = 'G:/Cute_Fantasy'` breaks on PCs without that drive.
- Fix: check if `G:/Cute_Fantasy` exists; fall back to `join(ROOT, '..')` (parent folder of the project).
- The `LOCAL_ASSET_SRC` path works on this machine where project is nested inside the asset folder.

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

---

## Phase 6 — Districts & Progression (2026-04-23)

### UnlockSystem tier conditions
- `tier1_starter` is pre-unlocked on init (no condition needed).
- Conditions checked each `time:tick` and `building:placed`:
  - `tier2_farming`: 1+ wood houses placed
  - `tier3_residential`: 3+ wood houses placed
  - `tier4_marketplace`: Gold ≥ 100 (cumulative earned, not current)
  - `tier5_waterfront`: market stall placed (`triggersWaterfront: true` on `market_stall` def)
  - `tier6_quarry`: Stone ≥ 50 (cumulative gathered)
  - `tier7_walls`: 10+ villagers alive
  - `tier8_park`: happiness ≥ 0.5 (decoration_count / house_count)
  - `tier9_magic`: Gold ≥ 200 (cumulative)
  - `tier10_expansion`: tier9_magic unlocked
- Once unlocked, a tier stays unlocked forever (Set<string> — never removed).
- On unlock: emits `unlock:gained` on `scene.events`; UIScene shows toast and calls `buildMenu.onUnlockChanged()`.

### Happiness multiplier
- Formula: `happiness = decoration_count / max(1, house_count)`
- Propagated to EconomySystem as `setHappinessMultiplier(1 + happiness × 0.3)`.
- Effective range: ×1.0 (0 decorations) → ×1.3 (1 decoration per house).
- `decoration_count` = count of placed buildings with `isDecoration: true`.
- `house_count` = count of placed buildings with `isHouse: true`.
- Recalculated every `time:tick`.

### SaveSystem — localStorage shape
- Key: `cf_city_save_v1`
- Version field: `version: 1` — used for future migration guards.
- Resources serialized as plain numbers (all 5: Wood/Stone/Food/Gold/Mana).
- Buildings: `{ key, col, row, id }` array — `silentPlace()` on load re-creates sprites and economy entries.
- Villagers: `{ col, row, npcKey }` — re-spawned at saved tile position on load.
- Unlocks: `string[]` of tier keys (converted from Set → array for JSON, back on load).
- FogRevealed: `Array<[number, number]>` of `[regionX, regionY]` region coordinates.
- Stats: `{ goldEarned, stoneGathered }` — cumulative totals used by unlock conditions.
- Camera: `{ x, y, zoom }` — restored on load so player returns to same view.

### FogOfWar region mechanics
- Map divided into 10×10-tile regions. Region `(rx, ry)` covers tiles `(rx*10 … rx*10+9, ry*10 … ry*10+9)`.
- Center 3×3 regions revealed by default (for a 64×64 map: regions 2-4 in both axes).
- Dark overlay: one `Rectangle` per region. `tryRevealRegion(rx, ry)` charges 50 Gold and tweens alpha to 0.
- `restoreRevealed(pairs)` re-applies revealed state from save without charging Gold.
- Expansion tab in BuildMenu: clicking a fogged region triggers `fog:reveal:attempt` event → FogOfWar handles it.
- `getRevealedRegions()` returns `[rx, ry]` pairs for save.

### Water terrain — GID 593
- `terrain_base.png` was extended to 608 px tall (was 592) to add `Water_Middle.png` at Y=592.
- GID 593 = water fill tile (first tile of the new row).
- `gidToTerrain(593)` returns `'water'` in `grid.ts`.
- Water patch: rows 5–18, cols 52–63 of the generated map.
- `hasWaterAdjacent(col, row, w, h)` checks the 1-tile border around a footprint for `'water'` terrain — used by `isValidPlacement()` for `requiresWaterAdj` buildings.

### BuildMenu dynamic tab filtering
- `activeTabs()` returns only tabs with ≥1 unlocked building — no empty tabs shown.
- `visibleDefs()` filters building catalog to current tab AND `isUnlocked(b.unlockKey ?? 'tier1_starter')`.
- `onUnlockChanged(fn)` replaces the isUnlocked predicate and calls `rebuildTabs()` + `buildButtons()`.
- Expansion tab is special-cased: renders a hint text instead of building buttons.
- Decor sprites (Fountain, Benches, Flowers, Boat, Minecrats) live in the `'decor'` atlas, not `'buildings'`. `buildButtons()` checks the sprite frame name to pick the right atlas.

### Church_Blue.png — too wide for a placed building
- `Church_Blue.png` is **448×144 px** (28 tiles wide). Using it as a Magic District placed building would create an enormous footprint that dominates the map.
- **Decision:** Magic Academy uses `House_5_Stone_Base_Blue` (96×128) with `sprite.setTint(0x9966ff)` for the purple magic tint.
- `isMagic: true` in BuildingDef → BuildMenu applies tint; BuildSystem's `silentPlace()` also applies tint on load.

### Fisherman_Fin — 9 columns, not 6
- `Fisherman_Fin.png` is **576×832 px** — 9 columns of 64px = 576px wide.
- All other NPC sheets are 6 columns (384px wide).
- **Fix:** `NpcDef` interface has optional `cols?: number`. `pack-atlases.js` and `PreloadScene.ts` use `npc.cols ?? NPC_COLS` for frame range calculation.
- Frame naming: same `{prefix}_{frameIndex}` scheme, but frameIndex = rowIndex × 9 + colIndex.

### Waterfront unlock trigger — market stall, not bridge
- Original plan: Waterfront unlocked when first bridge is placed. Bridge PNGs are tile assets (individual tiles), not single placed-building sprites → can't be used as `BuildingDef` entries.
- **Decision:** `market_stall` has `triggersWaterfront: true`. When this building is placed, `UnlockSystem` sets `marketStallPlaced = true`, which satisfies the `tier5_waterfront` condition on the next tick.

### BuildSystem.silentPlace()
- Restores a building without deducting cost or emitting `building:placed`.
- Still marks grid occupancy, creates the sprite at correct depth, and calls `economy.addBuilding()`.
- Applies `setTint(0x9966ff)` if `def.isMagic`.
- Used exclusively by `SaveSystem.load()` to restore the building map from saved state.

### Mana resource
- Added as 5th resource type alongside Wood/Stone/Food/Gold.
- ResourceBar hides Mana icon+counter until `resources.Mana > 0` (set visible on first non-zero update).
- No building currently produces Mana — placeholder for future magic buildings.
- EconomySystem `Resources` interface includes `Mana: number`.
