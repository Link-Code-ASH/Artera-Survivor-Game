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
| Next level XP | `18` | Stored for future systems; XP leveling is currently disabled. |
| Level | `1` | Starting level; currently does not increase from XP. |
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
| Stage duration | `15` seconds | First-pass value for the Brotato-style stage structure. |
| Stage timer | `0` | Resets when the next stage starts. |
| Stage clear pause | `1.2` seconds | Short delay before the waiting room appears. |
| Map width | `1360` | Portrait-first bounded stage arena width. |
| Map height | `1870` | Portrait-first bounded stage arena height. |
| Stage transition HP | Full restore | HP is restored to max HP when starting the next stage. |

Stage difficulty currently scales from stage number and time inside the current stage. Exact stage length, enemy scaling, rewards, and recovery rules can be tuned after testing.

## Current Gem And Upgrade Values

| Value | Current Value | Notes |
| --- | ---: | --- |
| Slime gem drop count | `1` | Each defeated slime drops one XP gem object. |
| XP per gem | `4` | A collected gem grants XP. |
| Currency per gem | `1` | A collected gem also adds one upgrade currency. |
| Upgrade tier costs | `3`, `5`, `7`, `9`, `11` gems | Costs for tiers I through V. |
| First reroll cost | `1` gem | Rerolls the current waiting-room upgrade choices. |
| Reroll cost increase | `+1` gem | Each reroll during the same waiting-room visit increases the next reroll cost by 1. |

These are temporary values for testing the 15-second stage loop. The user can tune costs, XP values, drop rates, and reward pacing later.

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
| Projectile lifetime | `1.15` seconds | `src/game/state.ts` | Base lifetime before range upgrades. |
| Projectile homing | `0` | `src/game/state.ts` | No steering before upgrades. |
| Splash damage | `0` | `src/game/state.ts` | No on-kill splash before upgrades. |
| Slow chance | `0` | `src/game/state.ts` | No slow on hit before upgrades. |
| Reflection damage | `0` | `src/game/state.ts` | No contact reflection before upgrades. |
| Damage over time | `0` | `src/game/state.ts` | No DOT before upgrades. |
| Double gem chance | `0` | `src/game/state.ts` | Gem pickups count normally before upgrades. |
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

### Enemy: Goblin

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Enemy ID | `goblin` | `src/game/types.ts`, `src/game/systems.ts` | Appears from stage 2 onward. |
| Spawn ratio | `1 goblin : 3 slimes` | `src/game/systems.ts` | Implemented as a 25% goblin chance from stage 2 onward. |
| Collision radius | `15` | `src/game/systems.ts` | Slightly larger than slime. |
| HP | `slime HP * 2` | `src/game/systems.ts` | Uses the current scaled slime HP. |
| Movement speed | `slime speed * 0.8` | `src/game/systems.ts` | Slower than slime. |
| Contact damage | `slime damage * 1.5` | `src/game/systems.ts` | Higher than slime. |
| Gem drop count | `2` | `src/game/systems.ts` | Drops two XP/currency gems when defeated. |
| Defense | None | Current design | Enemies currently do not have armor or damage reduction. |

### Spawning And Stage Pressure

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Stage duration | `15` seconds | `src/game/state.ts` | Current first-pass stage length. |
| Map width | `1360` | `src/game/state.ts` | Bounded portrait arena width. |
| Map height | `1870` | `src/game/state.ts` | Bounded portrait arena height. |
| Spawn margin | `90` | `src/game/systems.ts` | Spawn attempt is just outside the camera view. |
| Minimum spawn delay | `0.16` seconds | `src/game/systems.ts` | Spawn delay cannot go below this. |
| Stage 1 spawn amount | `100%` current baseline | `src/game/systems.ts` | This is the baseline for future spawn-count requests. |
| Per-stage spawn growth | `+5%` per stage | `src/game/systems.ts` | Each stage uses `1.05 ^ (stage - 1)`. |
| Spawn delay formula | `(1.0857 - stageTime * 0.002) / (1.05 ^ (stage - 1))` | `src/game/systems.ts` | Current stage 1 pacing is now treated as the baseline. Higher spawn multiplier means shorter delay and more monsters. |
| Enemy cleanup range | `1800` | `src/game/systems.ts` | Enemies farther than this from player are removed. |
| Projectile cleanup range | `1300` | `src/game/systems.ts` | Projectiles farther than this from player are removed. |

