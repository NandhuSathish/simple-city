# changelog.md

---

## [Game Customizer Phase A — sprite-defs.json + pack-atlases refactor] 2026-04-23

Goal: Establish `src/data/sprite-defs.json` as the single source of truth for all sprite metadata; refactor `tools/pack-atlases.js` to read NPC and building groups from it instead of hardcoded arrays. Phase A steps 1–4 complete.

### Added

- **`src/data/sprite-defs.json`** — Extended from 1 entry (chicken_01) to 27 total across three categories:
  - **8 NPC entries** (`category: "npc"`, `atlasGroup: "npcs"`): farmer_bob, farmer_buba, lumberjack_jack, miner_mike, chef_chloe, bartender_bruno, bartender_katy, fisherman_fin. Each entry carries `framePrefix`, `frameWidth/Height` (all 64×64), and a full `animations` array with named rows (idle_down/left/right/up, walk_down/left/right/up, plus profession-specific work rows). Rows derived from the old `NPC_SHEETS` array; unknown work rows named `work_row_N` as placeholders.
  - **18 building entries** (`category: "building"`): one per unique `spriteFrame` referenced in `buildingCatalog.ts`. Includes `footprintW/H` (in tiles), exact pixel `frameWidth/Height` read from PNG headers, `anchor: {x:0.5, y:1.0}`, and `variants: ["default"]`. `atlasGroup` is `"buildings"` for sprites packed by `packBuildings()`, or `"decor"` for Fountain/Boat/Benches/Flowers (packed by `packDecor()`). `wall_segment` shares `Well.png` with `well` as a placeholder; both entries are present.

### Changed

- **`tools/pack-atlases.js`** — Refactored NPC and building packing to read from `sprite-defs.json`:
  - Sprite-defs loaded once at module level (`SPRITE_DEFS`) and shared by all three driven packers.
  - `packNpcs()`: replaced hardcoded `NPC_SHEETS` array. Derives `totalRows` as `max(animation.row)+1` and `cols` from `animations[0].cols`. Frame naming `{framePrefix}_{r*cols+c}` preserved exactly — output is byte-for-byte equivalent (519 frames, verified).
  - `packBuildings()`: replaced `collectPngs()` full-directory scan. Now packs only the sprites listed in sprite-defs (`atlasGroup === 'buildings'`). Builds a filename→fullpath index from the ASSET_SRC tree at runtime; duplicates (well + wall_segment both reference Well.png) are deduplicated via a `Set`. Frame names unchanged (PNG basename without extension).
  - `packAnimals()`: unchanged in behavior; now reads from the module-level `SPRITE_DEFS` instead of loading the file internally.
  - Added **`--group=<atlasGroup>` CLI flag**: routes to a single packer function via `ATLAS_PACKERS` map and exits. Unknown group names print an error and exit 1. Example: `node tools/pack-atlases.js --group=npcs`.
  - Removed: `NPC_SHEETS` constant, `NPC_FRAME_W`, `NPC_FRAME_H` constants, internal sprite-defs file read inside `packAnimals()`.

### Notes

- Building atlas now packs 14 sprites (catalog-referenced subset) instead of the previous 160+ (full directory scan). All `spriteFrame` values in `buildingCatalog.ts` are covered; only the Blue color variants are packed since those are the only ones currently referenced by the catalog.
- Fisherman_Fin confirmed at 9 cols × 13 rows = 117 frames; matches the Phase 6 changelog entry and `PreloadScene.ts`.

---

## [Phase 6 — Districts & Progression] 2026-04-23

Goal: The 10 concept-panel districts become content tiers unlocked as the city grows. Full save/load. Pause menu + tech tree. Happiness system. Fog of war.

### Added

- **`src/systems/UnlockSystem.ts`** — Tracks `unlocks: Set<string>` for all 10 tiers. Checks conditions each `time:tick` and on `building:placed`. Emits `unlock:gained` when a new tier opens. Computes `happiness = decoration_count / house_count` and propagates it to EconomySystem as a production multiplier (×1.0 at 0 → ×1.3 at 1.0). `UNLOCK_DEFS` array exported for TechTree.

