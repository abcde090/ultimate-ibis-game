// Sprite metadata shared between the game and the atlas baker.
// (The baker imports from here so art and gameplay can't drift apart.)

// Beak tip offset from the ibis sprite anchor (bottom-centre), left-facing.
// Mirror x for right-facing. Carried items attach here.
export const IBIS_BEAK_OFFSET = { x: -24, y: -44 } as const;

// Hand offset for humans carrying items home.
export const HUMAN_HAND_OFFSET = { x: -14, y: -52 } as const;

// Dog mouth, magpie talons.
export const DOG_MOUTH_OFFSET = { x: -22, y: -18 } as const;
export const MAGPIE_TALON_OFFSET = { x: 0, y: -8 } as const;

// Animation speeds (frames per second) by animation name suffix.
export const ANIM_FPS: Record<string, number> = {
  idle: 3,
  waddle: 10,
  walk: 8,
  chase: 12,
  startled: 1,
  slip: 6,
  sit: 1,
  flap: 14,
  swim: 4,
  squawk: 10,
  run: 12,
  perch: 3,
  fly: 10,
  swoop: 1,
  stand: 3,
};

// Animations that play once instead of looping.
export const ANIM_ONESHOT = new Set(['flap', 'squawk', 'startled', 'slip']);
