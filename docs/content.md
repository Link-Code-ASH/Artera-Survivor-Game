# Content

## Current Content
- Character: `caiden`
- Weapon: `magic-staff`
- Enemy kind: `slime`
- Map theme: forest
- Item: `xp-gem-small`
- Save mode: local test by default, optional Supabase cloud save through security settings.

## Characters
Characters are defined in `src/content/characters.ts` as `CharacterDefinition`.

Current character:
- `caiden`: Default playable character.

When adding a character, update:
- Character definition list.
- Save defaults and unlocks if the character should be selectable.
- Character selection slots.
- Character art assets and rendering if needed.

## Weapons
Weapons are defined in `src/content/weapons.ts` as `WeaponDefinition`.

Current weapon:
- `magic-staff`: Fires magic wave projectiles.

When adding a weapon, update:
- Weapon definition list.
- Save defaults and unlocks if the weapon should be selectable.
- Weapon selection slots.
- Weapon icon/projectile assets and rendering if needed.

## Enemies
Current enemy type:
- `slime`: Basic chasing enemy.

Current slime drop:
- `xp-gem-small`: XP and upgrade-currency gem rendered from `public/assets/images/items/gems/xp-gem-small.png`.

When adding enemies, update:
- Enemy type definitions.
- Spawn logic.
- Enemy stats and scaling.
- Enemy drawing logic.
- Any related assets.

## Upgrades
Upgrades are defined in `src/content/upgrades.ts` as `Upgrade`.

In the current stage-based flow, upgrades are purchased in the waiting room with collected XP gems. The first-pass implementation uses a shared gem cost for all upgrades so the loop can be tested before final balance and rarity rules are designed.

Waiting-room choices can be rerolled. The first reroll costs 1 gem, and each reroll increases the next reroll cost by 1 during that waiting-room visit.

The player can buy multiple waiting-room upgrades as long as they have enough gems. Purchased choices are removed from the current offer list, and the next stage starts only when the player chooses to continue.

Because HP is fully restored when starting the next stage, direct healing and passive regeneration upgrades should not appear in the current first-pass pool.

Current upgrade effects include:
- Faster fire rate.
- More damage.
- More projectiles.
- More movement speed.
- Larger magnet range.
- More max HP.
- More pierce.
- Faster projectile speed.
- Reduced damage taken.
- More knockback.
- Mixed damage and fire rate increase.

## Upgrade Pool Structure
Upgrades should be organized by weapon category so future weapons can share some choices while also having category-specific choices.

Weapon categories:
- `ranged`: Weapons that attack from a distance with projectiles or beams.
- `melee`: Weapons that attack close to the player with swings, auras, cleaves, or short-range hit zones.

Upgrade pools:
- `common`: Can appear for any weapon category.
- `rangedOnly`: Can appear only when the selected weapon is in the `ranged` category.
- `meleeOnly`: Can appear only when the selected weapon is in the `melee` category.

Current weapon category:
- `magic-staff`: `ranged`

Suggested common upgrade types:
- Max HP increase.
- Movement speed increase.
- Magnet range increase.
- Damage taken reduction.
- General damage increase if it can apply cleanly to all weapon categories.

Suggested ranged-only upgrade types:
- Projectile count increase.
- Projectile speed increase.
- Fire rate increase.
- Projectile pierce increase.
- Projectile spread or targeting behavior changes.

Suggested melee-only upgrade types:
- Attack area increase.
- Attack arc or coverage increase.
- Swing speed increase.
- Hit count or multi-strike increase.
- Close-range knockback or stun increase.

When implementing this structure, keep the first version functional and easy to tune. Exact upgrade names, descriptions, values, and presentation can be refined later.

## Content ID Notes
Use stable lowercase IDs for save-related content. Existing examples are `caiden` and `magic-staff`.