- **`src/systems/SaveSystem.ts`** — Full game state serialized to localStorage key `cf_city_save_v1` (version 1). Snapshot: resources, camera, time, buildings[], villagers[], unlocks[], fogRevealed[], stats (cumulative gold/stone). `save()` writes JSON; `load()` restores via `silentPlace`, `restoreResources`, `restoreUnlocks`, `restoreRevealed`. Auto-loads on WorldScene create if a save exists.

- **`src/systems/FogOfWar.ts`** — Dark overlay on 10×10-tile regions. Center 3×3 revealed by default. `tryRevealRegion(rx, ry)` deducts 50 Gold and fades out the panel. Panels persist through load via `restoreRevealed`. UIScene click handler triggers reveal when Tier 10 is unlocked.

- **`src/ui/PauseMenu.ts`** — Esc key toggles pause overlay (depth 300). Buttons: Resume, Save Game, Load Game, Tech Tree. Pausing sets `WorldScene.paused = true` so `update()` skips all ticks.

- **`src/ui/TechTree.ts`** — Full-screen unlock tree (depth 290). 5-column layout with edges drawn via `Graphics`. Each node shows label, description, lock/unlock badge. Rebuilt on every `show()` to reflect current unlock state.

- **`src/ui/BuildMenu.ts`** — Rewritten. Tabs are now dynamic — only tabs with at least one unlocked building appear. `onUnlockChanged()` rebuilds tabs + buttons. Decor items (Fountain, Benches, Flowers, Boat) pull sprites from `decor` atlas instead of `buildings`. Expansion tab shows a hint text instead of building buttons. Tooltip includes water-adjacency note.

- **`src/ui/ResourceBar.ts`** — Mana row added. Mana icon (`other_0` tinted purple) and counter hidden until `resources.Mana > 0`.

### Changed

- **`src/types.ts`** — `ResourceType` gains `'Mana'`. `BuildMenuTab` gains `'Marketplace' | 'Waterfront' | 'Defense' | 'Magic' | 'Expansion'`. `BuildingDef` gains: `unlockKey`, `requiresWaterAdj`, `isDecoration`, `isMagic`, `triggersWaterfront`. Added `SaveData`, `SavedBuilding`, `SavedVillager`, `SaveStats` interfaces.

- **`src/systems/EconomySystem.ts`** — `Resources` interface adds `Mana: number`. Tracks `cumulativeGold` and `cumulativeStone` (accumulate on production, not on deduction). Accepts `happinessMultiplier` from UnlockSystem. `restoreResources()` and `restoreStats()` added for load. `removeBuilding()` added for future demolish support.

- **`src/systems/BuildSystem.ts`** — `isValidPlacement()` now checks `requiresWaterAdj` via `hasWaterAdjacent()`. `silentPlace(key, col, row)` restores buildings without paying cost or emitting events. Magic buildings get `setTint(0x9966ff)` automatically.

- **`src/data/buildingCatalog.ts`** — Expanded from 6 to 21 buildings across Tiers 1–9:
  - Tier 2: Lumberjack Hut, Quarry, Farm, Coop (moved from starter)
  - Tier 3: Stone House, Limestone House
  - Tier 4: Market Stall (triggers Waterfront unlock), Fountain
  - Tier 5: Fisherman House (requires water adjacency), Boat
  - Tier 6: Mining Post (Blacksmith_House_Blue sprite)
  - Tier 7: Wall Segment (Well sprite placeholder)
  - Tier 8: Park Bench, Flower Garden
  - Tier 9: Magic Academy (House_5_Stone_Base_Blue + purple tint + isMagic)
  - Tier 10: Expansion managed by FogOfWar (no catalog entry)

- **`src/scenes/WorldScene.ts`** — Wires UnlockSystem, SaveSystem, FogOfWar. Auto-loads save on create. Esc key: cancels active placement first; if no placement active, emits `pause:toggle`. `paused` flag skips all system updates. Exposes `getUnlockSystem()`, `getSaveSystem()`, `getFogOfWar()`.

