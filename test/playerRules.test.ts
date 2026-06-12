import { describe, expect, test } from 'vitest';
import { PLAYER, maxSpeed, stepMovement, pickAnim, canFlap } from '../src/actors/playerRules';

const base = { sprint: false, swimming: false, dragging: false, airborne: false };

describe('maxSpeed', () => {
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
