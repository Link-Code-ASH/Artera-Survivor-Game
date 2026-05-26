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
import { characterDescription, characterName, characters, weaponDescription, weaponName, weapons } from './content';
import { getCamera, getWorldView } from './game/camera';
import { clamp, len, norm, seededNoise } from './game/math';
import { newGame } from './game/state';
import { applyUpgrade, rerollUpgrades, startNextStage, updateGame } from './game/systems';
import type { Bullet, CharacterDefinition, Direction, Enemy, GameState, Gem, Upgrade, Vec, WeaponDefinition } from './game/types';
import './styles.css';

const keys = new Set<string>();
const pointerMove: Vec = { x: 0, y: 0 };
let pointerActive = false;

type JoystickState = {
  active: boolean;
  baseX: number;
  baseY: number;
  knobX: number;
  knobY: number;
};

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
const forestGoblinAtlas = new Image();
forestGoblinAtlas.src = 'assets/images/enemies/forest-goblin-2dir.png';
const xpGemImage = new Image();
xpGemImage.src = 'assets/images/items/gems/xp-gem-small.png';

function requestFullScreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    root.requestFullscreen().catch(() => undefined);
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
  return len(v) > 1 ? norm(v) : v;
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
  if (game.status === 'lounge') {
    drawCenterMessage(ctx, game, 'WAITING ROOM', '보석으로 능력을 구매하고 다음 스테이지를 준비합니다');
  }
  if (game.status === 'gameover') {
    drawCenterMessage(ctx, game, 'GAME OVER', `${formatTime(game.time)} 생존`);
  }
}

function drawMap(ctx: CanvasRenderingContext2D, game: GameState, camera: Vec) {
  drawForestGround(ctx, game, camera);
  drawForestProps(ctx, game, camera);
  drawMapBounds(ctx, game, camera);
}

function drawMapBounds(ctx: CanvasRenderingContext2D, game: GameState, camera: Vec) {
  const left = -game.mapWidth / 2 - camera.x;
  const top = -game.mapHeight / 2 - camera.y;
  ctx.save();
  ctx.strokeStyle = 'rgba(248, 220, 134, 0.42)';
  ctx.lineWidth = 4;
  ctx.strokeRect(left, top, game.mapWidth, game.mapHeight);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.lineWidth = 18;
  ctx.strokeRect(left - 9, top - 9, game.mapWidth + 18, game.mapHeight + 18);
  ctx.restore();
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
  if (xpGemImage.complete && xpGemImage.naturalWidth > 0) {
    const size = gem.r * 4.83;
    ctx.save();
    ctx.shadowColor = 'rgba(117, 217, 255, 0.7)';
    ctx.shadowBlur = 12;
    ctx.drawImage(xpGemImage, gem.x - size / 2, gem.y - size / 2, size, size);
    ctx.restore();
    return;
  }

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
  if (enemy.kind === 'goblin' && forestGoblinAtlas.complete && forestGoblinAtlas.naturalWidth > 0) {
    const columns = 4;
    const rows = 2;
    const sourceWidth = forestGoblinAtlas.naturalWidth / columns;
    const sourceHeight = forestGoblinAtlas.naturalHeight / rows;
    const frame = Math.floor(game.time * 6 + enemy.id * 0.31) % columns;
    const row = enemy.x > game.player.x ? 1 : 0;
    const drawWidth = 72;
    const drawHeight = 72 + Math.sin(game.time * 10 + enemy.id) * 1.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 15, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(
      forestGoblinAtlas,
      Math.floor(frame * sourceWidth),
      Math.floor(row * sourceHeight),
      Math.ceil(sourceWidth),
      Math.ceil(sourceHeight),
      enemy.x - drawWidth / 2,
      enemy.y - drawHeight * 0.78,
      drawWidth,
      drawHeight,
    );
    return;
  }

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
    const columns = 4;
    const rows = 4;
    const sourceWidth = caidenAtlas.naturalWidth / columns;
    const sourceHeight = caidenAtlas.naturalHeight / rows;
    const frame = p.moving ? Math.floor(game.time * 8) % 4 : 0;
    const rowByDirection: Record<Direction, number> = {
      down: 0,
      left: 1,
      right: 1,
      up: 3,
    };
    const row = rowByDirection[p.facing];
    const sourceX = Math.floor(frame * sourceWidth);
    const sourceY = Math.floor(row * sourceHeight);
    const heroScale = 1.56;
    const drawWidth = 74 * heroScale;
    const drawHeight = (p.facing === 'up' ? 86 : 74) * heroScale;
    const drawY = p.y - drawHeight * (p.facing === 'up' ? 0.48 : 0.68);

    ctx.save();
    ctx.translate(p.x, drawY);
    if (p.facing === 'right') {
      ctx.scale(-1, 1);
    }
    try {
      ctx.drawImage(
        caidenAtlas,
        sourceX,
        sourceY,
        Math.ceil(sourceWidth),
        Math.ceil(sourceHeight),
        -drawWidth / 2,
        0,
        drawWidth,
        drawHeight,
      );
    } catch {
      ctx.restore();
      drawHeroFallback(ctx, game);
      return;
    }
    ctx.restore();
    return;
  }

  drawHeroFallback(ctx, game);
}

