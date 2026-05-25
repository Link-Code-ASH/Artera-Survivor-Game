import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LogOut, Maximize, Pause, Play, RotateCcw } from 'lucide-react';
import {
  createDefaultSaveData,
  loadGameSave,
  recordRun,
  saveGameSave,
  type GameSaveData,
  type SyncCredentials,
  verifyGameSync,
} from './saveSystem';
import { isAudioUnlocked, playSound, startTitleMusic, unlockAudio } from './soundSystem';
import { createSupabaseClient, hasSupabaseConfig, supabase } from './supabaseClient';
import './styles.css';

type Vec = { x: number; y: number };
type EnemyKind = 'slime';
type Enemy = { id: number; x: number; y: number; r: number; hp: number; speed: number; kind: EnemyKind };
type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  knockback: number;
  hitIds: number[];
};
type Gem = { x: number; y: number; value: number; r: number };
type FloatText = { x: number; y: number; text: string; life: number; color: string };
type Upgrade = {
  id: string;
  title: string;
  body: string;
  apply: (game: GameState) => void;
};

type CharacterDefinition = {
  id: string;
  name: string;
  description: string;
  damageTakenMultiplier: number;
};

type WeaponDefinition = {
  id: string;
  name: string;
  description: string;
  projectileName: string;
  fireRate: number;
  bulletSpeed: number;
  damage: number;
  projectiles: number;
};

type Direction = 'down' | 'left' | 'right' | 'up';

type GameState = {
  status: 'ready' | 'running' | 'paused' | 'levelup' | 'gameover';
  width: number;
  height: number;
  time: number;
  nextId: number;
  spawnClock: number;
  shootClock: number;
  player: {
    x: number;
    y: number;
    r: number;
    hp: number;
    maxHp: number;
    speed: number;
    damageTakenMultiplier: number;
    facing: Direction;
    moving: boolean;
    attackTimer: number;
    xp: number;
    nextXp: number;
    level: number;
    magnet: number;
    fireRate: number;
    bulletSpeed: number;
    damage: number;
    projectiles: number;
    pierce: number;
    regen: number;
    knockback: number;
  };
  enemies: Enemy[];
  bullets: Bullet[];
  gems: Gem[];
  texts: FloatText[];
  upgrades: Upgrade[];
};

const keys = new Set<string>();
const pointerMove: Vec = { x: 0, y: 0 };
let pointerActive = false;
let lastMoveDirection: Direction = 'down';

type JoystickState = {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

const characters: CharacterDefinition[] = [
  {
    id: 'caiden',
    name: '케이든',
    description: '푸른 망토를 두른 아르테라의 젊은 수호자입니다.',
    damageTakenMultiplier: 1,
  },
];

const weapons: WeaponDefinition[] = [
  {
    id: 'magic-staff',
    name: '마법 지팡이',
    description: '응축한 마력을 파동으로 날립니다.',
    projectileName: '마력파',
    fireRate: 0.62,
    bulletSpeed: 530,
    damage: 18,
    projectiles: 1,
  },
];

const caidenAtlas = new Image();
caidenAtlas.src = 'assets/images/characters/caiden-4dir.png';
const caidenPortrait = new Image();
caidenPortrait.src = 'assets/images/characters/caiden-portrait.png';
const magicStaffIcon = new Image();
magicStaffIcon.src = 'assets/images/weapons/magic-staff.png';
const magicWaveAtlas = new Image();
magicWaveAtlas.src = 'assets/images/projectiles/magic-wave.png';
const forestGroundTiles = new Image();
forestGroundTiles.src = 'assets/images/maps/forest/tiles/grass-tiles.png';
const forestProps = new Image();
forestProps.src = 'assets/images/maps/forest/props/forest-props.png';
const forestSlimeAtlas = new Image();
forestSlimeAtlas.src = 'assets/images/enemies/forest-slime-2dir.png';

function characterName(character: CharacterDefinition) {
  if (character.id === 'caiden') return '케이든';
  return character.name;
}

function characterDescription(character: CharacterDefinition) {
  if (character.id === 'caiden') return '푸른 망토를 두른 아르테라의 젊은 수호자입니다.';
  return character.description;
}

function weaponName(weapon: WeaponDefinition) {
  if (weapon.id === 'magic-staff') return '마법 지팡이';
  return weapon.name;
}

function weaponDescription(weapon: WeaponDefinition) {
  if (weapon.id === 'magic-staff') return '응축한 마력을 파동으로 날립니다.';
  return weapon.description;
}

const upgrades: Upgrade[] = [
  {
    id: 'rapid',
    title: '비전 서책',
    body: '마력파를 더 자주 발사합니다.',
    apply: (game) => {
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.84);
    },
  },
  {
    id: 'damage',
    title: '룬 각인',
    body: '마력파의 피해량이 증가합니다.',
    apply: (game) => {
      game.player.damage += 7;
    },
  },
  {
    id: 'projectile',
    title: '쌍월 주문',
    body: '한 번에 발사하는 마력파가 늘어납니다.',
    apply: (game) => {
      game.player.projectiles += 1;
    },
  },
  {
    id: 'speed',
    title: '순풍 망토',
    body: '이동 속도가 증가합니다.',
    apply: (game) => {
      game.player.speed += 18;
    },
  },
  {
    id: 'magnet',
    title: '수정 부적',
    body: '마력 수정을 더 멀리서 끌어옵니다.',
    apply: (game) => {
      game.player.magnet += 34;
    },
  },
  {
    id: 'heart',
    title: '성소의 축복',
    body: '최대 체력과 현재 체력이 회복됩니다.',
    apply: (game) => {
      game.player.maxHp += 22;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 36);
    },
  },
  {
    id: 'pierce',
    title: '관통의 룬',
    body: '마력파가 적을 추가로 관통합니다.',
    apply: (game) => {
      game.player.pierce += 1;
    },
  },
  {
    id: 'velocity',
    title: '푸른 혜성',
    body: '마력파가 더 빠르게 날아가고 조금 강해집니다.',
    apply: (game) => {
      game.player.bulletSpeed += 95;
      game.player.damage += 3;
    },
  },
  {
    id: 'barrier',
    title: '수호 결계',
    body: '받는 피해가 감소합니다.',
    apply: (game) => {
      game.player.damageTakenMultiplier = Math.max(0.45, game.player.damageTakenMultiplier * 0.86);
    },
  },
  {
    id: 'regen',
    title: '생명의 서약',
    body: '전투 중 체력이 천천히 회복됩니다.',
    apply: (game) => {
      game.player.regen += 1.1;
    },
  },
  {
    id: 'knockback',
    title: '충격 파동',
    body: '마력파가 적을 더 강하게 밀쳐냅니다.',
    apply: (game) => {
      game.player.knockback += 20;
    },
  },
  {
    id: 'overload',
    title: '마력 과부하',
    body: '피해량과 발사 속도가 함께 증가합니다.',
    apply: (game) => {
      game.player.damage += 5;
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.9);
    },
  },
];

