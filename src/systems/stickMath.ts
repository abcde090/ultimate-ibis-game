// Pure virtual-joystick math. Maps a thumb offset from the stick centre to a
// movement axis (magnitude 0..1, direction preserved) plus a sprint flag when
// the thumb is pushed near the rim. No Phaser, no DOM — unit tested.

export interface StickInput {
  x: number; // -1..1
  y: number; // -1..1
  sprint: boolean;
}

export interface StickTuning {
  dead: number;    // fraction of radius treated as no-input
  sprintAt: number; // fraction of radius at/after which sprint engages
}

export const STICK_TUNING: StickTuning = { dead: 0.18, sprintAt: 0.82 };

export function stickVector(
  dx: number,
  dy: number,
  radius: number,
  tuning: StickTuning = STICK_TUNING,
): StickInput {
  if (radius <= 0) return { x: 0, y: 0, sprint: false };
  const d = Math.hypot(dx, dy);
  if (d < radius * tuning.dead) return { x: 0, y: 0, sprint: false };

  const clamped = Math.min(d, radius);
  const mag = clamped / radius; // 0..1
  return {
    x: (dx / d) * mag,
    y: (dy / d) * mag,
    sprint: mag >= tuning.sprintAt,
  };
}

// Clamp the visible thumb to the base circle (for drawing).
export function clampThumb(dx: number, dy: number, radius: number): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  if (d <= radius || d === 0) return { x: dx, y: dy };
  return { x: (dx / d) * radius, y: (dy / d) * radius };
}
