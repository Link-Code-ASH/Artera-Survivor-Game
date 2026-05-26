# Assets

## Runtime Asset Rule
Files under `public/assets` are served from the web root. Code should reference them without the `public/` prefix.

Example:
- File path: `public/assets/images/items/gems/xp-gem-small.png`
- Runtime path: `assets/images/items/gems/xp-gem-small.png`

## Item Assets

| Asset | File Path | Runtime Path | Used For |
| --- | --- | --- | --- |
| XP gem small | `public/assets/images/items/gems/xp-gem-small.png` | `assets/images/items/gems/xp-gem-small.png` | Dropped by defeated monsters. Grants XP and upgrade currency when collected. |

## UI Assets

| Asset | File Path | Runtime Path | Used For |
| --- | --- | --- | --- |
| Title screen | `public/assets/images/ui/title/title-v2.png` | `assets/images/ui/title/title-v2.png` | Portrait-first title screen background. |
| Character select background | None currently | CSS-drawn temporary background | The previous character selection background asset was removed. |
| Weapon select background | None currently | CSS-drawn temporary background | The previous weapon selection background asset was removed. |
| In-game status frame square | `public/assets/images/ui/in-game/status-frame-square.png` | `assets/images/ui/in-game/status-frame-square.png` | In-game control button frame. |
| In-game status frame wide | `public/assets/images/ui/in-game/status-frame-wide.png` | `assets/images/ui/in-game/status-frame-wide.png` | In-game timer and stage status frame. |
| In-game status frame very wide | `public/assets/images/ui/in-game/status-frame-very-wide.png` | `assets/images/ui/in-game/status-frame-very-wide.png` | In-game HP number frame. |
| Ability select background | None currently | Code-drawn canvas background | The previous waiting-room background asset was removed; use the temporary canvas-drawn background until a new portrait asset is added. |
| Ability select card frame | None currently | CSS-drawn horizontal cards | The previous card frame asset was removed; waiting-room ability cards are temporary horizontal code-drawn cards. |
| Ability reroll button | `public/assets/images/ui/button/btn-select-ability.png` | `assets/images/ui/button/btn-select-ability.png` | Waiting room reroll button. |
| Next stage button | `public/assets/images/ui/button/btn-select-next-stage.png` | `assets/images/ui/button/btn-select-next-stage.png` | Waiting room next-stage button. |

## Enemy Assets

| Asset | File Path | Runtime Path | Used For |
| --- | --- | --- | --- |
| Forest slime | `public/assets/images/enemies/forest-slime-2dir.png` | `assets/images/enemies/forest-slime-2dir.png` | Basic stage enemy. |
| Forest goblin | `public/assets/images/enemies/forest-goblin-2dir.png` | `assets/images/enemies/forest-goblin-2dir.png` | Slower, tougher stage enemy that appears after stage 1. |

## Notes
- XP gems are currently drawn on the canvas in `src/main.tsx`.
- If a gem image is not loaded yet, the code falls back to a simple drawn crystal shape.
- Future gem tiers should stay under `public/assets/images/items/gems/`.
