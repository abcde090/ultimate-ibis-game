// Pure water geometry shared by gameplay, AI, and tests.

import { POND, SEA, WORLD } from './layoutData';

export function inWater(x: number, y: number): boolean {
  if (y >= SEA.topY && y <= WORLD.h) return true;
  return inPond(x, y);
}

export function inPond(x: number, y: number): boolean {
  const dx = (x - POND.cx) / POND.rx;
  const dy = (y - POND.cy) / POND.ry;
  return dx * dx + dy * dy <= 1;
}

// Tangential slide around the pond for actors that refuse to swim.
// Ported from v1 (with the sticky-direction fix for the apex oscillation).
export interface Slider {
  x: number;
  y: number;
  slideSign?: number | null;
}

export function slideAroundPond(
  actor: Slider,
  desiredDir: { x: number; y: number },
  stepLen: number,
): { x: number; y: number } | null {
  const u = (actor.x - POND.cx) / POND.rx;
  const v = (actor.y - POND.cy) / POND.ry;
  const mag = Math.hypot(u, v) || 1;
  let tx = (-v / mag) * POND.rx;
  let ty = (u / mag) * POND.ry;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;
  if (!actor.slideSign) {
    const dot = tx * desiredDir.x + ty * desiredDir.y;
    actor.slideSign = dot >= 0 ? 1 : -1;
  }
  const nx = actor.x + tx * actor.slideSign * stepLen;
  const ny = actor.y + ty * actor.slideSign * stepLen;
  if (inPond(nx, ny)) return null;
  return { x: nx, y: ny };
}
