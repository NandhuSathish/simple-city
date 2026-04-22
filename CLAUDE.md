# CLAUDE.md — Project Rules for Claude Code Sessions

This file governs how every Claude Code session must behave in this project. Read it before touching any file.

---

## 1. Mandatory file updates after every coding session

### knowledge.md
- After every session, append new entries under the appropriate section.
- Record things that were **discovered, confirmed, or decided** that are not obvious from reading the code — e.g. sprite frame dimensions, Phaser 4 API quirks, asset folder structure, build tool behaviour.
- Format: `### [Topic]` heading, then bullet points. Date each entry `(YYYY-MM-DD)`.
- Never delete old entries. Mark outdated ones with `~~strikethrough~~` and add a correction below.

### changelog.md
- Every change made during a session must be logged here.
- One entry per Phase / session, under a `## [Phase N — Title] YYYY-MM-DD` heading.
- Use sub-bullets for individual file changes: `- **Added** / **Changed** / **Removed** / **Fixed**`.
- Commit the changelog update in the same session as the code changes — never backfill from memory across sessions.

---

## 2. Coding rules

- **TypeScript strict mode.** `tsc --noEmit` must pass with zero errors before a session is considered done.
- **No inline comments** unless the WHY is non-obvious (hidden constraint, Phaser quirk, workaround).
- **No premature abstractions.** Do not generalise until the third concrete use case.
- **One phase at a time.** Do not implement Phase N+1 features while working on Phase N. Flag scope creep immediately.
- **Asset licence hygiene.** Raw PNGs from `G:\Cute_Fantasy\` must never be committed to a public repo. `.gitignore` rules are the enforcement mechanism — do not bypass them.
- **Constants live in `src/config.ts`.** Never hardcode TILE_SIZE, RENDER_SCALE, GAME_WIDTH, GAME_HEIGHT, or frame dimensions in scene files.
- **No `any` types** unless interfacing with an untyped third-party API, and even then wrap it immediately.

---

## 3. Scene architecture rules

- Scene flow: `BootScene → PreloadScene → WorldScene` (+ `UIScene` parallel from Phase 3 onward).
- All asset loading happens in `PreloadScene.preload()`. No other scene loads assets.
- Cross-scene communication goes through `scene.events` (Phaser's EventEmitter), never through globals or module-level variables.

---

## 4. Asset pipeline rules

- Source assets live at `G:\Cute_Fantasy\` (outside the repo).
- Built atlases go to `public/assets/atlases/` and are regenerated via `node tools/pack-atlases.ts`.
- Tile PNGs used in Phase 0/1 before the atlas pipeline is wired up go directly into `public/assets/` and are listed individually in `.gitignore`.

---

## 5. Definition of done (per phase)

A phase is done when:
1. `npm run dev` starts without errors.
2. `tsc --noEmit` reports zero errors.
3. `npm run build` completes without errors.
4. The phase's visual/interactive DoD (described in `PLAN.md §5`) is reproducibly true.
5. `knowledge.md` and `changelog.md` are updated.

---

## 6. Do not do these things

- Do not run `npm install` for packages not listed in `PLAN.md §1` without confirming with the user.
- Do not push to any remote without explicit user instruction.
- Do not delete files from `G:\Cute_Fantasy\` (source asset folder).
- Do not add audio, animations, or gameplay features while in Phase 0 or Phase 1.
- Do not modify `PLAN.md` content during a session unless the user explicitly instructs an update.