function newGame(width = 960, height = 540, character: CharacterDefinition = characters[0], weapon: WeaponDefinition = weapons[0]): GameState {
  const baseSpeed = 190;
  return {
    status: 'ready',
    width,
    height,
    time: 0,
    nextId: 1,
    spawnClock: 0,
    shootClock: 0,
    enemies: [],
    bullets: [],
    gems: [],
    texts: [],
    upgrades: [],
    player: {
      x: 0,
      y: 0,
      r: 16,
      hp: 100,
      maxHp: 100,
      speed: baseSpeed,
      damageTakenMultiplier: character.damageTakenMultiplier,
      facing: 'right',
      moving: false,
      attackTimer: 0,
      xp: 0,
      nextXp: 18,
      level: 1,
      magnet: 82,
      fireRate: weapon.fireRate,
      bulletSpeed: weapon.bulletSpeed,
      damage: weapon.damage,
      projectiles: weapon.projectiles,
      pierce: 0,
      regen: 0,
      knockback: 18,
    },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function len(v: Vec) {
  return Math.hypot(v.x, v.y);
}

function norm(v: Vec): Vec {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

function getCameraScale(game: GameState) {
  const shortSide = Math.min(game.width, game.height);
  if (shortSide <= 520) return 0.74;
  if (shortSide <= 720) return 0.84;
  return 1;
}

function getWorldView(game: GameState) {
  const scale = getCameraScale(game);
  return {
    scale,
    width: game.width / scale,
    height: game.height / scale,
  };
}

function getCamera(game: GameState): Vec {
  const view = getWorldView(game);
  return {
    x: game.player.x - view.width / 2,
    y: game.player.y - view.height / 2,
  };
}

function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function requestFullScreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    root.requestFullscreen().catch(() => undefined);
  }
}

function pickUpgrades(game: GameState) {
  game.upgrades = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  game.status = 'levelup';
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
  const minutes = game.time / 60;
  game.enemies.push({
    id: game.nextId++,
    x: pos.x,
    y: pos.y,
    r: 13,
    hp: 28 + minutes * 8,
    speed: 88 + minutes * 7,
    kind: 'slime',
  });
}

function nearestEnemy(game: GameState) {
  let target: Enemy | undefined;
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
    pickUpgrades(game);
    break;
  }
}

function inputVector(): Vec {
  const v = { x: 0, y: 0 };
  if (keys.has('KeyW') || keys.has('ArrowUp')) v.y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) v.y += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) {
    v.x -= 1;
  }
  if (keys.has('KeyD') || keys.has('ArrowRight')) {
    v.x += 1;
  }
  if (pointerActive) {
    v.x += pointerMove.x;
    v.y += pointerMove.y;
  }
  const next = len(v) > 1 ? norm(v) : v;
  if (Math.abs(next.x) > 0.04 || Math.abs(next.y) > 0.04) {
    if (Math.abs(next.x) > Math.abs(next.y)) {
      lastMoveDirection = next.x < 0 ? 'left' : 'right';
    } else {
      lastMoveDirection = next.y < 0 ? 'up' : 'down';
    }
  }
  return next;
}

function updateGame(game: GameState, dt: number) {
  if (game.status !== 'running') return;
  game.time += dt;

  const move = inputVector();
  game.player.moving = Math.abs(move.x) > 0.04 || Math.abs(move.y) > 0.04;
  game.player.facing = lastMoveDirection;
  game.player.attackTimer = Math.max(0, game.player.attackTimer - dt);
  if (game.player.regen > 0) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + game.player.regen * dt);
  }
  game.player.x += move.x * game.player.speed * dt;
  game.player.y += move.y * game.player.speed * dt;

  game.spawnClock -= dt;
  const spawnDelay = Math.max(0.16, 0.76 - game.time * 0.006);
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
      game.player.hp -= (12 + game.time * 0.12) * dt * game.player.damageTakenMultiplier;
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
          game.gems.push({ x: enemy.x, y: enemy.y, value: 4, r: 5 });
          game.texts.push({ x: enemy.x, y: enemy.y, text: '+4', life: 0.7, color: '#9ee8ff' });
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
  }
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.clearRect(0, 0, game.width, game.height);
  const camera = getCamera(game);
  const view = getWorldView(game);
  ctx.save();
  ctx.scale(view.scale, view.scale);
  drawMap(ctx, game, camera);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  for (const gem of game.gems) drawCrystal(ctx, gem);
  for (const bullet of game.bullets) drawMagicBolt(ctx, bullet);
  for (const enemy of game.enemies) drawEnemy(ctx, enemy, game);
  drawHero(ctx, game);

  for (const text of game.texts) {
    ctx.globalAlpha = clamp(text.life, 0, 1);
    ctx.fillStyle = text.color;
    ctx.font = '700 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.restore();

  if (game.status === 'ready') {
    drawCenterMessage(ctx, game, 'ARTERA SURVIVOR', '캐릭터를 선택하면 숲 외곽의 침입자들이 몰려옵니다');
  }
  if (game.status === 'paused') {
    drawCenterMessage(ctx, game, 'PAUSED', '성소의 숨결이 잠시 멈췄습니다');
  }
  if (game.status === 'gameover') {
    drawCenterMessage(ctx, game, 'GAME OVER', `${formatTime(game.time)} 생존`);
  }
}