- **`src/scenes/UIScene.ts`** — Creates PauseMenu and TechTree. Handles `unlock:gained` (rebuilds BuildMenu, shows toast). Handles `pause:toggle`. Handles fog expansion clicks (checks `tier10_expansion` unlock). Toast queue system with fade-in/fade-out.

- **`src/scenes/PreloadScene.ts`** — Adds `fisherman_fin` to NPC_SHEETS with `cols: 9`. `registerNpcAnims()` uses per-NPC column count.

- **`tools/pack-atlases.js`** — `packDecor()` expanded from 1 sprite (Ores) to 6: Ores, Fountain, Benches, Flowers, Boat, Minecrats. NPC_SHEETS gains `Fisherman_Fin.png` (9 cols × 13 rows = 117 frames). NPCs atlas now has 519 frames.

- **`tools/build-tilesets.ts`** — Canvas height extended from 592→608. Water_Middle.png added at Y=592 (GID 593).

- **`tools/gen-starter-map.ts`** — Water patch added: rows 5–18, cols 52–63 (GID 593). tileset imageheight and tilecount updated to 608.

- **`src/utils/grid.ts`** — `gidToTerrain` recognizes GID 593 as `'water'`. New `hasWaterAdjacent(col, row, w, h)` checks the 1-tile border around a footprint for water terrain.

- **`src/entities/Villager.ts`** — `tileCol` and `tileRow` getters exposed for SaveSystem serialization.

### Unlock conditions

| Tier | Key | Condition |
|------|-----|-----------|
| 1 | tier1_starter | Always |
| 2 | tier2_farming | ≥ 1 Wood House |
| 3 | tier3_residential | ≥ 3 Wood Houses |
| 4 | tier4_marketplace | ≥ 100 Gold earned cumulative |
| 5 | tier5_waterfront | First Market Stall placed |
| 6 | tier6_quarry | ≥ 50 Stone gathered cumulative |
| 7 | tier7_walls | ≥ 10 villagers |
| 8 | tier8_park | happiness ≥ 0.5 (decor ≥ half houses) |
| 9 | tier9_magic | ≥ 200 Gold earned cumulative |
| 10 | tier10_expansion | tier9_magic unlocked |

### Notes / deviations from PLAN.md

