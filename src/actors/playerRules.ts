// Pure movement & verb rules for the ibis. No Phaser imports — unit tested.

export const PLAYER = {
  walkSpeed: 200,
  sprintSpeed: 330,
  touchMinSpeed: 130,  // gentlest joystick push (analog floor)
  swimFactor: 0.55,
  dragFactor: 0.4,
  accel: 1800,
  decay: 9,            // exponential velocity decay when idle
  bodyRadius: 12,
  flapSeconds: 0.55,   // airborne time
  flapBoost: 1.45,     // speed multiplier while airborne
  flapCooldown: 0.25,
  hideSettleSeconds: 0.35, // must be this still inside a bush to vanish
} as const;

export interface MoveState {
  vx: number;
  vy: number;
  facing: -1 | 1;
}

export interface MoveContext {
  axisX: number;       // -1..1
  axisY: number;
  sprint: boolean;
  // Analog throttle 0..1 from a touch joystick — when set, speed ramps with
  // how far the stick is pushed (touchMinSpeed..sprintSpeed). null for
  // keyboard/gamepad, which stay digital (walk, or sprint while held).
  analogThrottle: number | null;
  swimming: boolean;
  dragging: boolean;
  airborne: boolean;
  dt: number;
}

export function maxSpeed(
  c: Pick<MoveContext, 'sprint' | 'analogThrottle' | 'swimming' | 'dragging' | 'airborne'>,
): number {
  let speed: number;
  if (c.analogThrottle != null && !c.dragging) {
    const t = Math.min(1, Math.max(0, c.analogThrottle));
    speed = PLAYER.touchMinSpeed + (PLAYER.sprintSpeed - PLAYER.touchMinSpeed) * t;
  } else {
    speed = c.sprint && !c.dragging ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  }
  if (c.swimming) speed *= PLAYER.swimFactor;
  if (c.dragging) speed *= PLAYER.dragFactor;
  if (c.airborne) speed *= PLAYER.flapBoost;
  return speed;
}

export function stepMovement(s: MoveState, c: MoveContext): MoveState {
  let { vx, vy, facing } = s;
  const moving = c.axisX !== 0 || c.axisY !== 0;

  if (moving) {
    const mag = Math.hypot(c.axisX, c.axisY);
    vx += (c.axisX / mag) * PLAYER.accel * c.dt;
    vy += (c.axisY / mag) * PLAYER.accel * c.dt;
    if (c.axisX !== 0) facing = c.axisX > 0 ? 1 : -1;
  } else if (!c.airborne) {
    const k = Math.min(1, PLAYER.decay * c.dt);
    vx -= vx * k;
    vy -= vy * k;
    if (Math.abs(vx) < 1) vx = 0;
    if (Math.abs(vy) < 1) vy = 0;
  }

  const cap = maxSpeed(c);
  const speed = Math.hypot(vx, vy);
  if (speed > cap) {
    vx = (vx / speed) * cap;
    vy = (vy / speed) * cap;
  }
  return { vx, vy, facing };
}

export type PlayerAnim = 'idle' | 'waddle' | 'flap' | 'swim' | 'squawk';

export function pickAnim(opts: {
  airborne: boolean;
  swimming: boolean;
  squawking: boolean;
  moving: boolean;
}): PlayerAnim {
  if (opts.airborne) return 'flap';
  if (opts.squawking) return 'squawk';
  if (opts.swimming) return 'swim';
  return opts.moving ? 'waddle' : 'idle';
}

// Flap is allowed on land/water when not dragging and not already airborne.
export function canFlap(opts: { airborne: boolean; dragging: boolean; cooldown: number }): boolean {
  return !opts.airborne && !opts.dragging && opts.cooldown <= 0;
}