function drawMap(ctx: CanvasRenderingContext2D, game: GameState, camera: Vec) {
  drawForestGround(ctx, game, camera);
  drawForestProps(ctx, game, camera);
}

function drawForestGround(ctx: CanvasRenderingContext2D, game: GameState, camera: Vec) {
  const view = getWorldView(game);
  ctx.fillStyle = '#24381f';
  ctx.fillRect(0, 0, view.width, view.height);

  if (!forestGroundTiles.complete || forestGroundTiles.naturalWidth <= 0) {
    const bg = ctx.createLinearGradient(0, 0, view.width, view.height);
    bg.addColorStop(0, '#21371f');
    bg.addColorStop(0.5, '#334727');
    bg.addColorStop(1, '#1f3022');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.width, view.height);
    return;
  }

  const columns = 8;
  const rows = 4;
  const sourceTileWidth = forestGroundTiles.naturalWidth / columns;
  const sourceTileHeight = forestGroundTiles.naturalHeight / rows;
  const tileSize = 122;
  const sourceInset = 5;
  const startTileX = Math.floor(camera.x / tileSize) - 1;
  const startTileY = Math.floor(camera.y / tileSize) - 1;
  const endTileX = Math.ceil((camera.x + view.width) / tileSize) + 1;
  const endTileY = Math.ceil((camera.y + view.height) / tileSize) + 1;

  for (let ty = startTileY; ty <= endTileY; ty += 1) {
    for (let tx = startTileX; tx <= endTileX; tx += 1) {
      const worldX = tx * tileSize + tileSize / 2;
      const worldY = ty * tileSize + tileSize / 2;
      const pathY = Math.sin(worldX * 0.0026) * 210 + Math.sin(worldX * 0.0061) * 58;
      const pathDistance = Math.abs(worldY - pathY);
      const seed = seededNoise(tx, ty);
      const column = Math.floor(seed * columns) % columns;
      let row = seed > 0.64 ? 1 : 0;
      if (pathDistance < 58) row = 2;
      else if (pathDistance < 92) row = 3;

      ctx.drawImage(
        forestGroundTiles,
        Math.floor(column * sourceTileWidth + sourceInset),
        Math.floor(row * sourceTileHeight + sourceInset),
        Math.ceil(sourceTileWidth - sourceInset * 2),
        Math.ceil(sourceTileHeight - sourceInset * 2),
        Math.floor(tx * tileSize - camera.x) - 1,
        Math.floor(ty * tileSize - camera.y) - 1,
        tileSize + 3,
        tileSize + 3,
      );
    }
  }

  const shade = ctx.createRadialGradient(
    view.width / 2,
    view.height / 2,
    Math.min(view.width, view.height) * 0.25,
    view.width / 2,
    view.height / 2,
    Math.max(view.width, view.height) * 0.72,
  );
  shade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shade.addColorStop(1, 'rgba(9, 18, 12, 0.26)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.fillStyle = 'rgba(14, 24, 16, 0.42)';
  ctx.fillRect(0, 0, view.width, view.height);
}

function drawForestProps(ctx: CanvasRenderingContext2D, game: GameState, camera: Vec) {
  const view = getWorldView(game);
  if (!forestProps.complete || forestProps.naturalWidth <= 0) return;

  const columns = 6;
  const rows = 4;
  const sourceCellWidth = forestProps.naturalWidth / columns;
  const sourceCellHeight = forestProps.naturalHeight / rows;
  const propCell = 310;
  const startX = Math.floor(camera.x / propCell) - 1;
  const startY = Math.floor(camera.y / propCell) - 1;
  const endX = Math.ceil((camera.x + view.width) / propCell) + 1;
  const endY = Math.ceil((camera.y + view.height) / propCell) + 1;

  for (let gy = startY; gy <= endY; gy += 1) {
    for (let gx = startX; gx <= endX; gx += 1) {
      const seed = seededNoise(gx + 19, gy - 31);
      if (seed < 0.34) continue;

      const worldBaseX = gx * propCell;
      const worldBaseY = gy * propCell;
      const px = worldBaseX + 70 + seededNoise(gx + 7, gy) * (propCell - 140);
      const py = worldBaseY + 72 + seededNoise(gx, gy + 11) * (propCell - 144);
      const pathY = Math.sin(px * 0.0026) * 210 + Math.sin(px * 0.0061) * 58;
      if (Math.abs(py - pathY) < 118 && seed < 0.76) continue;

      const variants =
        seed > 0.9
          ? [
              [0, 3],
              [1, 3],
              [2, 3],
              [3, 3],
              [4, 3],
              [5, 3],
            ]
          : seed > 0.68
            ? [
                [0, 1],
                [1, 1],
                [2, 1],
                [3, 1],
                [4, 1],
                [5, 1],
              ]
            : [
                [0, 0],
                [1, 0],
                [2, 0],
                [3, 0],
                [4, 0],
                [5, 0],
                [0, 2],
                [1, 2],
                [2, 2],
                [3, 2],
                [4, 2],
                [5, 2],
              ];
      const pick = variants[Math.floor(seededNoise(gx - 5, gy + 23) * variants.length) % variants.length];
      const scale = 0.72 + seededNoise(gx + 101, gy - 47) * 0.28;
      const drawSize = Math.round(118 * scale);
      const drawX = Math.round(px - camera.x - drawSize / 2);
      const drawY = Math.round(py - camera.y - drawSize * 0.78);

      ctx.drawImage(
        forestProps,
        Math.floor(pick[0] * sourceCellWidth),
        Math.floor(pick[1] * sourceCellHeight),
        Math.ceil(sourceCellWidth),
        Math.ceil(sourceCellHeight),
        drawX,
        drawY,
        drawSize,
        drawSize,
      );
    }
  }
}

