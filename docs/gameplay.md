# Gameplay

## Core Loop
Artera Survivor is a stage-based survival action game. The player moves around a bounded forest combat area while enemies spawn around the visible camera area and approach the player.

The main loop is:
1. Read movement input.
2. Move the player.
3. Spawn enemies over time.
4. Automatically shoot at the nearest enemy.
5. Move enemies and projectiles.
6. Resolve collisions and damage.
7. Pull nearby XP gems toward the player.
8. Clear the stage when the stage timer reaches its limit.
9. Move to the waiting room and choose an ability.
10. Start the next stage with the selected upgrade applied.
11. End the run when player HP reaches zero.

## Stage Structure
- The game should use fixed stages instead of one endless timer.
- The current first-pass stage duration is 30 seconds.
- Stage maps should have a limited size instead of behaving like an infinite world.
- Stage 1 is the baseline monster-count reference.
- Each new stage should spawn about 5% more monsters than the previous stage.
- When a stage ends, combat pauses and the player enters a waiting-room ability selection.
- The waiting room should use a temporary custom layout instead of the existing ability-select asset screen.
- When the next stage starts, player HP is fully restored.
- In the waiting room, the player can buy as many upgrades as their gems allow.
- Buying an upgrade should not automatically start the next stage.
- The player starts the next stage manually after finishing purchases.
- Exact stage duration, reward count, waiting-room presentation, and stage scaling can be tuned later.
9. End the run when player HP reaches zero.

## Player
- Movement uses keyboard (`WASD` or arrow keys) and pointer joystick.
- Attacking is automatic.
- The player faces the last movement direction.
- Player stats include HP, speed, damage, fire rate, projectile speed, projectile count, pierce, magnet range, knockback, and damage taken multiplier.

## Combat
- `shoot()` targets `nearestEnemy()`.
- Projectiles are fired toward the nearest enemy.
- Projectile count creates a small spread.
- Projectiles can pierce additional enemies depending on player pierce.
- Hits apply damage and knockback.

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
- The HUD should show how many XP gems have been collected.
- Ability choices are currently purchased in the waiting room at the end of each stage instead of interrupting combat immediately when XP reaches a threshold.
- The first-pass waiting room includes a no-purchase continue button so testing cannot get stuck when the player has too few gems.
- Waiting-room ability choices can be rerolled if the player dislikes the current options.
- Rerolling costs gems. The first reroll costs 1 gem, and the reroll cost increases by 1 each time it is used during that waiting-room visit.
- Since HP is fully restored between stages, upgrade choices should avoid direct healing effects unless a future design specifically brings them back.
- XP can remain as a progression resource for future systems.

## Game States
- `ready`: Run is prepared but not active.
- `running`: Game loop updates combat and movement.
- `paused`: Game is paused.
- `lounge`: Between-stage ability selection is active.
- `levelup`: Legacy upgrade selection state. Avoid using this for the stage-based flow unless it is intentionally revived.
- `gameover`: Run has ended and stats can be recorded.
