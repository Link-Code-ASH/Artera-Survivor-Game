import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LogOut, Maximize, Pause, Play, RotateCcw } from 'lucide-react';
import { createSupabaseClient, hasSupabaseConfig, supabase } from './supabaseClient';
import './styles.css';

type Vec = { x: number; y: number };
type EnemyKind = 'slime' | 'skeleton';
type Enemy = { id: number; x: number; y: number; r: number; hp: number; speed: number; kind: EnemyKind };
type Bullet = { x: number; y: number; vx: number; vy: number; life: number; damage: number };
type Gem = { x: number; y: number; value: number; r: number };
type FloatText = { x: number; y: number; text: string; life: number; color: string };
type Upgrade = {
  id: string;
  title: string;
  body: string;
  apply: (game: GameState) => void;
};

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
    xp: number;
    nextXp: number;
    level: number;
    magnet: number;
    fireRate: number;
    bulletSpeed: number;
    damage: number;
    projectiles: number;
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

const upgrades: Upgrade[] = [
  {
    id: 'rapid',
    title: '비전 서책',
    body: '마력 화살을 더 자주 발사합니다.',
    apply: (game) => {
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.84);
    },
  },
  {
    id: 'damage',
    title: '룬 각인',
    body: '마력 화살의 피해량이 증가합니다.',
    apply: (game) => {
      game.player.damage += 7;
    },
  },
  {
    id: 'projectile',
    title: '쌍월 주문',
    body: '한 번에 발사하는 화살이 늘어납니다.',
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
];

function newGame(width = 960, height = 540): GameState {
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
      x: width / 2,
      y: height / 2,
      r: 16,
      hp: 100,
      maxHp: 100,
      speed: 190,
      xp: 0,
      nextXp: 18,
      level: 1,
      magnet: 82,
      fireRate: 0.62,
      bulletSpeed: 530,
      damage: 18,
      projectiles: 1,
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
  const side = Math.floor(Math.random() * 4);
  const margin = 42;
  const pos = [
    { x: -margin, y: Math.random() * game.height },
    { x: game.width + margin, y: Math.random() * game.height },
    { x: Math.random() * game.width, y: -margin },
    { x: Math.random() * game.width, y: game.height + margin },
  ][side];
  const minutes = game.time / 60;
  const skeleton = Math.random() < Math.min(0.32, minutes * 0.07);
  game.enemies.push({
    id: game.nextId++,
    x: pos.x,
    y: pos.y,
    r: skeleton ? 18 : 13,
    hp: skeleton ? 58 + minutes * 12 : 28 + minutes * 8,
    speed: skeleton ? 68 + minutes * 5 : 88 + minutes * 7,
    kind: skeleton ? 'skeleton' : 'slime',
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
    pickUpgrades(game);
    break;
  }
}

function inputVector(): Vec {
  const v = { x: 0, y: 0 };
  if (keys.has('KeyW') || keys.has('ArrowUp')) v.y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) v.y += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) v.x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) v.x += 1;
  if (pointerActive) {
    v.x += pointerMove.x;
    v.y += pointerMove.y;
  }
  return len(v) > 1 ? norm(v) : v;
}

function updateGame(game: GameState, dt: number) {
  if (game.status !== 'running') return;
  game.time += dt;

  const move = inputVector();
  game.player.x = clamp(game.player.x + move.x * game.player.speed * dt, game.player.r, game.width - game.player.r);
  game.player.y = clamp(game.player.y + move.y * game.player.speed * dt, game.player.r, game.height - game.player.r);

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
      game.player.hp -= (12 + game.time * 0.12) * dt;
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
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.r + 5) {
        enemy.hp -= bullet.damage;
        bullet.life = 0;
        if (enemy.hp <= 0) {
          game.gems.push({ x: enemy.x, y: enemy.y, value: enemy.kind === 'skeleton' ? 7 : 4, r: enemy.kind === 'skeleton' ? 7 : 5 });
          game.texts.push({ x: enemy.x, y: enemy.y, text: `+${enemy.kind === 'skeleton' ? 7 : 4}`, life: 0.7, color: '#9ee8ff' });
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
      gainXp(game, Math.abs(gem.value));
    }
  }

  for (const text of game.texts) {
    text.y -= 28 * dt;
    text.life -= dt;
  }

  game.bullets = game.bullets.filter((b) => b.life > 0 && b.x > -80 && b.y > -80 && b.x < game.width + 80 && b.y < game.height + 80);
  game.enemies = game.enemies.filter((e) => e.hp > 0);
  game.gems = game.gems.filter((g) => g.value > 0);
  game.texts = game.texts.filter((t) => t.life > 0);

  if (game.player.hp <= 0) {
    game.player.hp = 0;
    game.status = 'gameover';
  }
}