function drawCrystal(ctx: CanvasRenderingContext2D, gem: Gem) {
  ctx.fillStyle = '#75d9ff';
  ctx.strokeStyle = '#d8f5ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gem.x, gem.y - gem.r - 3);
  ctx.lineTo(gem.x + gem.r, gem.y);
  ctx.lineTo(gem.x, gem.y + gem.r + 3);
  ctx.lineTo(gem.x - gem.r, gem.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawMagicBolt(ctx: CanvasRenderingContext2D, bullet: Bullet) {
  const angle = Math.atan2(bullet.vy, bullet.vx);
  if (magicWaveAtlas.complete && magicWaveAtlas.naturalWidth > 0) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(angle);
    ctx.drawImage(magicWaveAtlas, -18, -13, 38, 26);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(bullet.x, bullet.y);
  ctx.rotate(angle);
  ctx.shadowColor = '#8ee8ff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(125, 224, 255, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff1a8';
  ctx.beginPath();
  ctx.arc(9, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, game: GameState) {
  if (forestSlimeAtlas.complete && forestSlimeAtlas.naturalWidth > 0) {
    const columns = 4;
    const rows = 2;
    const sourceWidth = forestSlimeAtlas.naturalWidth / columns;
    const sourceHeight = forestSlimeAtlas.naturalHeight / rows;
    const frame = Math.floor(game.time * 7 + enemy.id * 0.37) % columns;
    const row = enemy.x > game.player.x ? 0 : 1;
    const drawWidth = 76;
    const drawHeight = 55 + Math.sin(game.time * 12 + enemy.id) * 2.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 14, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      forestSlimeAtlas,
      Math.floor(frame * sourceWidth),
      Math.floor(row * sourceHeight),
      Math.ceil(sourceWidth),
      Math.ceil(sourceHeight),
      enemy.x - drawWidth / 2,
      enemy.y - drawHeight * 0.7,
      drawWidth,
      drawHeight,
    );
    return;
  }

  ctx.fillStyle = '#66b970';
  ctx.beginPath();
  ctx.ellipse(enemy.x, enemy.y + 2, enemy.r * 1.08, enemy.r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b4525';
  ctx.beginPath();
  ctx.arc(enemy.x - 4, enemy.y - 2, 2, 0, Math.PI * 2);
  ctx.arc(enemy.x + 5, enemy.y - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHero(ctx: CanvasRenderingContext2D, game: GameState) {
  const p = game.player;
  if (caidenAtlas.complete && caidenAtlas.naturalWidth > 0) {
    const frameSize = caidenAtlas.naturalWidth / 4;
    const frame = p.moving ? Math.floor(game.time * 8) % 4 : 0;
    const rowByDirection: Record<Direction, number> = {
      down: 0,
      left: 1,
      right: 1,
      up: 3,
    };
    const row = rowByDirection[p.facing];
    const sourceX = Math.floor(frame * frameSize);
    const upExtra = p.facing === 'up' ? 48 : 0;
    const sourceY = Math.max(0, Math.floor(row * frameSize) - upExtra);
    const sourceWidth = Math.ceil(frameSize);
    const sourceHeight = Math.ceil(frameSize) + upExtra;
    const heroScale = 1.56;
    const drawWidth = 74 * heroScale;
    const drawHeight = (p.facing === 'up' ? 86 : 74) * heroScale;
    const drawY = p.y - drawHeight * (p.facing === 'up' ? 0.48 : 0.68);

    ctx.save();
    ctx.translate(p.x, drawY);
    if (p.facing === 'right') {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      caidenAtlas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      -drawWidth / 2,
      0,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#273f7a';
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(15, 12);
  ctx.lineTo(0, 21);
  ctx.lineTo(-15, 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f2d2a4';
  ctx.beginPath();
  ctx.arc(0, -13, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#d6d0bd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(12, -3);
  ctx.lineTo(25, -15);
  ctx.stroke();
  ctx.restore();
}

function drawCenterMessage(ctx: CanvasRenderingContext2D, game: GameState, title: string, subtitle: string) {
  ctx.fillStyle = 'rgba(10, 14, 11, 0.58)';
  ctx.fillRect(0, 0, game.width, game.height);
  ctx.fillStyle = '#fff6df';
  ctx.textAlign = 'center';
  ctx.font = '800 42px system-ui';
  ctx.fillText(title, game.width / 2, game.height / 2 - 20);
  ctx.font = '500 18px system-ui';
  ctx.fillStyle = 'rgba(255, 246, 223, 0.78)';
  ctx.fillText(subtitle, game.width / 2, game.height / 2 + 18);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString();
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

type SaveSession = {
  client: SupabaseClient;
  credentials: SyncCredentials;
  initialSaveData: GameSaveData;
};

function GameApp({ saveSession, onSignOut }: { saveSession: SaveSession | null; onSignOut: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedCharacterId = saveSession?.initialSaveData.profile.selectedCharacter || characters[0].id;
  const initialCharacter = characters.find((character) => character.id === selectedCharacterId) || characters[0];
  const selectedWeaponId = saveSession?.initialSaveData.profile.selectedWeapon || weapons[0].id;
  const initialWeapon = weapons.find((weapon) => weapon.id === selectedWeaponId) || weapons[0];
  const gameRef = useRef<GameState>(newGame(960, 540, initialCharacter, initialWeapon));
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const savedGameOverRef = useRef(false);
  const [snapshot, setSnapshot] = useState(gameRef.current);
  const [saveData, setSaveData] = useState<GameSaveData>(saveSession?.initialSaveData || createDefaultSaveData());
  const [saveMessage, setSaveMessage] = useState(saveSession ? 'Cloud save ready' : 'Local test mode');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDefinition>(initialCharacter);
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponDefinition>(initialWeapon);
  const [titleEntered, setTitleEntered] = useState(false);
  const [characterSelected, setCharacterSelected] = useState(false);
  const [weaponSelected, setWeaponSelected] = useState(false);
  const [characterCarouselIndex, setCharacterCarouselIndex] = useState(2);
  const [characterDragOffset, setCharacterDragOffset] = useState(0);
  const characterFrameDragRef = useRef({
    active: false,
    startX: 0,
  });
  const [weaponCarouselIndex, setWeaponCarouselIndex] = useState(2);
  const [weaponDragOffset, setWeaponDragOffset] = useState(0);
  const weaponFrameDragRef = useRef({
    active: false,
    startX: 0,
  });
  const [joystick, setJoystick] = useState<JoystickState>({
    active: false,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
  });

  const syncSnapshot = () => setSnapshot({ ...gameRef.current, player: { ...gameRef.current.player } });

  const start = () => {
    unlockAudio();
    playSound('button');
    requestFullScreen();
    if (gameRef.current.status === 'gameover') {
      gameRef.current = newGame(gameRef.current.width, gameRef.current.height, selectedCharacter, selectedWeapon);
      savedGameOverRef.current = false;
    }
    gameRef.current.status = 'running';
    syncSnapshot();
  };

  const reset = () => {
    unlockAudio();
    playSound('button');
    gameRef.current = newGame(gameRef.current.width, gameRef.current.height, selectedCharacter, selectedWeapon);
    savedGameOverRef.current = false;
    syncSnapshot();
  };

  const togglePause = () => {
    unlockAudio();
    playSound('button');
    const game = gameRef.current;
    if (game.status === 'running') game.status = 'paused';
    else if (game.status === 'paused' || game.status === 'ready') {
      requestFullScreen();
      game.status = 'running';
    }
    syncSnapshot();
  };

  const enterTitle = () => {
    unlockAudio();
    startTitleMusic();
    playSound('button');
    setTitleEntered(true);
  };

  const wakeTitleMusic = () => {
    unlockAudio();
    startTitleMusic();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect?.width || window.innerWidth));
      const height = Math.max(420, Math.floor(rect?.height || window.innerHeight));
      const game = gameRef.current;
      game.width = width;
      game.height = height;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const tick = (now: number) => {
      const last = lastRef.current || now;
      const dt = Math.min(0.033, (now - last) / 1000);
      lastRef.current = now;
      updateGame(gameRef.current, dt);
      if (gameRef.current.status === 'gameover' && !savedGameOverRef.current) {
        savedGameOverRef.current = true;
        const nextSaveData = recordRun(saveData, {
          time: gameRef.current.time,
          level: gameRef.current.player.level,
        });
        setSaveData(nextSaveData);
        if (saveSession) {
          setSaveMessage('Saving progress...');
          saveGameSave(saveSession.client, saveSession.credentials, nextSaveData)
            .then(() => setSaveMessage('Progress saved'))
            .catch(() => setSaveMessage('Save failed'));
        }
      }
      drawGame(ctx, gameRef.current);
      syncSnapshot();
      frameRef.current = requestAnimationFrame(tick);
    };

    const down = (event: KeyboardEvent) => {
      keys.add(event.code);
      if (event.code === 'Space') togglePause();
    };
    const up = (event: KeyboardEvent) => keys.delete(event.code);

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      cancelAnimationFrame(frameRef.current);
    };
  }, [saveData, saveSession]);

  const chooseUpgrade = (upgrade: Upgrade) => {
    unlockAudio();
    playSound('select');
    const game = gameRef.current;
    upgrade.apply(game);
    game.upgrades = [];
    game.status = 'running';
    syncSnapshot();
  };

  const chooseCharacter = (character: CharacterDefinition) => {
    unlockAudio();
    playSound('select');
    setSelectedCharacter(character);
    const nextSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        selectedCharacter: character.id,
      },
    };
    setSaveData(nextSaveData);
    if (saveSession) {
      setSaveMessage('Saving character...');
      saveGameSave(saveSession.client, saveSession.credentials, nextSaveData)
        .then(() => setSaveMessage('Character saved'))
        .catch(() => setSaveMessage('Character save failed'));
    }
    gameRef.current = newGame(gameRef.current.width, gameRef.current.height, character, selectedWeapon);
    savedGameOverRef.current = false;
    setCharacterSelected(true);
    setWeaponSelected(false);
    gameRef.current.status = 'ready';
    syncSnapshot();
  };

  const startCharacterFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    unlockAudio();
    characterFrameDragRef.current = {
      active: true,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveCharacterFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = characterFrameDragRef.current;
    if (!drag.active) return;
    const nextOffset = event.clientX - drag.startX;
    setCharacterDragOffset(Math.max(-140, Math.min(140, nextOffset)));
  };

  const endCharacterFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = characterFrameDragRef.current;
    const delta = event.clientX - drag.startX;
    characterFrameDragRef.current.active = false;
    const nextIndex =
      delta > 70
        ? Math.max(0, characterCarouselIndex - 1)
        : delta < -70
          ? Math.min(4, characterCarouselIndex + 1)
          : characterCarouselIndex;
    if (nextIndex !== characterCarouselIndex) {
      playSound('slide');
      setCharacterCarouselIndex(nextIndex);
    }
    setCharacterDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const startWeaponFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    unlockAudio();
    weaponFrameDragRef.current = {
      active: true,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveWeaponFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = weaponFrameDragRef.current;
    if (!drag.active) return;
    const nextOffset = event.clientX - drag.startX;
    setWeaponDragOffset(Math.max(-140, Math.min(140, nextOffset)));
  };

  const endWeaponFrameDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = weaponFrameDragRef.current;
    const delta = event.clientX - drag.startX;
    weaponFrameDragRef.current.active = false;
    const nextIndex =
      delta > 70
        ? Math.max(0, weaponCarouselIndex - 1)
        : delta < -70
          ? Math.min(4, weaponCarouselIndex + 1)
          : weaponCarouselIndex;
    if (nextIndex !== weaponCarouselIndex) {
      playSound('slide');
      setWeaponCarouselIndex(nextIndex);
    }
    setWeaponDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const characterSlots: Array<CharacterDefinition | null> = [null, null, characters[0], null, null];
  const centeredCharacter = characterSlots[characterCarouselIndex];
  const weaponSlots: Array<WeaponDefinition | null> = [null, null, weapons[0], null, null];
  const centeredWeapon = weaponSlots[weaponCarouselIndex];

  const chooseWeapon = (weapon: WeaponDefinition) => {
    unlockAudio();
    playSound('select');
    setSelectedWeapon(weapon);
    const nextSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        selectedWeapon: weapon.id,
      },
    };
    setSaveData(nextSaveData);
    if (saveSession) {
      setSaveMessage('Saving weapon...');
      saveGameSave(saveSession.client, saveSession.credentials, nextSaveData)
        .then(() => setSaveMessage('Weapon saved'))
        .catch(() => setSaveMessage('Weapon save failed'));
    }
    gameRef.current = newGame(gameRef.current.width, gameRef.current.height, selectedCharacter, weapon);
    savedGameOverRef.current = false;
    setWeaponSelected(true);
    gameRef.current.status = 'running';
    syncSnapshot();
  };

  const moveJoystick = (clientX: number, clientY: number, baseX: number, baseY: number) => {
    const maxDistance = 58;
    const dx = clientX - baseX;
    const dy = clientY - baseY;
    const distance = Math.hypot(dx, dy);
    const scale = distance > maxDistance ? maxDistance / distance : 1;
    const knobX = baseX + dx * scale;
    const knobY = baseY + dy * scale;
    pointerMove.x = clamp(dx / maxDistance, -1, 1);
    pointerMove.y = clamp(dy / maxDistance, -1, 1);
    setJoystick((current) => ({
      ...current,
      knobX,
      knobY,
    }));
  };

  return (
    <main className="shell">
      <section className="game-wrap">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={(event) => {
            pointerActive = true;
            pointerMove.x = 0;
            pointerMove.y = 0;
            setJoystick({
              active: true,
              baseX: event.clientX,
              baseY: event.clientY,
              knobX: event.clientX,
              knobY: event.clientY,
            });
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!pointerActive) return;
            moveJoystick(event.clientX, event.clientY, joystick.baseX, joystick.baseY);
          }}
          onPointerUp={() => {
            pointerActive = false;
            pointerMove.x = 0;
            pointerMove.y = 0;
            setJoystick((current) => ({ ...current, active: false }));
          }}
          onPointerCancel={() => {
            pointerActive = false;
            pointerMove.x = 0;
            pointerMove.y = 0;
            setJoystick((current) => ({ ...current, active: false }));
          }}
        />

        {joystick.active && (
          <div className="virtual-joystick" style={{ left: joystick.baseX, top: joystick.baseY }}>
            <span
              style={{
                transform: `translate(${joystick.knobX - joystick.baseX}px, ${joystick.knobY - joystick.baseY}px)`,
              }}
            />
          </div>
        )}

        <div className="hud top">
          <div>
            <strong>{formatTime(snapshot.time)}</strong>
            <span>생존</span>
          </div>
          <div>
            <strong>Lv {snapshot.player.level}</strong>
            <span>레벨</span>
          </div>
          <div>
            <strong>{snapshot.enemies.length}</strong>
            <span>적</span>
          </div>
        </div>

        <div className="save-status">
          <strong>{saveMessage}</strong>
          <span>Runs {saveData.stats.totalRuns} · Best {formatTime(saveData.stats.bestTime)} · Best Lv {saveData.stats.bestLevel}</span>
        </div>

        <div className="bars">
          <div className="bar hp">
            <span style={{ width: `${(snapshot.player.hp / snapshot.player.maxHp) * 100}%` }} />
          </div>
          <div className="bar xp">
            <span style={{ width: `${(snapshot.player.xp / snapshot.player.nextXp) * 100}%` }} />
          </div>
        </div>

        <div className="controls">
          {saveSession && (
            <button
              onClick={() => {
                unlockAudio();
                playSound('button');
                onSignOut();
              }}
              aria-label="로그아웃"
            >
              <LogOut size={20} />
            </button>
          )}
          <button onClick={snapshot.status === 'running' ? togglePause : start} aria-label={snapshot.status === 'running' ? '일시정지' : '시작'}>
            {snapshot.status === 'running' ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={() => {
              unlockAudio();
              playSound('button');
              requestFullScreen();
            }}
            aria-label="전체화면"
          >
            <Maximize size={20} />
          </button>
          <button onClick={reset} aria-label="다시 시작">
            <RotateCcw size={20} />
          </button>
        </div>

        {snapshot.status === 'levelup' && (
          <div className="upgrade-layer">
            <div className="upgrade-panel">
              <h2>강화 선택</h2>
              <div className="upgrade-list">
                {snapshot.upgrades.map((upgrade) => (
                  <button key={upgrade.id} data-upgrade={upgrade.id} onClick={() => chooseUpgrade(upgrade)}>
                    <strong>{upgrade.title}</strong>
                    <span>{upgrade.body}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!titleEntered && (
          <div className="title-layer" onPointerDown={wakeTitleMusic}>
            <button className="title-start-button" type="button" onClick={enterTitle}>
              시작
            </button>
            {!isAudioUnlocked() && <span className="title-audio-hint">화면을 터치하면 음악이 시작됩니다</span>}
          </div>
        )}

        {titleEntered && !characterSelected && (
          <div className="character-layer">
            <div className="character-panel character-panel-empty">
              <div
                className="character-frame-stage"
                style={{ '--drag-offset': `${characterDragOffset}px` } as React.CSSProperties}
                onPointerDown={startCharacterFrameDrag}
                onPointerMove={moveCharacterFrameDrag}
                onPointerUp={endCharacterFrameDrag}
                onPointerCancel={endCharacterFrameDrag}
                onDragStart={(event) => event.preventDefault()}
              >
                {characterSlots.map((character, slotIndex) => {
                  const relative = slotIndex - characterCarouselIndex;
                  if (Math.abs(relative) > 2) return null;
                  const positionClass =
                    relative === -2
                      ? 'character-slot-left-far'
                      : relative === -1
                        ? 'character-slot-left-near'
                        : relative === 0
                          ? 'character-slot-main'
                          : relative === 1
                            ? 'character-slot-right-near'
                            : 'character-slot-right-far';
                  const isMain = relative === 0;
                  return (
                    <div key={slotIndex} className={`character-carousel-card ${positionClass}`}>
                      {character && (
                        <span className={isMain ? 'character-preview-art' : 'character-side-art'}>
                          <img src="assets/images/characters/caiden-portrait.png" alt="" draggable={false} />
                        </span>
                      )}
                      <img
                        className={isMain ? 'character-preview-frame' : 'character-side-frame'}
                        src={isMain ? 'assets/images/ui/character-weapon-select/card-frame-main.png' : 'assets/images/ui/character-weapon-select/card-frame-small.png'}
                        alt=""
                        draggable={false}
                      />
                      {!isMain && character && <span className="character-side-name">{characterName(character)}</span>}
                      {isMain && character && (
                        <>
                          <span className="character-preview-name">{characterName(character)}</span>
                          <span className="character-preview-description">{characterDescription(character)}</span>
                        </>
                      )}
                      {!character && <span className={isMain ? 'character-main-locked' : 'character-side-locked'}>봉인됨</span>}
                    </div>
                  );
                })}
              </div>
              <button
                className="character-select-button"
                type="button"
                disabled={!centeredCharacter}
                onClick={() => centeredCharacter && chooseCharacter(centeredCharacter)}
              >
                {centeredCharacter ? '선택' : '봉인됨'}
              </button>
            </div>
          </div>
        )}

        {characterSelected && !weaponSelected && (
          <div className="weapon-layer">
            <div className="selected-character-summary">
              <span className="selected-character-summary-art">
                <img src="assets/images/characters/caiden-portrait.png" alt="" draggable={false} />
              </span>
              <img
                className="selected-character-summary-frame"
                src="assets/images/ui/character-weapon-select/selected-character-panel.png"
                alt=""
                draggable={false}
              />
              <span className="selected-character-summary-name">{characterName(selectedCharacter)}</span>
            </div>
            <div className="character-panel character-panel-empty weapon-select-panel">
              <div
                className="character-frame-stage"
                style={{ '--drag-offset': `${weaponDragOffset}px` } as React.CSSProperties}
                onPointerDown={startWeaponFrameDrag}
                onPointerMove={moveWeaponFrameDrag}
                onPointerUp={endWeaponFrameDrag}
                onPointerCancel={endWeaponFrameDrag}
                onDragStart={(event) => event.preventDefault()}
              >
                {weaponSlots.map((weapon, slotIndex) => {
                  const relative = slotIndex - weaponCarouselIndex;
                  if (Math.abs(relative) > 2) return null;
                  const positionClass =
                    relative === -2
                      ? 'character-slot-left-far'
                      : relative === -1
                        ? 'character-slot-left-near'
                        : relative === 0
                          ? 'character-slot-main'
                          : relative === 1
                            ? 'character-slot-right-near'
                            : 'character-slot-right-far';
                  const isMain = relative === 0;
                  return (
                    <div key={slotIndex} className={`character-carousel-card weapon-carousel-card ${positionClass}`}>
                      {weapon && (
                        <span className={isMain ? 'weapon-preview-art' : 'weapon-side-art'}>
                          <img src="assets/images/weapons/magic-staff.png" alt="" draggable={false} />
                        </span>
                      )}
                      <img
                        className={isMain ? 'character-preview-frame' : 'character-side-frame'}
                        src={isMain ? 'assets/images/ui/character-weapon-select/card-frame-main.png' : 'assets/images/ui/character-weapon-select/card-frame-small.png'}
                        alt=""
                        draggable={false}
                      />
                      {!isMain && weapon && <span className="character-side-name">{weaponName(weapon)}</span>}
                      {isMain && weapon && (
                        <>
                          <span className="character-preview-name">{weaponName(weapon)}</span>
                          <span className="character-preview-description">{weaponDescription(weapon)}</span>
                        </>
                      )}
                      {!weapon && <span className={isMain ? 'character-main-locked' : 'character-side-locked'}>봉인됨</span>}
                    </div>
                  );
                })}
              </div>
              <button
                className="character-select-button"
                type="button"
                disabled={!centeredWeapon}
                onClick={() => centeredWeapon && chooseWeapon(centeredWeapon)}
              >
                {centeredWeapon ? '선택' : '봉인됨'}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

type SupabaseSettings = {
  projectUrl: string;
  publicKey: string;
  projectId: string;
  syncId: string;
  pinCode: string;
};

const settingsKey = 'artera.supabase.settings';

function blankSettings(): SupabaseSettings {
  return {
    projectUrl: '',
    publicKey: '',
    projectId: '',
    syncId: '',
    pinCode: '',
  };
}

function readStoredSettings(): SupabaseSettings {
  const fallback = blankSettings();
  try {
    const raw = localStorage.getItem(settingsKey);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function inferProjectId(projectUrl: string) {
  try {
    return new URL(projectUrl).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

function isReadyForConnection(settings: SupabaseSettings) {
  return Boolean(settings.projectUrl.trim() && settings.publicKey.trim() && settings.syncId.trim() && settings.pinCode.trim());
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Could not connect cloud save.';
}

function AuthGate() {
  const [settings, setSettings] = useState<SupabaseSettings>(() => {
    const stored = readStoredSettings();
    if (stored.projectUrl && !stored.projectId) {
      stored.projectId = inferProjectId(stored.projectUrl);
    }
    return stored;
  });
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    const stored = readStoredSettings();
    if (stored.projectUrl && stored.publicKey) {
      return createSupabaseClient(stored.projectUrl, stored.publicKey);
    }
    return supabase;
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveSession, setSaveSession] = useState<SaveSession | null>(null);

  useEffect(() => {
    if (!client || !isReadyForConnection(settings)) return;
    setMessage('Saved connection is ready. Press Save and enter to verify PIN.');
  }, [client, settings]);

  const updateSetting = (key: keyof SupabaseSettings, value: string) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      if (key === 'projectUrl') {
        next.projectId = inferProjectId(value);
      }
      return next;
    });
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings.projectUrl.trim() || !settings.publicKey.trim()) {
      setMessage('Project URL and Public Key are required.');
      return;
    }

    const normalized = {
      ...settings,
      projectUrl: settings.projectUrl.trim(),
      publicKey: settings.publicKey.trim(),
      projectId: settings.projectId.trim() || inferProjectId(settings.projectUrl),
      syncId: settings.syncId.trim(),
      pinCode: settings.pinCode.trim(),
    };

    if (!isReadyForConnection(normalized)) {
      setMessage('Project URL, Public Key, Sync ID, and PIN Code are required.');
      return;
    }

    const nextClient = createSupabaseClient(normalized.projectUrl, normalized.publicKey);
    setLoading(true);
    setMessage('Checking Sync ID and PIN...');

    try {
      const credentials = {
        projectId: normalized.projectId,
        syncId: normalized.syncId,
        pinCode: normalized.pinCode,
      };
      const verified = await verifyGameSync(nextClient, credentials);
      if (!verified) {
        setMessage('Sync ID or PIN Code is not correct.');
        setLoading(false);
        return;
      }

      const initialSaveData = await loadGameSave(nextClient, credentials);
      localStorage.setItem(settingsKey, JSON.stringify(normalized));
      setSettings(normalized);
      setClient(nextClient);
      setSaveSession({ client: nextClient, credentials, initialSaveData });
      setSettingsOpen(false);
      setMessage('Cloud save connected.');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const clearSettings = () => {
    localStorage.removeItem(settingsKey);
    setSettings(blankSettings());
    setClient(hasSupabaseConfig ? supabase : null);
    setSaveSession(null);
    setSettingsOpen(true);
    setMessage('Saved connection was cleared.');
  };

  const signOut = () => {
    setSaveSession(null);
    setSettingsOpen(true);
  };

  const settingsForm = (submitLabel: string, showLocalEntry = false) => (
    <form className="auth-panel auth-panel-corner" onSubmit={saveSettings}>
      <button className="auth-panel-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="보안 설정 닫기">
        ×
      </button>
      <h1>보안 설정</h1>
      <p>Supabase 저장 정보를 입력하면 진행상황을 클라우드에 저장합니다.</p>
      <label>
        <span>Project URL</span>
        <input
          value={settings.projectUrl}
          onChange={(event) => updateSetting('projectUrl', event.target.value)}
          placeholder="https://your-project-ref.supabase.co"
          required
        />
      </label>
      <label>
        <span>Public Key</span>
        <input
          value={settings.publicKey}
          onChange={(event) => updateSetting('publicKey', event.target.value)}
          placeholder="anon public key"
          required
        />
      </label>
      <label>
        <span>Project ID</span>
        <input
          value={settings.projectId}
          onChange={(event) => updateSetting('projectId', event.target.value)}
          placeholder="auto-filled from URL"
        />
      </label>
      <label>
        <span>Sync ID</span>
        <input
          value={settings.syncId}
          onChange={(event) => updateSetting('syncId', event.target.value)}
          placeholder="artera-main"
          required
        />
      </label>
      <label>
        <span>PIN Code</span>
        <input
          value={settings.pinCode}
          onChange={(event) => updateSetting('pinCode', event.target.value)}
          placeholder="4-8 digit code"
          type="password"
          required
        />
      </label>
      <button type="submit">{submitLabel}</button>
      {showLocalEntry && (
        <button className="secondary-button" type="button" onClick={() => setDevBypass(true)}>
          Local test entry
        </button>
      )}
      <button className="secondary-button" type="button" onClick={clearSettings}>
        Clear saved connection
      </button>
      {message && <span>{message}</span>}
    </form>
  );

  if (loading) {
    return (
      <main className="auth-screen">
        <div className="auth-panel">
          <h1>Artera Survivor</h1>
          <p>성소의 문을 여는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (settingsOpen) {
    return (
      <>
        <GameApp saveSession={saveSession} onSignOut={signOut} />
        <div className="security-drawer">{settingsForm(client ? 'Save and enter' : 'Save connection', !client && !devBypass)}</div>
      </>
    );
  }

  return (
    <>
      <GameApp saveSession={saveSession} onSignOut={signOut} />
      <button className="security-toggle" type="button" onClick={() => setSettingsOpen(true)}>
        보안
      </button>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<AuthGate />);

