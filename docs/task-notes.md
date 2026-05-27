# Task Notes

## Collaboration Model
The user describes desired game behavior, content, balance, and presentation in natural language.

For feature requests:
1. Update the relevant Markdown document.
2. Implement the requested behavior in code.
3. Prefer a temporary functional version first when exact design, numbers, or polish are not specified.
4. Leave the implementation easy for the user to review and tune afterward.

For documentation-only requests:
1. Update Markdown only.
2. Do not change code unless the user also asks for implementation.

## Temporary Implementation Policy
Temporary implementations are acceptable for:
- First-pass gameplay mechanics.
- Placeholder UI behavior.
- Initial balance numbers.
- Basic content wiring.
- Simple visuals that prove the feature works.

The user may later refine:
- Exact stats and timings.
- Visual design.
- Names and descriptions.
- Animation and effects.
- Balance and difficulty.

## Open Notes
- Keep `AGENTS.md` as the project entry point.
- Add more specialized docs only when the project needs them.
- Likely future docs: `save-system.md`, `ui-flow.md`, `assets.md`, and `balance.md`.
- Upgrade choices now have category badges: common, ranged-only, melee-only, and utility.
- The game direction is now stage-based like Brotato: each stage lasts about 60 seconds, then the player purchases an ability with collected XP gems in a waiting-room flow before the next stage.
- Code structure has started moving away from one large `src/main.tsx`: content now lives in `src/content/`, shared types and gameplay systems live in `src/game/`.
- Waiting-room upgrade choices now need a reroll flow: spend gems to redraw choices, with the cost increasing by 1 per reroll during the same visit.
- Stage maps are now bounded rather than infinite. Starting a new stage restores HP to full, and waiting-room upgrades can be purchased multiple times before manually continuing.
- Stage spawn pacing is now explicit: the current stage 1 monster count is the baseline, then each stage increases monster count by 5% over the previous stage.
