# Gameplay

## Core Loop
Artera Survivor is a stage-based survival action game. The player moves around a bounded forest combat area while enemies spawn around the visible camera area and approach the player.

The title screen is the only place that exposes the security settings toggle. After leaving the title screen, gameplay and selection screens should avoid developer/status clutter unless the user asks for it.
Pressing the title start button should request fullscreen before moving into selection.

The main loop is:
1. Read movement input.
2. Move the player.
3. Spawn enemies over time.
4. Automatically shoot at the nearest enemy.
5. Move enemies and projectiles.
6. Resolve collisions and damage.
7. Pull nearby XP gems toward the player.
8. Clear the stage when the stage timer reaches its limit.
9. Show a short stage-clear pause, then move to the waiting room and choose an ability.
10. Start the next stage with the selected upgrade applied.
11. End the run when player HP reaches zero.

## Stage Structure
- The game should use fixed stages instead of one endless timer.
- The current first-pass stage duration is 30 seconds.
- Stage maps should have a limited size instead of behaving like an infinite world.
- Stage 1 is the baseline monster-count reference.
- Each new stage should spawn about 5% more monsters than the previous stage.
- When a stage ends, combat pauses in a `stageClear` state for about 1.2 seconds before the waiting-room ability selection appears.
- The waiting room is currently a temporary code-drawn fantasy screen because the previous ability background asset was removed.
- Waiting-room ability choices should be portrait-first: three horizontal card rows stacked vertically, with Korean title/body text contained inside each card.
- Waiting-room action buttons use `btn-select-ability.png` for reroll and `btn-select-next-stage.png` for advancing, and should sit at the bottom of the portrait screen.
- When the next stage starts, player HP is fully restored.
- In the waiting room, the player can buy as many upgrades as their gems allow.
- Buying an upgrade should not automatically start the next stage.
- The player starts the next stage manually after finishing purchases.
- Exact stage duration, reward count, waiting-room presentation, and stage scaling can be tuned later.
- The waiting-room panel should feel like it rises in from the bottom instead of appearing abruptly.

## Player
- Movement uses keyboard (`WASD` or arrow keys) and pointer joystick.
- Attacking is automatic.
- The player faces the last movement direction.
- Player stats include HP, speed, damage, fire rate, projectile speed, projectile count, pierce, magnet range, knockback, and damage taken multiplier.
- Character selection is portrait-first and uses a simple two-column card grid. Characters should be selected directly from the visible list instead of through a draggable carousel.
- Weapon selection follows the same portrait-first two-column card grid pattern, with weapons selected directly from the visible list.
- The combat HUD shows six top-row frames: HP, stage, collected gems, timer, pause/start, and fullscreen. HP is shown as `current / max`, gem count uses the XP gem icon, and helper labels stay hidden.
- When the stage timer reaches the final 5 seconds, the remaining-time number turns red and shakes lightly.
- The waiting room should hide combat-only HUD elements, including remaining time, stage, HP, and run control buttons.

## Combat
- `shoot()` targets `nearestEnemy()`.
- Projectiles are fired toward the nearest enemy.
- Projectile count creates a small spread.
- Projectiles can pierce additional enemies depending on player pierce.
- Hits apply damage and knockback.
- Upgrade effects can extend combat with longer projectile range, splash damage on enemy defeat, slow on hit, contact reflection damage, damage over time, homing projectile steering, and a chance for gem pickups to count double.

## Enemies
- Enemies spawn just outside the camera view.
- Spawn delay decreases as run time increases.
- Current enemy type: `slime`.
- Enemy HP and speed increase gradually with time.

## Experience And Level-Up
- Defeated enemies drop gems.
- Gems are pulled toward the player within magnet range.
- Collecting gems grants XP.
- Collected gems also act as upgrade purchase currency.
- XP leveling is currently disabled. Collecting gems may still store XP for future systems, but it must not increase level, trigger level-up sounds/text, or change stats.
- The combat HUD should stay minimal. Enemy count, upgrade currency, and local/cloud save status should stay hidden from the main play screen unless explicitly requested.
- Ability choices are currently purchased in the waiting room at the end of each stage instead of interrupting combat immediately when XP reaches a threshold.
- Ability choices are tiered by family. Each family has five tiers marked with Roman numerals `I` through `V`.
- Tier costs are `3`, `5`, `7`, `9`, and `11` gems.
- Only the next available tier of a family can appear, so buying `비전 속삭임 I` unlocks `비전 속삭임 II` for future offers.
- The first-pass waiting room includes a no-purchase continue button so testing cannot get stuck when the player has too few gems.
- Waiting-room ability choices can be rerolled if the player dislikes the current options.
- Rerolling costs gems. The first reroll costs 1 gem, and the reroll cost increases by 1 each time it is used during that waiting-room visit.
- Waiting-room ability costs and reroll costs should use the XP gem image instead of spelling out the currency word in the card/button UI.
- Since HP is fully restored between stages, upgrade choices should avoid direct healing effects unless a future design specifically brings them back.
- XP can remain as a progression resource for future systems.

## Game States
- `ready`: Run is prepared but not active.
- `running`: Game loop updates combat and movement.
- `paused`: Game is paused.
- `stageClear`: Combat has ended and the game is waiting briefly before opening the waiting room.
- `lounge`: Between-stage ability selection is active.
- `levelup`: Legacy upgrade selection state. Avoid using this for the stage-based flow unless it is intentionally revived.
- `gameover`: Run has ended and stats can be recorded.
