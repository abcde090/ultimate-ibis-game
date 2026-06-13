import { describe, expect, test } from 'vitest';
import { PLAYER, maxSpeed, stepMovement, pickAnim, canFlap } from '../src/actors/playerRules';

const base = { sprint: false, analogThrottle: null, swimming: false, dragging: false, airborne: false };

describe('maxSpeed (digital — keyboard/gamepad)', () => {
  test('walk, sprint, swim, drag modifiers', () => {
    expect(maxSpeed(base)).toBe(PLAYER.walkSpeed);
    expect(maxSpeed({ ...base, sprint: true })).toBe(PLAYER.sprintSpeed);
    expect(maxSpeed({ ...base, swimming: true })).toBeCloseTo(PLAYER.walkSpeed * PLAYER.swimFactor);
    expect(maxSpeed({ ...base, dragging: true })).toBeCloseTo(PLAYER.walkSpeed * PLAYER.dragFactor);
  });

  test('dragging cancels sprint', () => {
    expect(maxSpeed({ ...base, sprint: true, dragging: true }))
      .toBeCloseTo(PLAYER.walkSpeed * PLAYER.dragFactor);
  });

  test('airborne boost applies', () => {
    expect(maxSpeed({ ...base, airborne: true })).toBeCloseTo(PLAYER.walkSpeed * PLAYER.flapBoost);
  });
});

describe('maxSpeed (analog — touch joystick)', () => {
  test('speed ramps from the floor at a light push to sprint at the rim', () => {
    expect(maxSpeed({ ...base, analogThrottle: 0 })).toBeCloseTo(PLAYER.touchMinSpeed);
    expect(maxSpeed({ ...base, analogThrottle: 1 })).toBeCloseTo(PLAYER.sprintSpeed);
    const half = maxSpeed({ ...base, analogThrottle: 0.5 });
    expect(half).toBeGreaterThan(PLAYER.touchMinSpeed);
    expect(half).toBeLessThan(PLAYER.sprintSpeed);
  });

  test('pushing further is monotonically faster', () => {
    const a = maxSpeed({ ...base, analogThrottle: 0.3 });
    const b = maxSpeed({ ...base, analogThrottle: 0.6 });
    const c = maxSpeed({ ...base, analogThrottle: 0.9 });
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  test('a near-full push already beats walk speed (the whole point of the fix)', () => {
    expect(maxSpeed({ ...base, analogThrottle: 0.7 })).toBeGreaterThan(PLAYER.walkSpeed);
  });

  test('throttle is clamped to 0..1', () => {
    expect(maxSpeed({ ...base, analogThrottle: 5 })).toBeCloseTo(PLAYER.sprintSpeed);
    expect(maxSpeed({ ...base, analogThrottle: -1 })).toBeCloseTo(PLAYER.touchMinSpeed);
  });

  test('dragging ignores analog throttle and stays slow', () => {
    expect(maxSpeed({ ...base, analogThrottle: 1, dragging: true }))
      .toBeCloseTo(PLAYER.walkSpeed * PLAYER.dragFactor);
  });

  test('swim and flap modifiers still compose with analog', () => {
    expect(maxSpeed({ ...base, analogThrottle: 1, swimming: true }))
      .toBeCloseTo(PLAYER.sprintSpeed * PLAYER.swimFactor);
  });
});

describe('stepMovement', () => {
  test('accelerates toward the axis and faces travel direction', () => {
    const out = stepMovement(
      { vx: 0, vy: 0, facing: -1 },
      { ...base, axisX: 1, axisY: 0, dt: 1 / 60 },
    );
    expect(out.vx).toBeGreaterThan(0);
    expect(out.facing).toBe(1);
  });

  test('caps at max speed', () => {
    let s = { vx: 0, vy: 0, facing: 1 as const };
    for (let i = 0; i < 120; i++) {
      s = { ...stepMovement(s, { ...base, axisX: 1, axisY: 0, dt: 1 / 60 }), facing: 1 };
    }
    expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(PLAYER.walkSpeed + 0.001);
  });

  test('diagonal input is normalised (no speed advantage)', () => {
    let s = { vx: 0, vy: 0, facing: 1 as const };
    for (let i = 0; i < 120; i++) {
      s = { ...stepMovement(s, { ...base, axisX: 1, axisY: 1, dt: 1 / 60 }), facing: 1 };
    }
    expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(PLAYER.walkSpeed + 0.001);
  });

  test('decays to a full stop when idle on the ground', () => {
    let s = { vx: 200, vy: 0, facing: 1 as const };
    for (let i = 0; i < 90; i++) {
      s = { ...stepMovement(s, { ...base, axisX: 0, axisY: 0, dt: 1 / 60 }), facing: 1 };
    }
    expect(s.vx).toBe(0);
    expect(s.vy).toBe(0);
  });

  test('keeps momentum while airborne with no input', () => {
    const out = stepMovement(
      { vx: 200, vy: 0, facing: 1 },
      { ...base, airborne: true, axisX: 0, axisY: 0, dt: 1 / 60 },
    );
    expect(out.vx).toBeGreaterThan(190);
  });
});

describe('pickAnim', () => {
  test('priority: flap > squawk > swim > waddle > idle', () => {
    expect(pickAnim({ airborne: true, swimming: true, squawking: true, moving: true })).toBe('flap');
    expect(pickAnim({ airborne: false, swimming: true, squawking: true, moving: true })).toBe('squawk');
    expect(pickAnim({ airborne: false, swimming: true, squawking: false, moving: true })).toBe('swim');
    expect(pickAnim({ airborne: false, swimming: false, squawking: false, moving: true })).toBe('waddle');
    expect(pickAnim({ airborne: false, swimming: false, squawking: false, moving: false })).toBe('idle');
  });
});

describe('canFlap', () => {
  test('blocked while airborne, dragging, or cooling down', () => {
    expect(canFlap({ airborne: false, dragging: false, cooldown: 0 })).toBe(true);
    expect(canFlap({ airborne: true, dragging: false, cooldown: 0 })).toBe(false);
    expect(canFlap({ airborne: false, dragging: true, cooldown: 0 })).toBe(false);
    expect(canFlap({ airborne: false, dragging: false, cooldown: 0.1 })).toBe(false);
  });
});
