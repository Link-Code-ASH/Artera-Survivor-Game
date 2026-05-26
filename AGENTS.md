# Artera Survivor Agent Guide

## Run Commands
- Install dependencies: `npm.cmd install`
- Start local dev server: `npm.cmd run dev`
- Build: `npm.cmd run build`

Use `npm.cmd` on Windows because plain `npm` can be blocked by PowerShell execution policy.

## Documentation-Driven Workflow
- The user gives game ideas, feature requests, balance goals, and design direction in natural language and does not need to edit code directly.
- For feature requests, update the most relevant Markdown document before or alongside implementation.
- Treat Markdown documents as the source of truth for future work.
- If the user says "document this" or "write this down", only update Markdown unless implementation is also requested.
- If the user says "add", "make", "implement", "fix", or otherwise asks for a game change, update Markdown and code together.
- Feature work can be implemented as a temporary functional version first. The user will refine design details, exact numbers, balance values, and presentation afterward.

## Documentation Map
- `docs/architecture.md`: Overall code structure, runtime flow, and how major systems connect.
- `docs/gameplay.md`: Core game rules, combat behavior, progression, and player-facing mechanics.
- `docs/content.md`: Characters, weapons, enemies, upgrades, map themes, and content IDs.
- `docs/balance.md`: Base stats, tunable values, and balance notes.
- `docs/assets.md`: Runtime asset paths, naming, and usage notes.
- `docs/task-notes.md`: Temporary implementations, follow-up polish, open decisions, and user-directed notes.

## Project Shape
- `src/main.tsx`: Main game file. Contains game types, constants, canvas rendering, simulation loop, React UI layers, character selection, weapon selection, HUD, and Supabase settings UI.
- `src/saveSystem.ts`: Save-data schema, normalization, run recording, and Supabase RPC wrappers.
- `src/soundSystem.ts`: Web Audio sound effects and title music.
- `src/supabaseClient.ts`: Supabase client creation from env vars or user-provided settings.
- `src/styles.css`: All layout, UI, and overlay styling.
- `public/assets`: Runtime images and sound assets used by canvas/UI.
- `supabase/save_schema.sql`: Database tables, RLS policies, PIN verification, and save RPC functions.

## Gameplay Flow
1. `AuthGate` wraps the app and optionally connects cloud save.
2. `GameApp` initializes selected character and weapon from save data or defaults.
3. Title layer is shown until the player presses start.
4. Character carousel selects a character.
5. Weapon carousel selects a weapon and starts the run.
6. `requestAnimationFrame` calls `updateGame()` and `drawGame()` continuously.
7. During combat, enemies spawn around the camera view, the player auto-shoots the nearest enemy, gems grant XP, and level-ups pause into upgrade selection.
8. On game over, `recordRun()` updates stats and `saveGameSave()` syncs cloud progress when connected.

## Main Game Concepts
- `GameState` is mutable and stored in `gameRef.current`; React state `snapshot` mirrors it for UI.
- Player movement comes from keyboard (`WASD`/arrows) plus pointer joystick.
- Combat is automatic: `shoot()` targets `nearestEnemy()`.
- World rendering is canvas-based; menus and HUD are React DOM overlays.
- Assets are referenced with paths under `assets/...` because Vite serves `public` from the web root.

## Editing Notes
- Be careful in `src/main.tsx`: it is large and mixes game logic, drawing, and UI. Search for the relevant function before editing.
- Keep changes focused. Avoid large refactors unless the task explicitly calls for it.
- If adding characters or weapons, update definitions, save defaults/unlocks if needed, selection UI slots, and related assets.
- If changing save shape, update `GameSaveData`, `createDefaultSaveData()`, and `normalizeSaveData()` together.
- If changing Supabase RPC behavior, update both `src/saveSystem.ts` and `supabase/save_schema.sql`.
- After gameplay or UI changes, run `npm.cmd run build` and check the local app in a browser.

## Current Content
- Character: `caiden`
- Weapon: `magic-staff`
- Enemy kind: `slime`
- Map theme: forest
- Save mode: local test by default, optional Supabase cloud save through security settings.
