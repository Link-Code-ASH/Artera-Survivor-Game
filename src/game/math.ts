import type { Vec } from './types';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function len(v: Vec) {
  return Math.hypot(v.x, v.y);
}

export function norm(v: Vec): Vec {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

export function seededNoise(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
