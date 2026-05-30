# Content

## Current Content
- Character: `caiden`
- Weapon: `magic-staff`
- Enemy kinds: `slime`, `goblin`
- Map theme: forest
- Item: `xp-gem-small`
- Save mode: local test by default, optional Supabase cloud save through security settings.

## Characters
Characters are defined in `src/content/characters.ts` as `CharacterDefinition`.

Current character:
- `caiden`: Default playable character.

Current Caiden in-game movement art uses separate 8-frame walk atlases for `down`, `left`, and `up`. The `right` direction mirrors the left-facing atlas.

When adding a character, update:
- Character definition list.
- Save defaults and unlocks if the character should be selectable.
- Character selection grid slots.
- Character art assets and rendering if needed.

## Weapons
Weapons are defined in `src/content/weapons.ts` as `WeaponDefinition`.

Current weapon:
- `magic-staff`: Fires magic wave projectiles.

When adding a weapon, update:
- Weapon definition list.
- Save defaults and unlocks if the weapon should be selectable.
- Weapon selection grid slots.
- Weapon icon/projectile assets and rendering if needed.

## Enemies
Current enemy type:
- `slime`: Basic chasing enemy.
- `goblin`: Slower but tougher forest enemy. Appears from stage 2 onward.

Current enemy drops:
- `slime`: Drops 1 `xp-gem-small`.
- `goblin`: Drops 2 `xp-gem-small`.

Current enemy spawn rules:
- Stage 1 only spawns slimes.
- From stage 2 onward, goblins appear at about a 1 goblin per 3 slimes ratio.

Current enemy assets:
- `slime`: `public/assets/images/enemies/forest-slime-2dir.png`
- `goblin`: `public/assets/images/enemies/forest-goblin-2dir.png`
- `xp-gem-small`: XP and upgrade-currency gem rendered from `public/assets/images/items/gems/xp-gem-small.png`.

When adding enemies, update:
- Enemy type definitions.
- Spawn logic.
- Enemy stats and scaling.
- Enemy drawing logic.
- Any related assets.

## Upgrades
Upgrades are defined in `src/content/upgrades.ts` as upgrade families that generate `Upgrade` entries.

When the user asks to add a new upgrade mechanic, Codex should choose a fitting fantasy name and temporary tuning values, document the mechanic, and implement a functional first pass. Exact names, numbers, and presentation can be refined later.

In the current stage-based flow, upgrades are purchased in the waiting room with collected XP gems. Each upgrade family has 5 tiers. Tier names append Roman numerals `I`, `II`, `III`, `IV`, and `V`, and tier costs are `3`, `5`, `7`, `9`, and `11` gems.

Only the next unpurchased tier of each upgrade family can appear. For example, after buying `수호 결계 I`, the next offer for that family becomes `수호 결계 II`. Fully purchased families stop appearing.

Waiting-room choices can be rerolled. The first reroll costs 1 gem, and each reroll increases the next reroll cost by 1 during that waiting-room visit.

The player can buy multiple waiting-room upgrades as long as they have enough gems. Purchased choices are removed from the current offer list, and the next stage starts only when the player chooses to continue.

Because HP is fully restored when starting the next stage, direct healing and passive regeneration upgrades should not appear in the current first-pass pool.

Current upgrade families:
- `rapid`: `비전 속삭임`, faster fire rate.
- `damage`: `룬 각인`, more projectile damage.
- `projectile`: `쌍월 주문`, more projectiles.
- `speed`: `질풍 망토`, more movement speed.
- `magnet`: `수정 부름`, larger gem pickup range.
- `heart`: `성소의 축복`, more max HP.
- `pierce`: `관통의 룬`, more projectile pierce.
- `velocity`: `빠른 혜성`, faster projectile speed plus small damage.
- `barrier`: `수호 결계`, reduced damage taken.
- `knockback`: `충격 파동`, stronger projectile knockback.
- `overload`: `마력 과부하`, mixed damage and fire-rate increase.
- `range`: `별빛 사거리`, longer projectile lifetime and effective range.
- `splash`: `파열의 낙인`, splash damage when an enemy is defeated.
- `slow`: `서리 족쇄`, chance to slow enemies on hit.
- `thorns`: `거울 갑주`, reflection damage while enemies are touching the player.
- `dot`: `잔불 저주`, damage over time on hit.
- `homing`: `추적의 별`, projectiles steer toward enemies.
- `double-gem`: `탐욕의 별잔`, chance for collected gems to count double.

## Upgrade Pool Structure
Upgrades have a category field so future weapons can share some choices while also having category-specific choices. Cards currently display this category as a small badge.

Weapon categories:
- `ranged`: Weapons that attack from a distance with projectiles or beams.
- `melee`: Weapons that attack close to the player with swings, auras, cleaves, or short-range hit zones.

Upgrade pools:
- `common`: Can appear for any weapon category.
- `rangedOnly`: Can appear only when the selected weapon is in the `ranged` category.
- `meleeOnly`: Can appear only when the selected weapon is in the `melee` category.
- `utility`: Movement, economy, pickup, or control upgrades that are not tied to one attack style.

Current weapon category:
- `magic-staff`: `ranged`

Suggested common upgrade types:
- Max HP increase.
- Damage taken reduction.
- General damage increase if it can apply cleanly to all weapon categories.

Suggested utility upgrade types:
- Movement speed increase.
- Magnet range increase.
- Slows, economy bonuses, pickup bonuses, reroll support, and other non-weapon-specific systems.

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
