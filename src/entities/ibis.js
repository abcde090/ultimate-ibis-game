import { WORLD, POND, RECTS, TREES } from '../world/level.js';
import {
  circlePushout, circleRectPushout, pointInEllipse, clamp,
} from '../engine/collision.js';

const WALK_SPEED = 175;
const SPRINT_SPEED = 285;
const POND_FACTOR = 0.55;
const ACCEL = 1400;
const FRICTION = 8;

export function updateIbis(player, input, bins, dt) {
  const axis = input.axis();
  const moving = axis.x !== 0 || axis.y !== 0;
  player.moving = moving;
  player.sprinting = input.sprinting() && moving;

  player.inPond = pointInEllipse(player.x, player.y, POND.cx, POND.cy, POND.rx, POND.ry);

  let maxSpeed = player.sprinting ? SPRINT_SPEED : WALK_SPEED;
  if (player.inPond) maxSpeed *= POND_FACTOR;

  if (moving) {
    const mag = Math.hypot(axis.x, axis.y);
    player.vx += (axis.x / mag) * ACCEL * dt;
    player.vy += (axis.y / mag) * ACCEL * dt;
    if (axis.x !== 0) player.facing = axis.x > 0 ? 1 : -1;
  } else {
    player.vx -= player.vx * Math.min(1, FRICTION * dt);
    player.vy -= player.vy * Math.min(1, FRICTION * dt);
  }

  const speed = Math.hypot(player.vx, player.vy);
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  resolveWorldCollisions(player, bins);

  if (moving) {
    player.walkPhase += dt * (player.sprinting ? 16 : 10);
  }
  if (player.honkTimer > 0) player.honkTimer -= dt;
}

export function resolveWorldCollisions(body, bins) {
  body.x = clamp(body.x, body.r, WORLD.w - body.r);
  body.y = clamp(body.y, body.r, WORLD.h - body.r);

  for (const rect of RECTS) {
    const push = circleRectPushout({ x: body.x, y: body.y, r: body.r }, rect);
    if (push) { body.x += push.x; body.y += push.y; }
  }
  for (const tree of TREES) {
    const push = circlePushout({ x: body.x, y: body.y, r: body.r }, tree);
    if (push) { body.x += push.x; body.y += push.y; }
  }
  for (const bin of bins) {
    if (!bin.upright) continue; // knocked bins lie flat, walkable
    const push = circlePushout({ x: body.x, y: body.y, r: body.r }, bin);
    if (push) { body.x += push.x; body.y += push.y; }
  }
}

// World position of the beak tip — where grabs happen and items ride.
export function beakTip(player) {
  return {
    x: player.x + player.facing * 30,
    y: player.y - 26,
  };
}