### Gems, XP, And Currency

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Gem drop count per slime | `1` | `src/game/systems.ts` | One gem object is created when a slime dies. |
| Gem drop count per goblin | `2` | `src/game/systems.ts` | Two gem objects are created when a goblin dies. |
| Gem XP value | `4` | `src/game/systems.ts` | Stored as gem `value`. |
| Gem currency value | `1` | `src/game/systems.ts` | Each collected gem adds 1 upgrade currency. |
| Gem collision radius | `5` | `src/game/systems.ts` | Gem pickup radius before adding player radius. |
| Gem visual size | `gem radius * 4.83` | `src/main.tsx` | Image draw size only. Pickup collision is unchanged. |
| Gem pull minimum speed | `120` | `src/game/systems.ts` | Magnet pull speed lower clamp. |
| Gem pull maximum speed | `520` | `src/game/systems.ts` | Magnet pull speed upper clamp. |
| Gem pull formula | `360 - distance` | `src/game/systems.ts` | Clamped between `120` and `520`. |
| XP required for level 2 | `18` | `src/game/state.ts` | Stored for future systems only. |
| XP requirement scaling | Disabled | `src/game/systems.ts` | XP no longer increases level, plays level-up sound, shows level-up text, or changes stats. |

### Waiting Room Economy

| Value | Current Value | Code Location | Notes |
| --- | ---: | --- | --- |
| Upgrade choices shown | `3` | `src/game/systems.ts` | Current offer count after stage clear or reroll. |
| Upgrade family count | `18` | `src/content/upgrades.ts` | Each family has five tiers. |
| Upgrade tiers per family | `5` | `src/content/upgrades.ts` | Tiers are displayed as Roman numerals I through V. |
| Upgrade tier costs | `3`, `5`, `7`, `9`, `11` gems | `src/content/upgrades.ts` | Costs increase by tier. |
| Upgrade offer rule | Next tier only | `src/content/upgrades.ts` | Maxed families stop appearing. |
| First reroll cost | `1` gem | `src/game/state.ts` | Resets each waiting-room visit. |
| Reroll cost increase | `+1` | `src/game/systems.ts` | Added after each successful reroll. |
| Stage transition healing | Full HP | `src/game/systems.ts` | Starting next stage sets HP to max HP. |

### Current Upgrade Effects

All upgrade families have five tiers. Cost by tier is `I = 3`, `II = 5`, `III = 7`, `IV = 9`, and `V = 11`.

| Upgrade ID | Name | Per-Tier Effect | Notes |
| --- | --- | --- | --- |
| `rapid` | `비전 속삭임` | Fire rate `* 0.94`, minimum `0.18`. | Lower fire rate means faster attacks. |
| `damage` | `룬 각인` | Damage `+5 + tier * 2`. | Adds flat projectile damage. |
| `projectile` | `쌍월 주문` | Projectile count `+1`. | Adds one projectile per attack. |
| `speed` | `질풍 망토` | Movement speed `+12 + tier * 3`. | Adds flat movement speed. |
| `magnet` | `수정 부름` | Magnet range `+24 + tier * 6`. | Pulls gems from farther away. |
| `heart` | `성소의 축복` | Max HP `+16 + tier * 4`. | Does not heal current HP immediately. |
| `pierce` | `관통의 룬` | Pierce `+1`. | Lets projectiles hit more enemies. |
| `velocity` | `빠른 혜성` | Projectile speed `+70 + tier * 15`, damage `+tier + 1`. | Mixed projectile upgrade. |
| `barrier` | `수호 결계` | Damage taken multiplier `* 0.92`, minimum `0.45`. | Lower incoming damage. |
| `knockback` | `충격 파동` | Knockback `+14 + tier * 3`. | Pushes enemies harder. |
| `overload` | `마력 과부하` | Damage `+3 + tier * 2`, fire rate `* 0.96`, minimum `0.18`. | Mixed damage and attack speed upgrade. |
| `range` | `별빛 사거리` | Projectile lifetime `+0.12 + tier * 0.03` seconds. | Increases effective range. |
| `splash` | `파열의 낙인` | Splash damage `+10 + tier * 5`, radius at least `76 + tier * 8`. | Triggers when an enemy is defeated. |
| `slow` | `서리 족쇄` | Slow chance `+0.18 + tier * 0.02`, up to `0.75`; duration at least `1 + tier * 0.15` seconds. | Slows enemies on hit. |
| `thorns` | `거울 갑주` | Reflection damage `+10 + tier * 4` per second while touching enemies. | Damages enemies during contact. |
| `dot` | `잔불 저주` | DOT damage `+3 + tier * 2` per second; duration at least `2 + tier * 0.2` seconds. | Applies on projectile hit. |
| `homing` | `추적의 별` | Homing strength `+0.18 + tier * 0.04`, up to `0.9`. | Projectiles steer toward enemies. |
| `double-gem` | `탐욕의 별잔` | Double gem chance `+0.08 + tier * 0.04`, up to `0.75`. | Picked-up gems can count as two. |