function drawGame(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.clearRect(0, 0, game.width, game.height);
  drawMap(ctx, game);

  for (const gem of game.gems) drawCrystal(ctx, gem);
  for (const bullet of game.bullets) drawMagicBolt(ctx, bullet);
  for (const enemy of game.enemies) drawEnemy(ctx, enemy);
  drawHero(ctx, game);

  for (const text of game.texts) {
    ctx.globalAlpha = clamp(text.life, 0, 1);
    ctx.fillStyle = text.color;
    ctx.font = '700 16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(text.text, text.x, text.y);
    ctx.globalAlpha = 1;
  }

  if (game.status === 'ready') {
    drawCenterMessage(ctx, game, 'ARTERA SURVIVOR', '시작하면 숲 외곽의 침입자들이 몰려옵니다');
  }
  if (game.status === 'paused') {
    drawCenterMessage(ctx, game, 'PAUSED', '성소의 숨결이 잠시 멈췄습니다');
  }
  if (game.status === 'gameover') {
    drawCenterMessage(ctx, game, 'GAME OVER', `${formatTime(game.time)} 생존`);
  }
}

function drawMap(ctx: CanvasRenderingContext2D, game: GameState) {
  const bg = ctx.createLinearGradient(0, 0, game.width, game.height);
  bg.addColorStop(0, '#21371f');
  bg.addColorStop(0.5, '#334727');
  bg.addColorStop(1, '#1f3022');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.strokeStyle = 'rgba(222, 196, 128, 0.13)';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(-60, game.height * 0.68);
  ctx.quadraticCurveTo(game.width * 0.3, game.height * 0.52, game.width * 0.58, game.height * 0.63);
  ctx.quadraticCurveTo(game.width * 0.78, game.height * 0.72, game.width + 80, game.height * 0.48);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(16, 24, 18, 0.18)';
  ctx.lineWidth = 1;
  const tile = 56;
  const ox = (game.player.x * -0.16) % tile;
  const oy = (game.player.y * -0.16) % tile;
  for (let x = ox; x < game.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, game.height);
    ctx.stroke();
  }
  for (let y = oy; y < game.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(game.width, y);
    ctx.stroke();
  }

  drawTree(ctx, 92 + ox * 0.4, 92 + oy * 0.3, 1);
  drawTree(ctx, game.width - 110 + ox * 0.3, 124 + oy * 0.2, 0.9);
  drawTree(ctx, 128 + ox * 0.2, game.height - 120 + oy * 0.3, 0.8);
  drawRuin(ctx, game.width * 0.72 + ox * 0.2, game.height * 0.76 + oy * 0.2);
  drawRuin(ctx, game.width * 0.2 + ox * 0.16, game.height * 0.38 + oy * 0.12);
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.fillStyle = '#5a3f24';
  ctx.fillRect(x - 5 * scale, y + 8 * scale, 10 * scale, 18 * scale);
  ctx.fillStyle = '#16351e';
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#28542a';
  ctx.beginPath();
  ctx.arc(x - 10 * scale, y - 7 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.arc(x + 12 * scale, y - 4 * scale, 17 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawRuin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(142, 136, 115, 0.45)';
  ctx.fillRect(x - 20, y - 8, 40, 16);
  ctx.fillRect(x - 14, y - 27, 10, 20);
  ctx.fillRect(x + 8, y - 24, 10, 18);
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
  ctx.fillStyle = '#f8dc86';
  ctx.shadowColor = '#f8dc86';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  if (enemy.kind === 'slime') {
    ctx.fillStyle = '#66b970';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 2, enemy.r * 1.08, enemy.r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b4525';
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 2, 2, 0, Math.PI * 2);
    ctx.arc(enemy.x + 5, enemy.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.strokeStyle = '#ded7c4';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y - 6, enemy.r * 0.52, 0, Math.PI * 2);
  ctx.moveTo(enemy.x, enemy.y + 1);
  ctx.lineTo(enemy.x, enemy.y + enemy.r);
  ctx.moveTo(enemy.x - 10, enemy.y + 7);
  ctx.lineTo(enemy.x + 10, enemy.y + 7);
  ctx.stroke();
}

function drawHero(ctx: CanvasRenderingContext2D, game: GameState) {
  const p = game.player;
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

function GameApp({ connected, onSignOut }: { connected: boolean; onSignOut: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<GameState>(newGame());
  const frameRef = useRef(0);
  const lastRef = useRef(0);
  const [snapshot, setSnapshot] = useState(gameRef.current);

  const syncSnapshot = () => setSnapshot({ ...gameRef.current, player: { ...gameRef.current.player } });

  const start = () => {
    requestFullScreen();
    if (gameRef.current.status === 'gameover') {
      gameRef.current = newGame(gameRef.current.width, gameRef.current.height);
    }
    gameRef.current.status = 'running';
    syncSnapshot();
  };

  const reset = () => {
    gameRef.current = newGame(gameRef.current.width, gameRef.current.height);
    syncSnapshot();
  };

  const togglePause = () => {
    const game = gameRef.current;
    if (game.status === 'running') game.status = 'paused';
    else if (game.status === 'paused' || game.status === 'ready') {
      requestFullScreen();
      game.status = 'running';
    }
    syncSnapshot();
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
      const xRatio = game.player.x / game.width;
      const yRatio = game.player.y / game.height;
      game.width = width;
      game.height = height;
      game.player.x = clamp(xRatio * width, game.player.r, width - game.player.r);
      game.player.y = clamp(yRatio * height, game.player.r, height - game.player.r);
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
  }, []);

  const chooseUpgrade = (upgrade: Upgrade) => {
    const game = gameRef.current;
    upgrade.apply(game);
    game.upgrades = [];
    game.status = 'running';
    syncSnapshot();
  };

  return (
    <main className="shell">
      <section className="game-wrap">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={(event) => {
            pointerActive = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!pointerActive) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            pointerMove.x = clamp((event.clientX - cx) / 80, -1, 1);
            pointerMove.y = clamp((event.clientY - cy) / 80, -1, 1);
          }}
          onPointerUp={() => {
            pointerActive = false;
            pointerMove.x = 0;
            pointerMove.y = 0;
          }}
          onPointerCancel={() => {
            pointerActive = false;
            pointerMove.x = 0;
            pointerMove.y = 0;
          }}
        />

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

        <div className="bars">
          <div className="bar hp">
            <span style={{ width: `${(snapshot.player.hp / snapshot.player.maxHp) * 100}%` }} />
          </div>
          <div className="bar xp">
            <span style={{ width: `${(snapshot.player.xp / snapshot.player.nextXp) * 100}%` }} />
          </div>
        </div>

        <div className="controls">
          {connected && (
            <button onClick={onSignOut} aria-label="로그아웃">
              <LogOut size={20} />
            </button>
          )}
          <button onClick={snapshot.status === 'running' ? togglePause : start} aria-label={snapshot.status === 'running' ? '일시정지' : '시작'}>
            {snapshot.status === 'running' ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={requestFullScreen} aria-label="전체화면">
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
                  <button key={upgrade.id} onClick={() => chooseUpgrade(upgrade)}>
                    <strong>{upgrade.title}</strong>
                    <span>{upgrade.body}</span>
                  </button>
                ))}
              </div>
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
  const [settingsOpen, setSettingsOpen] = useState(!client);

  useEffect(() => {
    if (client && isReadyForConnection(settings)) {
      setSettingsOpen(false);
    }
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

  const saveSettings = (event: React.FormEvent) => {
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

    localStorage.setItem(settingsKey, JSON.stringify(normalized));
    setSettings(normalized);
    setClient(createSupabaseClient(normalized.projectUrl, normalized.publicKey));
    setSettingsOpen(false);
    setLoading(false);
    setMessage('Supabase connection saved.');
  };

  const clearSettings = () => {
    localStorage.removeItem(settingsKey);
    setSettings(blankSettings());
    setClient(hasSupabaseConfig ? supabase : null);
    setSettingsOpen(true);
    setMessage('Saved connection was cleared.');
  };

  const signOut = () => {
    setSettingsOpen(true);
  };

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

  if (!client && !devBypass) {
    return (
      <main className="auth-screen">
        <form className="auth-panel" onSubmit={saveSettings}>
          <h1>Artera Survivor</h1>
          <p>Enter your Supabase project info to connect this game.</p>
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
          <button type="submit">Save connection</button>
          <button className="secondary-button" type="button" onClick={() => setDevBypass(true)}>
            Local test entry
          </button>
          {message && <span>{message}</span>}
        </form>
      </main>
    );
  }

  if (client && settingsOpen) {
    return (
      <main className="auth-screen">
        <form className="auth-panel" onSubmit={saveSettings}>
          <h1>Artera Survivor</h1>
          <p>Enter your Supabase project info and shared sync credentials.</p>
          <label>
            <span>Project URL</span>
            <input value={settings.projectUrl} onChange={(event) => updateSetting('projectUrl', event.target.value)} required />
          </label>
          <label>
            <span>Public Key</span>
            <input value={settings.publicKey} onChange={(event) => updateSetting('publicKey', event.target.value)} required />
          </label>
          <label>
            <span>Project ID</span>
            <input value={settings.projectId} onChange={(event) => updateSetting('projectId', event.target.value)} />
          </label>
          <label>
            <span>Sync ID</span>
            <input value={settings.syncId} onChange={(event) => updateSetting('syncId', event.target.value)} required />
          </label>
          <label>
            <span>PIN Code</span>
            <input value={settings.pinCode} onChange={(event) => updateSetting('pinCode', event.target.value)} type="password" required />
          </label>
          <button type="submit">Save and enter</button>
          <button className="secondary-button" type="button" onClick={clearSettings}>
            Clear saved connection
          </button>
          {message && <span>{message}</span>}
        </form>
      </main>
    );
  }

  return <GameApp connected={Boolean(client && isReadyForConnection(settings))} onSignOut={signOut} />;
}

createRoot(document.getElementById('root')!).render(<AuthGate />);
