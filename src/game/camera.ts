import type { GameState, Vec } from './types';

export function getCameraScale(game: GameState) {
  const shortSide = Math.min(game.width, game.height);
  if (shortSide <= 520) return 0.74;
  if (shortSide <= 720) return 0.84;
  return 1;
}

export function getWorldView(game: GameState) {
  const scale = getCameraScale(game);
  return {
    scale,
    width: game.width / scale,
    height: game.height / scale,
  };
}

export function getCamera(game: GameState): Vec {
  const view = getWorldView(game);
  return {
    x: Math.max(-game.mapWidth / 2, Math.min(game.mapWidth / 2 - view.width, game.player.x - view.width / 2)),
    y: Math.max(-game.mapHeight / 2, Math.min(game.mapHeight / 2 - view.height, game.player.y - view.height / 2)),
  };
}
