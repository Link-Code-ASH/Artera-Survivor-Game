import { upgrades } from '../content';
import { playSound } from '../soundSystem';
import { getCamera, getWorldView } from './camera';
import { clamp, norm } from './math';
import type { EnemyKind, GameState, Upgrade, Vec } from './types';

export function pickUpgrades(game: GameState) {
  game.upgrades = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function completeStage(game: GameState) {
  game.status = 'lounge';
  game.stageTime = game.stageDuration;
  game.rerollCost = 1;
  game.enemies = [];
  game.bullets = [];
  game.gems = [];
  game.texts.push({ x: game.player.x, y: game.player.y - 30, text: `STAGE ${game.stage} CLEAR`, life: 1.2, color: '#f8dc86' });
  pickUpgrades(game);
  playSound('levelup');
}

export function startNextStage(game: GameState) {
  game.stage += 1;
  game.stageTime = 0;
  game.rerollCost = 1;
  game.player.hp = game.player.maxHp;
  game.spawnClock = 0;
  game.shootClock = 0;
  game.upgrades = [];
  game.status = 'running';
}

export function applyUpgrade(game: GameState, upgrade: Upgrade) {
  if (game.status === 'lounge') {
    if (game.player.upgradeCurrency < upgrade.cost) {
      game.texts.push({ x: game.player.x, y: game.player.y - 34, text: 'NOT ENOUGH GEMS', life: 0.9, color: '#ffb4a8' });
      playSound('button');
      return false;
    }
    game.player.upgradeCurrency -= upgrade.cost;
  }
  upgrade.apply(game);
  if (game.status === 'lounge') {
    game.upgrades = game.upgrades.filter((candidate) => candidate.id !== upgrade.id);
  } else {
    game.upgrades = [];
    game.status = 'running';
  }
  return true;
}

export function rerollUpgrades(game: GameState) {
  if (game.status !== 'lounge') return false;
  if (game.player.upgradeCurrency < game.rerollCost) {
    game.texts.push({ x: game.player.x, y: game.player.y - 34, text: 'NOT ENOUGH GEMS', life: 0.9, color: '#ffb4a8' });
    playSound('button');
    return false;
  }

  game.player.upgradeCurrency -= game.rerollCost;
  game.rerollCost += 1;
  pickUpgrades(game);
  playSound('slide');
  return true;
}

function spawnEnemy(game: GameState) {
  const camera = getCamera(game);
  const view = getWorldView(game);
  const margin = 90;
  const side = Math.floor(Math.random() * 4);
  const pos = { x: game.player.x, y: game.player.y };
  if (side === 0) {
    pos.x = camera.x - margin;
    pos.y = camera.y + Math.random() * view.height;
  } else if (side === 1) {
    pos.x = camera.x + view.width + margin;
    pos.y = camera.y + Math.random() * view.height;
  } else if (side === 2) {
    pos.x = camera.x + Math.random() * view.width;
    pos.y = camera.y - margin;
  } else {
    pos.x = camera.x + Math.random() * view.width;
    pos.y = camera.y + view.height + margin;
  }
  pos.x = clamp(pos.x, -game.mapWidth / 2 + 24, game.mapWidth / 2 - 24);
  pos.y = clamp(pos.y, -game.mapHeight / 2 + 24, game.mapHeight / 2 - 24);
  const stagePower = game.stage - 1 + game.stageTime / game.stageDuration;
  const kind: EnemyKind = game.stage > 1 && Math.random() < 0.25 ? 'goblin' : 'slime';
  const slimeHp = 28 + stagePower * 8;
  const slimeSpeed = 88 + stagePower * 7;
  const slimeDamage = 12 + game.time * 0.12;
  const isGoblin = kind === 'goblin';
  game.enemies.push({
    id: game.nextId++,
    x: pos.x,
    y: pos.y,
    r: isGoblin ? 15 : 13,
    hp: isGoblin ? slimeHp * 2 : slimeHp,
    speed: isGoblin ? slimeSpeed * 0.8 : slimeSpeed,
    damage: isGoblin ? slimeDamage * 1.5 : slimeDamage,
    gemDrops: isGoblin ? 2 : 1,
    kind,
  });
}

function nearestEnemy(game: GameState) {
  let target = undefined;
  let best = Infinity;
  for (const enemy of game.enemies) {
    const d = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
    if (d < best) {
      best = d;
      target = enemy;
    }
  }
  return target;
}

function shoot(game: GameState) {
  const target = nearestEnemy(game);
  if (!target) return;
  playSound('shoot');
  game.player.attackTimer = 0.22;
  const base = Math.atan2(target.y - game.player.y, target.x - game.player.x);
  const count = game.player.projectiles;
  const spread = count === 1 ? 0 : 0.22;
  for (let i = 0; i < count; i += 1) {
    const angle = base + (i - (count - 1) / 2) * spread;
    game.bullets.push({
      x: game.player.x,
      y: game.player.y,
      vx: Math.cos(angle) * game.player.bulletSpeed,
      vy: Math.sin(angle) * game.player.bulletSpeed,
      life: 1.15,
      damage: game.player.damage,
      pierce: game.player.pierce,
      knockback: game.player.knockback,
      hitIds: [],
    });
  }
}

function gainXp(game: GameState, amount: number) {
  game.player.xp += amount;
  while (game.player.xp >= game.player.nextXp) {
    game.player.xp -= game.player.nextXp;
    game.player.level += 1;
    game.player.nextXp = Math.floor(game.player.nextXp * 1.28 + 7);
    game.texts.push({ x: game.player.x, y: game.player.y - 30, text: 'LEVEL UP', life: 1, color: '#f8dc86' });
    playSound('levelup');
    break;
  }
}

export function updateGame(game: GameState, dt: number, inputVector: () => Vec) {
  if (game.status !== 'running') return;
  game.time += dt;
  game.stageTime += dt;

  const move = inputVector();
  game.player.moving = Math.abs(move.x) > 0.04 || Math.abs(move.y) > 0.04;
  if (game.player.moving) {
    if (Math.abs(move.x) > Math.abs(move.y)) {
      game.player.facing = move.x < 0 ? 'left' : 'right';
    } else {
      game.player.facing = move.y < 0 ? 'up' : 'down';
    }
  }
  game.player.attackTimer = Math.max(0, game.player.attackTimer - dt);
  if (game.player.regen > 0) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.regen * dt);
  }
  game.player.x += move.x * game.player.speed * dt;
  game.player.y += move.y * game.player.speed * dt;
  game.player.x = clamp(game.player.x, -game.mapWidth / 2 + game.player.r, game.mapWidth / 2 - game.player.r);
  game.player.y = clamp(game.player.y, -game.mapHeight / 2 + game.player.r, game.mapHeight / 2 - game.player.r);

  game.spawnClock -= dt;
  const stageSpawnGrowth = Math.pow(1.05, game.stage - 1);
  const baselineSpawnDelay = 1.0857 - game.stageTime * 0.002;
  const spawnDelay = Math.max(0.16, baselineSpawnDelay / stageSpawnGrowth);
  while (game.spawnClock <= 0) {
    spawnEnemy(game);
    game.spawnClock += spawnDelay;
  }

  game.shootClock -= dt;
  if (game.shootClock <= 0) {
    shoot(game);
    game.shootClock = game.player.fireRate;
  }

  for (const enemy of game.enemies) {
    const toPlayer = norm({ x: game.player.x - enemy.x, y: game.player.y - enemy.y });
    enemy.x += toPlayer.x * enemy.speed * dt;
    enemy.y += toPlayer.y * enemy.speed * dt;
    if (Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < enemy.r + game.player.r) {
      game.player.hp -= enemy.damage * dt * game.player.damageTakenMultiplier;
      enemy.x -= toPlayer.x * 18 * dt;
      enemy.y -= toPlayer.y * 18 * dt;
    }
  }

  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  }

  for (const bullet of game.bullets) {
    if (bullet.life <= 0) continue;
    for (const enemy of game.enemies) {
      if (enemy.hp <= 0) continue;
      if (bullet.hitIds.includes(enemy.id)) continue;
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.r + 5) {
        enemy.hp -= bullet.damage;
        bullet.hitIds.push(enemy.id);
        const push = norm({ x: bullet.vx, y: bullet.vy });
        enemy.x += push.x * bullet.knockback;
        enemy.y += push.y * bullet.knockback;
        if (bullet.hitIds.length > bullet.pierce) {
          bullet.life = 0;
        }
        playSound('hit');
        if (enemy.hp <= 0) {
          for (let i = 0; i < enemy.gemDrops; i += 1) {
            const angle = (Math.PI * 2 * i) / enemy.gemDrops + enemy.id * 0.73;
            const distance = enemy.gemDrops === 1 ? 0 : 12;
            game.gems.push({
              x: enemy.x + Math.cos(angle) * distance,
              y: enemy.y + Math.sin(angle) * distance,
              value: 4,
              r: 5,
            });
          }
          game.texts.push({ x: enemy.x, y: enemy.y, text: `+${enemy.gemDrops}`, life: 0.7, color: '#9ee8ff' });
        }
        break;
      }
    }
  }

  for (const gem of game.gems) {
    const d = Math.hypot(gem.x - game.player.x, gem.y - game.player.y);
    if (d < game.player.magnet) {
      const pull = norm({ x: game.player.x - gem.x, y: game.player.y - gem.y });
      const speed = clamp(360 - d, 120, 520);
      gem.x += pull.x * speed * dt;
      gem.y += pull.y * speed * dt;
    }
    if (d < game.player.r + gem.r) {
      gem.value = -gem.value;
      playSound('pickup');
      game.player.gemsCollected += 1;
      game.player.upgradeCurrency += 1;
      gainXp(game, Math.abs(gem.value));
    }
  }

  for (const text of game.texts) {
    text.y -= 28 * dt;
    text.life -= dt;
  }

  game.bullets = game.bullets.filter((b) => b.life > 0 && Math.hypot(b.x - game.player.x, b.y - game.player.y) < 1300);
  game.enemies = game.enemies.filter((e) => Math.hypot(e.x - game.player.x, e.y - game.player.y) < 1800);
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  game.gems = game.gems.filter((g) => g.value > 0);
  game.texts = game.texts.filter((t) => t.life > 0);

  if (game.player.hp <= 0 && game.status !== 'gameover') {
    game.player.hp = 0;
    game.status = 'gameover';
    playSound('gameover');
    return;
  }

  if (game.stageTime >= game.stageDuration) {
    completeStage(game);
  }
}