- **Bridge replaced**: Waterfront unlock now triggers on placing first Market Stall (instead of "first bridge placed") — no suitable single-sprite bridge asset found in the pack.
- **Church_Blue skipped**: 448×144 px is a composite panoramic sprite not suitable as a single placed building. Magic Academy uses `House_5_Stone_Base_Blue` with `0x9966ff` tint instead.
- **Wall segments**: Use Well sprite as placeholder (as noted in PLAN.md §5 Phase 6: "may require hand-sliced assets from Cliff tileset").
- **Fisherman_Fin animations**: Packed with 9 columns (per pack's 576px-wide sheet layout).

### Verification

- `tsc --noEmit` → 0 errors
- `npm run build` → success, ~1.41 MB bundle (368 kB gzip), ~2.4s

---

All notable changes to the Cute Fantasy City Builder, by phase/session.

---

## [Phase 5 — Bugfixes, Clock, Sprite Configurator] 2026-04-23

### Fixed

- **`src/scenes/WorldScene.ts`** — Day/night overlay was permanently invisible: `Rectangle` was constructed with `fillAlpha=0`, making every `alpha` tween a no-op (`0 × alpha = 0`). Fixed by passing `fillAlpha=1` and starting the game-object alpha at 0 via `setAlpha(0)`. Night darkening (alpha→0.6), dawn (alpha→0.35), and day (alpha→0) now work correctly.

- **`src/systems/TimeSystem.ts`** — `_minuteOfDay` initialised at 0 while `_gameHour` was 6, causing the hour to reset to 1 on the first tick. Fixed by initialising both to 6. Added a `_day` counter that increments on midnight wrap. `time:tick` now carries `{ hour, day }` payload (backwards-compatible — existing listeners that take no arguments are unaffected).

- **`src/systems/BuildSystem.ts`** — After placing a building, `activeDef` was never cleared. Any click on a placed building while still in placement mode was silently swallowed by the `if (this.activeDef) return` guard, so the building could never be selected — and therefore the assign panel never appeared. Fixed: `this.cancel()` is now called immediately after a successful placement so the player returns to selection mode automatically.

- **`src/ui/VillagerAssignPanel.ts`** — Panel was positioned at y=50, directly overlapping `BuildingInfoPanel` (y=40). Moved to `y=165` (below the info panel). Added **"No idle villagers — Place a Wood House first."** empty-state message so the panel is never silently blank.

### Added

- **`src/ui/ClockWidget.ts`** — Game clock displayed in the top-right corner of the resource bar. Shows `DAY/DWN/NGT` phase label, current `HH:00` hour, `Day N` count, and a thin progress bar spanning the width of the widget that fills across the 24-hour cycle. Bar colour shifts to blue at night and orange at dawn.

- **`src/scenes/UIScene.ts`** — Subscribes to `time:tick` to keep `ClockWidget` updated every game-minute.

- **`tools/sprite-server.js`** *(new)* — Minimal Node.js HTTP server (no extra npm dependencies). Start with `npm run sprites`, open http://localhost:3456. Routes: `GET /` serves the viewer; `POST /api/upload` saves an uploaded PNG to `public/assets/source/{group}/`; `POST /api/defs` writes `src/data/sprite-defs.json`; `POST /api/build` runs `pack-atlases.js` and streams the output.

- **`tools/sprite-viewer.html`** *(rewritten)* — Fully server-backed sprite sheet configurator. In server mode (http://localhost:3456): drag-drop / file-input uploads PNG automatically to the project; configure grid with frame-size OR col/row count (bidirectional sync); click rows to label animations (name, col count, flip-for-opposite-direction flag); **Save to sprite-defs.json** posts config immediately; **Build Atlas** runs the packer and shows live output. Sprite Library sidebar shows all saved sprites with edit/delete. Falls back to clipboard-copy mode if opened as a `file://` URL.

- **`src/data/sprite-defs.json`** *(new, canonical)* — Master animation config consumed by both `pack-atlases.js` and the game at runtime. Format: `{ spritesheets: [ { id, category, srcFile, atlasGroup, frameWidth, frameHeight, animations: [{name,row,cols,flipForOpposite?}] } ] }`. Currently contains `chicken_01` (32×32, 7 animations) configured by the user.

### Changed

- **`src/systems/TimeSystem.ts`** — Added `gameDay` getter. `time:tick` event now carries `{ hour: number; day: number }` payload.

- **`tools/pack-atlases.js`** — `packAnimals()` completely replaced: now reads `src/data/sprite-defs.json` and slices each spritesheet by its configured `frameWidth × frameHeight` and animation row definitions. Frame names follow `{id}_{animName}_{frameIndex}`. Skips gracefully if no animal entries are configured yet, with a message directing the user to the Sprite Configurator.

- **`src/scenes/PreloadScene.ts`** — `registerAnimalAnims()` rewritten to import and iterate `sprite-defs.json` at build time, registering one Phaser animation per `{id}_{animName}` key. Removed hardcoded `ANIMAL_ANIMS` array.

- **`src/entities/Animal.ts`** — Rewritten. Picks a random sprite-sheet variant from `sprite-defs.json` for the requested animal category. Scale computed as `TILE_SIZE × 1.5 / frameWidth` (2 tiles wide). `updateAnim()` plays `walk` with `flipX` when `flipForOpposite: true` and the animal moves left; `idle` when stationary. Renders an invisible placeholder if no config exists yet (no crash).

- **`package.json`** — Added `"sprites": "node tools/sprite-server.js"` script.

### Verification

- `tsc --noEmit` → 0 errors
- `npm run build` → success, ~1.39 MB bundle

---

## [Phase 5 — Life: Villagers, Animals, Day/Night, Weather] 2026-04-23

Goal: The world feels alive — villagers commute between home and work, animals wander in their pens, the sky cycles through dawn/day/night, and rain occasionally falls.

### Added

- **`src/utils/pathfinding.ts`** — A* pathfinding over the occupancy grid. Trees/ore nodes block (registered via `registerPathfindingBlocker`); decoration does not. 4-directional, capped at 3000 iterations. Resolves a walkable neighbour when the destination tile is blocked.

- **`src/entities/Villager.ts`** — Villager NPC. State machine: `idle → walkToWork → work → walkHome → sleep`. Walks along A* paths in world space at 32 px/s (2 tiles/s). Plays directional `idle_*` / `walk_*` animations from the npcs atlas. Hides sprite when sleeping.

- **`src/systems/VillagerSystem.ts`** — Manages all villagers. Spawns one per house placed (`isHouse: true` in catalog). Sends villagers to work on `time:day`, home on `time:night`. Exposes `assignVillager(id, buildingData)` and `getUnassignedVillagers()` for the UI.

- **`src/entities/Animal.ts`** — Animal entity for chickens/cows/pigs. Random-walks inside the building footprint + 3-tile radius. Speed ~12 px/s with random direction changes every 2–4s. Uses the animals atlas at 0.06 scale to display tile-sized sprites. Bounces off zone boundaries.

- **`src/ui/VillagerAssignPanel.ts`** — Assignment popup shown when a workplace building is clicked. Lists up to 7 unassigned villagers; clicking one assigns them and closes the panel.

- **`public/assets/atlases/npcs.{png,json}`** — 402 frames sliced from 7 NPC sheets at 64×64 (Farmer_Bob, Farmer_Buba, Lumberjack_Jack, Miner_Mike, Chef_Chloe, Bartender_Bruno, Bartender_Katy). Frame naming: `{npc_key}_{frameIndex}`.

- **`public/assets/atlases/animals.{png,json}`** — 43 frames: Chicken_01–18, Cow_01–09, Pig_01–16. Individual PNGs (each ~256×512) packed into a 4096×4096 atlas.

- **`public/assets/atlases/weather.{png,json}`** — 4 frames: Clouds, Rain_Drop, Rain_Drop_Impact, Wind_Anim.

### Changed

- **`tools/pack-atlases.js`** — Added `packNpcs()`, `packAnimals()`, `packWeather()`. Fixed `ASSET_SRC` to fall back to the project parent folder if `G:/Cute_Fantasy` doesn't exist (multi-machine support). Animals atlas uses 4096×4096 to fit 43 large individual-frame PNGs in one page.

- **`src/systems/TimeSystem.ts`** — Now tracks `gameHour` (0–23). Emits `time:dawn` at hour 5, `time:day` at hour 6, `time:night` at hour 20 in addition to `time:tick`. Exports `HOUR_DAWN`, `HOUR_DAY`, `HOUR_NIGHT`, `HOURS_PER_DAY` for consumers.

- **`src/utils/grid.ts`** — Added `getOccupancyAt(col, row)` and `getGridDimensions()` for pathfinding.

- **`src/systems/ResourceNodeSystem.ts`** — Added `hasNodeAt(col, row)` (returns true for non-depleted nodes) and `registerAsPathfindingBlocker()` (registers itself so A* avoids tree/ore tiles).

- **`src/data/buildingCatalog.ts`** — Added `workerSprite` (NPC key), `isHouse`, `isCoop`, `isBarn` fields. Marked `wood_house_blue` as `isHouse: true`. Added `coop` building (`Coop_Base_Blue`, 2×2, `isCoop: true`, spawns chickens). Marked `farm` as `isBarn: true` (spawns cows + pigs).

- **`src/types.ts`** — Added `NpcKey`, `VillagerState`, `AnimalType` types. Extended `BuildingDef` with `workerSprite`, `isHouse`, `isCoop`, `isBarn`.

- **`src/scenes/PreloadScene.ts`** — Loads `npcs`, `animals`, `weather` atlases. Registers all NPC animations in `create()`: `idle_down/left/right/up`, `walk_down/left/right/up` for all 7 NPCs; work anims (`work_chop`, `work_mine`, `work_plant`, `work_harvest`) for profession NPCs. Registers animal animations (`animal_chicken`, `animal_cow`, `animal_pig`).

- **`src/scenes/WorldScene.ts`** — Wires `VillagerSystem` (spawn on house, update each frame). Spawns `Animal` entities on coop/barn placement. Adds a full-screen overlay `Rectangle` (depth 80, scrollFactor 0) for day/night tinting — dark blue at alpha 0.6 at night, alpha 0 during day, 0.35 at dawn. Tweens the overlay on time events. Adds weather: every 5 game-ticks, 10% chance → 2-minute rain (particle emitter + blue overlay bump).

- **`src/scenes/UIScene.ts`** — Creates `VillagerAssignPanel`, wires `building:workplace:selected / deselected` events from WorldScene.

- **`src/systems/BuildSystem.ts`** — `building:placed` event now emits full `PlacedBuildingData` (was a partial `{key, col, row, id}` object).

### Verification

- `tsc --noEmit` → 0 errors
- `npm run build` → success, ~1.39 MB bundle (362 kB gzip), ~711ms

---

## [Phase 4 — Resource Production] 2026-04-22

Goal: Resources flow from staffed production buildings that consume natural resource nodes.
No player avatar; all worker slots treated as filled for playtest.

### Added

- **`src/entities/ResourceNode.ts`** — Represents a tree or ore deposit on the map. Tracks `volume` (0–100), scales sprite alpha/size as it depletes, runs regrowth timer (`tickRegrowth()` called each game-minute). Tree nodes regrow after 5 game-minutes at zero; ore after 10.

- **`src/systems/ResourceNodeSystem.ts`** — Spawns ~90 tree nodes on grass tiles and ~22 ore deposits near map edges using a seeded LCG (deterministic). Provides `getTreeDensity(col, row, radius)` and `getOreDensity(...)` (0–1), `depleteInRadius(...)`, and `countInRadius(...)` for the economy and info panel. Subscribes to `time:tick` to drive regrowth.

- **`src/ui/BuildingInfoPanel.ts`** — Right-side panel (depth 200) shown when a placed building is clicked. Displays: name, worker slots (X/Y), current effective production rate, and a resource availability message ("No trees in range" | "Trees in range: N (D% full)" etc.). Shown/hidden via `building:info` / `building:deselected` events.

- **`tools/pack-atlases.js`** — Added `packTrees()` (12 tree PNGs → `trees.{png,json}`), `packDecor()` (`Ores.png` → `decor.{png,json}`), and `packCrops()` (Crops.png 7×43 grid sliced into 301 16×16 frames → `crops.{png,json}`).

### Changed

- **`tools/gen-starter-map.ts`** — Added a farmland zone (rows 44–55, cols 8–55, GIDs 241+) in the south-centre of the map. Renamed `grassGroundLayer()` → `groundLayer()`. `world.tmj` regenerated.

- **`src/types.ts`** — Added `ResourceNodeType`, optional `BuildingDef` fields (`workerSlots`, `productionRadius`, `requiresTrees`, `requiresOre`), and new interfaces `PlacedBuildingData` and `BuildingInfo`.

- **`src/utils/grid.ts`** — Added `initTerrainFromGids(gids)`, `getTerrainAt(col, row)`, and `isTerrainAllowed(col, row, w, h, allowed)`. Terrain is inferred from Tiled GID ranges: 1–160 = grass, 241–368 = farmland, otherwise path.

- **`src/data/buildingCatalog.ts`** — Added three production buildings:
  - **Lumberjack Hut** (`Shed_Base_Blue`, 2×2, `requiresTrees`, radius 8, 2 slots, base 0.3 Wood/min, costs Wood 30 / Stone 10)
  - **Quarry** (`Silo`, 2×3, `requiresOre`, radius 10, 3 slots, base 0.25 Stone/min, costs Wood 20 / Stone 30)
  - **Farm** (`Barn_Base_Blue`, 3×3, `terrainAllowed: ['farmland']`, 2 slots, 0.4 Food/min, costs Wood 25 / Stone 10)

- **`src/systems/EconomySystem.ts`** — `addBuilding(def, col, row)` now stores position. Production tick scales output by `workers × density` for tree/ore buildings and depletes corresponding nodes. Exposes `getEffectiveRate(def, col, row)` and `getResourceMessage(def, col, row)` for the info panel.

- **`src/systems/BuildSystem.ts`** — Ghost validation now checks `isTerrainAllowed()` (red ghost on wrong terrain). Placed buildings are tracked with `PlacedBuildingData`; clicking a placed building emits `building:selected`; clicking empty space emits `building:deselected`.

- **`src/scenes/PreloadScene.ts`** — Loads `trees`, `decor`, `crops` atlases.

- **`src/scenes/WorldScene.ts`** — Initialises `ResourceNodeSystem`, calls `spawnNodes()` after terrain grid is set, wires `EconomySystem.setResourceNodeSystem()`. Handles `building:selected` → enriches with economy data → emits `building:info`.

- **`src/scenes/UIScene.ts`** — Creates `BuildingInfoPanel`; subscribes to `building:info` and `building:deselected` events. Right-click anywhere in UIScene also hides the panel.

### Verification

- `tsc --noEmit` → 0 errors
- `npm run build` → success, ~1.37 MB bundle (358 kB gzip), ~976ms

---

## [Phase 3 — Economy & proper UI] 2026-04-22

Goal: Tick-based economy with costs/production, resource HUD, and tabbed build menu.

### Added
- **`src/systems/TimeSystem.ts`** — Game clock. `GAME_MINUTE_MS = 1000` (1 real second = 1 game-minute, tunable). `update(delta)` accumulates ms and emits `time:tick` on `scene.events` each game-minute.
- **`src/systems/EconomySystem.ts`** — Tick-based economy. Starting resources: `Wood 50 / Stone 20 / Food 30 / Gold 100`. Subscribes to `time:tick`, aggregates `produces`/`consumes` across all placed buildings, emits `economy:changed` with snapshot. Exposes `canAfford(cost)`, `deductCost(cost)`, `addBuilding(def)`, `getSnapshot()`.
- **`src/scenes/UIScene.ts`** — Runs in parallel with WorldScene (`this.scene.launch('UIScene')`). Creates `ResourceBar` and `BuildMenu`, subscribes to WorldScene's `economy:changed`, primes HUD from `world.getEconomySnapshot()` on startup, routes `build:start` emissions back to WorldScene's event bus.
- **`src/ui/ResourceBar.ts`** — Top bar (depth 190). Shows 4 icons from `icons` atlas + resource counters. `update(resources)` re-draws counters on every `economy:changed`. Icon frames: `res_0`=Wood, `res_1`=Stone, `food_0`=Food, `res_5`=Gold (verify visually).
- **`src/ui/BuildMenu.ts`** — Bottom bar (depth 190). Tabbed: Housing / Production / Resource / Decoration. Each button shows the building sprite scaled to fit a 72×72 button, with the label below. Tooltip on hover shows name, cost, produces/consumes. Cannot-afford state greys button to 40% alpha and disables interaction. `onResourceUpdate(resources)` called each tick to refresh affordability.
- **`tools/pack-atlases.js`** (icons section) — Slices `Icons/Outline/*.png` (5 sheets) into 16×16 frames using Jimp pixel-copy, packs them into `public/assets/atlases/icons.{png,json}` (177 frames). Frame naming: `res_N` (Resources_Icons_Outline, 6×6), `food_N` (8×12), `other_N` (5×3), `other2_N` (4×5), `tool_N` (10×1).

### Changed
- **`src/types.ts`** — Added `ResourceType`, `ResourceMap`, `BuildMenuTab`. Extended `BuildingDef` with `label`, `tab`, `cost`, `produces`, `consumes`.
- **`src/data/buildingCatalog.ts`** — All three buildings gain `label`, `tab`, `cost`, `produces`, `consumes`. Balancing: `wood_house_blue` costs Wood 10 / Stone 5, consumes Food 0.05/min; `windmill` costs Wood 20 / Stone 10, produces Food 0.2/min; `well` costs Stone 15, no production.
- **`src/systems/BuildSystem.ts`** — Accepts `EconomySystem` parameter. `onPointerMove` factors in `canAfford` when deciding ghost tint. `onPointerDown` calls `deductCost` + `addBuilding` on placement. Adds `isOverUI()` check to suppress placement clicks inside the HUD zones. Listens to `scene.events` for `build:start` (routed from BuildMenu via UIScene).
- **`src/scenes/WorldScene.ts`** — Creates `TimeSystem` and `EconomySystem`. Passes `economySystem` to `BuildSystem`. Launches UIScene. Removes HUD hint text (replaced by BuildMenu). Keyboard shortcuts 1/2/3 now emit `build:start` on `scene.events` (same path as UI). Exposes `getEconomySnapshot()` for UIScene priming.
- **`src/scenes/PreloadScene.ts`** — Loads `icons` atlas.
- **`src/main.ts`** — Registers `UIScene` in the scene list.
- **`src/config.ts`** — Added `UI_TOP_BAR_H = 36` and `UI_BOTTOM_BAR_H = 106` constants.

### Verification
- `tsc --noEmit` → 0 errors
- `npm run build` → success, ~1.37 MB bundle (355 kB gzip), ~5.4 s

---

## [Phase 2 — Build system MVP] 2026-04-22

Goal: Grid-based building placement with ghost sprite and validation. No resource costs.

### Added
- **`src/utils/grid.ts`** — 2D occupancy array sized to the tilemap. Functions: `initGrid(cols, rows)`, `worldToTile(x, y)`, `tileToWorld(col, row)`, `isFree(col, row, w, h)`, `occupy(col, row, w, h, id)`, `release(col, row, w, h)`.
- **`src/types.ts`** — Added `TerrainType`, `Footprint`, and `BuildingDef` interfaces.
- **`src/data/buildingCatalog.ts`** — 3 starter buildings: `wood_house_blue` (2×2), `windmill` (2×3), `well` (1×1). Each has `spriteFrame`, `footprint`, and `terrainAllowed`.
- **`tools/pack-atlases.js`** — CLI packer using free-tex-packer-core. Globs all PNGs from `G:/Cute_Fantasy/Buildings/Buildings/` plus `Well.png`, emits `public/assets/atlases/buildings.{png,json}`. Run: `npm run pack:atlases`.
- **`tools/pack-atlases.ts`** — TypeScript-documented version of the above (kept for reference); run the .js version due to `--experimental-strip-types` bug with inline callback type annotations (see knowledge.md).
- **`src/systems/BuildSystem.ts`** — Ghost sprite follows cursor snapped to tile grid. Tints green (`0x00ff00`) if footprint is free, red (`0xff0000`) if blocked or out of bounds. Left-click commits placement, marks occupancy, places permanent sprite, emits `building:placed`. Right-click or Esc cancels.
- **`public/assets/atlases/buildings.{png,json}`** — Generated 4096×1086 atlas, 155 frames.
- **`package.json`** — Added `pack:atlases` script.

### Changed
- **`src/scenes/PreloadScene.ts`** — Added `this.load.atlas('buildings', ...)` to load the buildings atlas.
- **`src/scenes/WorldScene.ts`** — Calls `initGrid(map.width, map.height)` after map creation. Integrates `BuildSystem`. Adds number keys 1/2/3 (JustDown) to select buildings. Adds a fixed hint line at the bottom of the screen (`setScrollFactor(0)`).
- **`.gitignore`** — Added `public/assets/atlases/*.json` (generated files alongside the already-ignored PNGs).
- **`free-tex-packer-core@0.3.5`** — Added as dev dependency.

### Discovered
- See new entries in knowledge.md (atlas pipeline section).

---

## [Phase 2 — Zoom clamp & full-screen canvas] 2026-04-22

Goal: Prevent camera from zooming out past the point where the dark background becomes visible. Make canvas fill the full browser window.

### Changed
- **`src/systems/InputSystem.ts`** — Removed static `ZOOM_MIN = 1`. Added `mapWidth`/`mapHeight` fields stored in `init()`. Initial zoom is now `Math.max(RENDER_SCALE, minZoom)`. Wheel handler computes `minZoom = Math.max(c.width / mapWidth, c.height / mapHeight)` each event so the tilemap always fills the viewport regardless of window size.
- **`index.html`** — Changed `#app` from `width: 100vw; height: 100vh` to `position: fixed; inset: 0` for guaranteed full-viewport coverage.

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
