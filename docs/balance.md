# Balance

## Current Player Base Stats
These values are the current run-starting player stats created by `newGame()` in `src/game/state.ts`.

| Stat | Current Value | Notes |
| --- | ---: | --- |
| Position X | `0` | Starting world position. |
| Position Y | `0` | Starting world position. |
| Collision radius | `20` | Player body radius for collision checks. |
| HP | `100` | Starting current HP. |
| Max HP | `100` | Starting maximum HP. |
| Movement speed | `190` | Base movement speed before upgrades. |
| Damage taken multiplier | Character value | `caiden` currently uses `1`. Lower values mean less incoming damage. |
| Facing direction | `right` | Initial facing direction. |
| XP | `0` | Starting XP. |
| Next level XP | `18` | XP required for level 2. |
| Level | `1` | Starting level. |
| Magnet range | `82` | Range where gems start moving toward the player. |
| Fire rate | Weapon value | `magic-staff` currently uses `0.62` seconds. Lower values attack faster. |
| Projectile speed | Weapon value | `magic-staff` currently uses `530`. |
| Damage | Weapon value | `magic-staff` currently uses `18`. |
| Projectile count | Weapon value | `magic-staff` currently uses `1`. |
| Pierce | `0` | Extra enemy pierce count before upgrades. |
| Regeneration | `0` | HP recovered per second before upgrades. |
| Knockback | `18` | Push strength applied by player projectiles. |

## Current Character Base Stats
Characters currently define only character-specific modifiers. Shared player stats are still initialized in `newGame()`.

| Character ID | Name | Damage Taken Multiplier | Notes |
| --- | --- | ---: | --- |
| `caiden` | 케이든 | `1` | Default playable character. |

## Current Weapon Base Stats
Weapon stats are applied to the player at run start.

| Weapon ID | Name | Category | Fire Rate | Projectile Speed | Damage | Projectiles |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `magic-staff` | 마법 지팡이 | `ranged` | `0.62` | `530` | `18` | `1` |

## Notes For Future Character Stats
If characters become more distinct, consider moving more base stats into each character definition:
- Max HP.
- Movement speed.
- Magnet range.
- Damage taken multiplier.
- Regeneration.
- Starting level or XP modifiers.

Keep first-pass values easy to tune. Exact numbers can be adjusted after testing.

## Current Stage Values

| Value | Current Value | Notes |
| --- | ---: | --- |
| Starting stage | `1` | New runs begin at stage 1. |
| Stage duration | `30` seconds | First-pass value for the Brotato-style stage structure. |
| Stage timer | `0` | Resets when the next stage starts. |
| Map width | `2200` | First-pass bounded stage arena width. |
| Map height | `1600` | First-pass bounded stage arena height. |
| Stage transition HP | Full restore | HP is restored to max HP when starting the next stage. |

Stage difficulty currently scales from stage number and time inside the current stage. Exact stage length, enemy scaling, rewards, and recovery rules can be tuned after testing.

## Current Gem And Upgrade Values

| Value | Current Value | Notes |
| --- | ---: | --- |
| Slime gem drop count | `1` | Each defeated slime drops one XP gem object. |
| XP per gem | `4` | A collected gem grants XP. |
| Currency per gem | `1` | A collected gem also adds one upgrade currency. |
| Upgrade cost | `3` gems | First-pass shared cost for waiting-room upgrade purchases. |
| First reroll cost | `1` gem | Rerolls the current waiting-room upgrade choices. |
| Reroll cost increase | `+1` gem | Each reroll during the same waiting-room visit increases the next reroll cost by 1. |

These are temporary values for testing the 30-second stage loop. The user can tune costs, XP values, drop rates, and reward pacing later.

## Current Removed Or Avoided Upgrade Effects
- Direct current-HP healing is avoided because HP is restored between stages.
- Passive HP regeneration is removed from the first-pass upgrade pool for the same reason.

## Current Tuning Baseline
Use this section as the baseline when the user asks to raise, lower, speed up, slow down, weaken, or strengthen something. These are the current code values, not final balance targets.

### Player Movement And Body

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Player movement speed | `190` | `src/game/state.ts` | Base speed before upgrades. |
| Player collision radius | `20` | `src/game/state.ts` | Used for enemy contact and gem pickup collision. |
| Starting HP | `100` | `src/game/state.ts` | Current HP at run start. |
| Max HP | `100` | `src/game/state.ts` | Restored to full when starting the next stage. |
| Damage taken multiplier | `1` | `src/content/characters.ts` | Character-based defense modifier. Lower is tougher. |
| Magnet range | `82` | `src/game/state.ts` | Gems start moving toward the player inside this range. |

### Player Weapon And Projectile

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Weapon ID | `magic-staff` | `src/content/weapons.ts` | Current starting weapon. |
| Weapon category | `ranged` | `src/content/weapons.ts` | Used for future upgrade pool filtering. |
| Fire rate | `0.62` seconds | `src/content/weapons.ts` | Lower means faster attacks. |
| Projectile speed | `530` | `src/content/weapons.ts` | Projectile movement speed. |
| Projectile damage | `18` | `src/content/weapons.ts` | Damage per hit before upgrades. |
| Projectile count | `1` | `src/content/weapons.ts` | Number fired per attack before upgrades. |
| Projectile lifetime | `1.15` seconds | `src/game/systems.ts` | Projectile disappears after this time. |
| Projectile hit radius | `5` | `src/game/systems.ts` | Hit check uses enemy radius plus this value. |
| Projectile pierce | `0` | `src/game/state.ts` | Extra pierce before upgrades. |
| Projectile knockback | `18` | `src/game/state.ts` | Base push strength before upgrades. |
| Multi-projectile spread | `0.22` radians | `src/game/systems.ts` | Used when projectile count is above 1. |

