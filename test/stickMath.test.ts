import { describe, expect, test } from 'vitest';
import { stickVector, clampThumb, STICK_TUNING } from '../src/systems/stickMath';

const R = 80;

describe('stickVector', () => {
  test('dead zone returns no input', () => {
    expect(stickVector(0, 0, R)).toEqual({ x: 0, y: 0, sprint: false });
    const justInside = R * STICK_TUNING.dead - 1;
    expect(stickVector(justInside, 0, R)).toEqual({ x: 0, y: 0, sprint: false });
  });

  test('preserves direction and scales magnitude 0..1', () => {
    const half = stickVector(R / 2, 0, R);
    expect(half.x).toBeCloseTo(0.5);
    expect(half.y).toBe(0);
    const diag = stickVector(R, R, R); // beyond rim → clamped to magnitude 1
    expect(Math.hypot(diag.x, diag.y)).toBeCloseTo(1);
    expect(diag.x).toBeCloseTo(Math.SQRT1_2);
    expect(diag.y).toBeCloseTo(Math.SQRT1_2);
  });

  test('magnitude never exceeds 1 past the rim', () => {
    const far = stickVector(R * 5, 0, R);
    expect(far.x).toBeCloseTo(1);
    expect(Math.hypot(far.x, far.y)).toBeLessThanOrEqual(1.0000001);
  });

  test('sprint engages only near the rim', () => {
    expect(stickVector(R * 0.5, 0, R).sprint).toBe(false);
    expect(stickVector(R * STICK_TUNING.sprintAt, 0, R).sprint).toBe(true);
    expect(stickVector(R, 0, R).sprint).toBe(true);
  });

  test('negative offsets map to negative axes (up/left)', () => {
    const upLeft = stickVector(-R, -R, R);
    expect(upLeft.x).toBeLessThan(0);
    expect(upLeft.y).toBeLessThan(0);
  });

  test('zero or negative radius is safe', () => {
    expect(stickVector(10, 10, 0)).toEqual({ x: 0, y: 0, sprint: false });
  });
});

describe('clampThumb', () => {
  test('inside the base is unchanged', () => {
    expect(clampThumb(10, 20, R)).toEqual({ x: 10, y: 20 });
  });

  test('outside the base is clamped to the rim', () => {
    const c = clampThumb(R * 3, 0, R);
    expect(Math.hypot(c.x, c.y)).toBeCloseTo(R);
  });

  test('origin is safe', () => {
    expect(clampThumb(0, 0, R)).toEqual({ x: 0, y: 0 });
  });
});
