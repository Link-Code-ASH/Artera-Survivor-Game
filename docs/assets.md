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

## Notes
- XP gems are currently drawn on the canvas in `src/main.tsx`.
- If a gem image is not loaded yet, the code falls back to a simple drawn crystal shape.
- Future gem tiers should stay under `public/assets/images/items/gems/`.
