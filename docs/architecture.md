# Architecture

## Overview
Artera Survivor is a Vite + React game with canvas-based gameplay rendering and React DOM overlays for menus, HUD, save settings, and selection screens.

The project started as a single-file prototype, but core data and gameplay logic are now split into focused folders.

`src/main.tsx` still contains:
- Runtime image loading.
- Canvas draw functions.
- The `GameApp` React component.
- The `AuthGate` React component for optional Supabase cloud save setup.
- DOM overlay rendering for HUD, title, selection, upgrade, and security UI.

## Runtime Flow
1. `src/main.tsx` renders `AuthGate`.
2. `AuthGate` reads stored Supabase settings and either prepares a cloud save session or runs the game in local test mode.
3. `GameApp` creates the mutable `GameState` in `gameRef.current`.
4. A `requestAnimationFrame` loop calls `updateGame()` and `drawGame()`.
5. React state `snapshot` mirrors the mutable game state for HUD and overlay rendering.

## System Boundaries
- `src/main.tsx`: Rendering, screen flow, input wiring, and most UI logic.
- `src/game/types.ts`: Shared game, content, and runtime state types.
- `src/game/state.ts`: New run creation and base player stats.
- `src/game/systems.ts`: Combat loop, enemy spawning, XP, stage completion, upgrade application, and per-frame game updates.
- `src/game/camera.ts`: Camera scale, world view, and camera position helpers.
- `src/game/math.ts`: Small math helpers used by gameplay and rendering.
- `src/content/characters.ts`: Character definitions and character display helpers.
- `src/content/weapons.ts`: Weapon definitions and weapon display helpers.
- `src/content/upgrades.ts`: Upgrade definitions and upgrade effects.
- `src/content/index.ts`: Re-exports content modules for easier imports.
- `src/saveSystem.ts`: Save data structure, normalization, run stat recording, and Supabase RPC calls.
- `src/soundSystem.ts`: Web Audio sound effects. Background music is currently disabled.
- `src/supabaseClient.ts`: Supabase client creation.
- `src/styles.css`: App layout, menus, HUD, overlays, and selection screen styling.
- `public/assets`: Images and sounds served from the web root.
- `supabase/save_schema.sql`: Cloud save database schema and RPC functions.

## State Model
- `GameState` is mutable and stored in `gameRef.current`.
- React state is used for UI-facing snapshots and selection state.
- Game logic should update `gameRef.current` first, then call `syncSnapshot()` when UI should reflect changes.
- New gameplay systems should usually live in `src/game/` instead of being added directly to `src/main.tsx`.
- New content definitions should usually live in `src/content/`.

## Rendering Model
- The world, player, enemies, projectiles, gems, and center messages are drawn on canvas.
- Title, character selection, weapon selection, HUD, controls, level-up cards, joystick, and security settings are DOM overlays.
- The security settings toggle should only be exposed from the title screen so gameplay and selection screens stay clean.
- The UI baseline is now portrait smartphone orientation. Desktop and laptop displays should present the game inside a centered portrait play area instead of treating landscape as the primary layout.

## Implementation Preference
Keep new work compatible with the split structure. Temporary functional implementations are acceptable when they make later user tuning easier.