function drawHeroFallback(ctx: CanvasRenderingContext2D, game: GameState) {
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
    if (gameRef.current.status === 'lounge') {
      syncSnapshot();
      return;
    }
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
      updateGame(gameRef.current, dt, inputVector);
      if (gameRef.current.status === 'gameover' && !savedGameOverRef.current) {
        savedGameOverRef.current = true;
        const nextSaveData = recordRun(saveData, {
          time: gameRef.current.time,
          level: gameRef.current.stage,
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
    applyUpgrade(game, upgrade);
    syncSnapshot();
  };

  const skipLoungeUpgrade = () => {
    unlockAudio();
    playSound('button');
    startNextStage(gameRef.current);
    syncSnapshot();
  };

  const rerollLoungeUpgrades = () => {
    unlockAudio();
    rerollUpgrades(gameRef.current);
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
            <strong>{formatTime(Math.max(0, snapshot.stageDuration - snapshot.stageTime))}</strong>
            <span>남은 시간</span>
          </div>
          <div>
            <strong>Stage {snapshot.stage}</strong>
            <span>스테이지</span>
          </div>
          <div>
            <strong>{snapshot.enemies.length}</strong>
            <span>적</span>
          </div>
          <div>
            <strong>{snapshot.player.gemsCollected}</strong>
            <span>보석</span>
          </div>
          <div>
            <strong>{snapshot.player.upgradeCurrency}</strong>
            <span>재화</span>
          </div>
        </div>

        <div className="save-status">
          <strong>{saveMessage}</strong>
          <span>Runs {saveData.stats.totalRuns} · Best {formatTime(saveData.stats.bestTime)} · Best Lv {saveData.stats.bestLevel}</span>
        </div>

        <div className="bars hud-bars">
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
          <button
            onClick={snapshot.status === 'running' ? togglePause : start}
            disabled={snapshot.status === 'lounge'}
            aria-label={snapshot.status === 'running' ? '일시정지' : '시작'}
          >
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

        {(snapshot.status === 'levelup' || snapshot.status === 'lounge') && (
          <div className={`upgrade-layer ${snapshot.status === 'lounge' ? 'lounge-layer' : ''}`}>
            <div className="upgrade-panel">
              {snapshot.status === 'lounge' && (
                <div className="lounge-header">
                  <span>Stage {snapshot.stage} Clear</span>
                  <strong>대기실</strong>
                  <p>수집한 보석으로 능력을 구매하고 다음 스테이지로 이동합니다.</p>
                  <em>보유 보석 {snapshot.player.upgradeCurrency} · 초기화 {snapshot.rerollCost}</em>
                </div>
              )}
              <div className="upgrade-list">
                {snapshot.upgrades.map((upgrade) => (
                  <button
                    key={upgrade.id}
                    data-upgrade={upgrade.id}
                    disabled={snapshot.status === 'lounge' && snapshot.player.upgradeCurrency < upgrade.cost}
                    onClick={() => chooseUpgrade(upgrade)}
                  >
                    <strong>{upgrade.title}</strong>
                    <span>{upgrade.body}</span>
                    {snapshot.status === 'lounge' && <small>{upgrade.cost} 보석</small>}
                  </button>
                ))}
                {snapshot.status === 'lounge' && snapshot.upgrades.length === 0 && (
                  <div className="lounge-empty">
                    <strong>선택지를 모두 구매했습니다</strong>
                    <span>초기화해서 새 선택지를 뽑거나 다음 스테이지로 이동하세요.</span>
                  </div>
                )}
              </div>
              {snapshot.status === 'lounge' && (
                <div className="lounge-actions">
                  <button
                    className="lounge-reroll-button"
                    type="button"
                    disabled={snapshot.player.upgradeCurrency < snapshot.rerollCost}
                    onClick={rerollLoungeUpgrades}
                  >
                    선택지 초기화 · {snapshot.rerollCost} 보석
                  </button>
                  <button className="lounge-skip-button" type="button" onClick={skipLoungeUpgrade}>
                    다음 스테이지
                  </button>
                </div>
              )}
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