### Enemy: Slime

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Enemy ID | `slime` | `src/game/types.ts`, `src/game/systems.ts` | Current only enemy kind. |
| Collision radius | `13` | `src/game/systems.ts` | Enemy body radius. |
| Base HP | `28` | `src/game/systems.ts` | Before stage scaling. |
| HP scaling | `+8 * stagePower` | `src/game/systems.ts` | `stagePower = stage - 1 + stageTime / stageDuration`. |
| Base movement speed | `88` | `src/game/systems.ts` | Before stage scaling. |
| Speed scaling | `+7 * stagePower` | `src/game/systems.ts` | Uses the same `stagePower`. |
| Contact damage base | `12` per second | `src/game/systems.ts` | Applied while touching the player. |
| Contact damage scaling | `+0.12 * totalRunTime` per second | `src/game/systems.ts` | Multiplied by player damage taken multiplier. |
| Contact pushback | `18 * dt` | `src/game/systems.ts` | Small separation push while touching player. |
| Defense | None | Current design | Enemies currently do not have armor or damage reduction. |

### Spawning And Stage Pressure

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Stage duration | `30` seconds | `src/game/state.ts` | Current first-pass stage length. |
| Map width | `2200` | `src/game/state.ts` | Bounded arena width. |
| Map height | `1600` | `src/game/state.ts` | Bounded arena height. |
| Spawn margin | `90` | `src/game/systems.ts` | Spawn attempt is just outside the camera view. |
| Minimum spawn delay | `0.16` seconds | `src/game/systems.ts` | Spawn delay cannot go below this. |
| Spawn delay formula | `0.76 - (stage - 1) * 0.06 - stageTime * 0.002` | `src/game/systems.ts` | Higher stages and later stage time spawn faster. |
| Enemy cleanup range | `1800` | `src/game/systems.ts` | Enemies farther than this from player are removed. |
| Projectile cleanup range | `1300` | `src/game/systems.ts` | Projectiles farther than this from player are removed. |

### Gems, XP, And Currency

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Gem drop count per slime | `1` | `src/game/systems.ts` | One gem object is created when a slime dies. |
| Gem XP value | `4` | `src/game/systems.ts` | Stored as gem `value`. |
| Gem currency value | `1` | `src/game/systems.ts` | Each collected gem adds 1 upgrade currency. |
| Gem collision radius | `5` | `src/game/systems.ts` | Gem pickup radius before adding player radius. |
| Gem visual size | `gem radius * 4.83` | `src/main.tsx` | Image draw size only. Pickup collision is unchanged. |
| Gem pull minimum speed | `120` | `src/game/systems.ts` | Magnet pull speed lower clamp. |
| Gem pull maximum speed | `520` | `src/game/systems.ts` | Magnet pull speed upper clamp. |
| Gem pull formula | `360 - distance` | `src/game/systems.ts` | Clamped between `120` and `520`. |
| XP required for level 2 | `18` | `src/game/state.ts` | XP still exists as a progression resource. |
| XP requirement scaling | `nextXp * 1.28 + 7` | `src/game/systems.ts` | Rounded down with `Math.floor`. |

### Waiting Room Economy

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Upgrade choices shown | `3` | `src/game/systems.ts` | Current offer count after stage clear or reroll. |
| Shared upgrade cost | `3` gems | `src/content/upgrades.ts` | All upgrades currently cost the same. |
| First reroll cost | `1` gem | `src/game/state.ts` | Resets each waiting-room visit. |
| Reroll cost increase | `+1` | `src/game/systems.ts` | Added after each successful reroll. |
| Stage transition healing | Full HP | `src/game/systems.ts` | Starting next stage sets HP to max HP. |

### Current Upgrade Effects

| Upgrade ID | Current Effect | Cost | Notes |
| --- | --- | ---: | --- |
| `rapid` | Fire rate `* 0.84`, minimum `0.18` | `3` | Lower fire rate means faster attacks. |
| `damage` | Damage `+7` | `3` | Adds flat projectile damage. |
| `projectile` | Projectile count `+1` | `3` | Adds one projectile per attack. |
| `speed` | Movement speed `+18` | `3` | Adds flat movement speed. |
| `magnet` | Magnet range `+34` | `3` | Pulls gems from farther away. |
| `heart` | Max HP `+22` | `3` | Does not heal current HP immediately. |
| `pierce` | Pierce `+1` | `3` | Lets projectiles hit more enemies. |
| `velocity` | Projectile speed `+95`, damage `+3` | `3` | Mixed projectile upgrade. |
| `barrier` | Damage taken multiplier `* 0.86`, minimum `0.45` | `3` | Lower incoming damage. |
| `knockback` | Knockback `+20` | `3` | Pushes enemies harder. |
| `overload` | Damage `+5`, fire rate `* 0.9`, minimum `0.18` | `3` | Mixed damage and attack speed upgrade. |
