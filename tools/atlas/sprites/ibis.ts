// The star. 64×72 frames, anchor bottom-centre, authored facing LEFT.
// Cycles: idle(2), waddle(4), flap(3), swim(2), squawk(2).

import { SpriteFrame, doc, ellipse, line, path, shadow, PAL } from '../svg';

const W = 64;
const H = 72;
const CX = 32;
const FOOT = 68; // anchor line

interface Pose {
  legL: number;   // forward/back offset of left leg foot, px
  legR: number;
  bob: number;    // body lift
  beakOpen: boolean;
  wings: 'folded' | 'mid' | 'up';
  swim: boolean;
}

function ibisBody(p: Pose): string {
  const by = FOOT - 34 - p.bob + (p.swim ? 14 : 0); // body centre y
  const parts: string[] = [];

  if (!p.swim) {
    parts.push(shadow(CX, FOOT, 17));
    // Legs
    parts.push(line(CX - 5, by + 9, CX - 5 + p.legL, FOOT, '#3a3a3a', 2.6));
    parts.push(line(CX + 6, by + 9, CX + 6 + p.legR, FOOT, '#3a3a3a', 2.6));
  } else {
    // Water line ripple
    parts.push(ellipse(CX, by + 12, 22, 5, 'rgba(255,255,255,0.45)'));
  }

  // Body
  parts.push(ellipse(CX + 2, by, 17, 11, PAL.ibisBody, { stroke: PAL.outline, rot: -7 }));
  // Wing detail
  if (p.wings === 'folded') {
    parts.push(ellipse(CX + 6, by - 2, 10, 6.5, PAL.ibisShade, { rot: -10 }));
  } else {
    const lift = p.wings === 'up' ? -16 : -6;
    parts.push(path(
      `M ${CX + 2} ${by - 4} Q ${CX + 18} ${by + lift} ${CX + 28} ${by + lift + 4}`
      + ` Q ${CX + 16} ${by + 4} ${CX + 2} ${by + 2} Z`,
      PAL.ibisBody, { stroke: PAL.outline, sw: 1 },
    ));
    // Black wing tips
    parts.push(path(
      `M ${CX + 20} ${by + lift + 1} Q ${CX + 27} ${by + lift + 2} ${CX + 28} ${by + lift + 4}`
      + ` L ${CX + 22} ${by + lift + 6} Z`,
      PAL.ink,
    ));
  }
  // Black tail feathers
  parts.push(path(
    `M ${CX + 13} ${by - 3} Q ${CX + 26} ${by - 3} ${CX + 24} ${by + 7} Q ${CX + 17} ${by + 5} ${CX + 11} ${by + 6} Z`,
    PAL.ink,
  ));

  // Neck: S-curve up to head
  const hx = CX - 15;
  const hy = by - 24;
  parts.push(path(
    `M ${CX - 9} ${by - 3} Q ${hx - 1} ${by - 13} ${hx + 1} ${hy + 3}`,
    'none', { stroke: PAL.ibisBody, sw: 7 },
  ));
  // Bald black head
  parts.push(ellipse(hx, hy, 6.5, 6, PAL.ink, { rot: 12 }));
  // Beak: long down-curve
  if (p.beakOpen) {
    parts.push(path(`M ${hx - 5} ${hy - 1} Q ${hx - 19} ${hy + 1} ${hx - 23} ${hy + 11}`, 'none', { stroke: PAL.ink, sw: 3 }));
    parts.push(path(`M ${hx - 5} ${hy + 2} Q ${hx - 15} ${hy + 9} ${hx - 16} ${hy + 19}`, 'none', { stroke: PAL.ink, sw: 3 }));
  } else {
    parts.push(path(`M ${hx - 5} ${hy} Q ${hx - 21} ${hy + 3} ${hx - 24} ${hy + 16}`, 'none', { stroke: PAL.ink, sw: 4 }));
  }
  // Eye
  parts.push(ellipse(hx - 0.5, hy - 1.5, 1.4, 1.4, '#e8e4d8'));

  return parts.join('');
}

function frame(name: string, p: Pose): SpriteFrame {
  return { name, w: W, h: H, svg: doc(W, H, ibisBody(p)) };
}

export function ibisFrames(): SpriteFrame[] {
  const f: SpriteFrame[] = [];
  // idle: gentle bob
  f.push(frame('ibis/idle/0', { legL: 0, legR: 0, bob: 0, beakOpen: false, wings: 'folded', swim: false }));
  f.push(frame('ibis/idle/1', { legL: 0, legR: 0, bob: 1.5, beakOpen: false, wings: 'folded', swim: false }));
  // waddle: 4-step cycle
  const stride = [5, 0, -5, 0] as const;
  for (let i = 0; i < 4; i++) {
    f.push(frame(`ibis/waddle/${i}`, {
      legL: stride[i] ?? 0,
      legR: stride[(i + 2) % 4] ?? 0,
      bob: i % 2 === 0 ? 2.5 : 0,
      beakOpen: false, wings: 'folded', swim: false,
    }));
  }
  // flap: hop with wings
  f.push(frame('ibis/flap/0', { legL: 2, legR: -2, bob: 4, beakOpen: false, wings: 'mid', swim: false }));
  f.push(frame('ibis/flap/1', { legL: 4, legR: 4, bob: 12, beakOpen: false, wings: 'up', swim: false }));
  f.push(frame('ibis/flap/2', { legL: 3, legR: -1, bob: 7, beakOpen: false, wings: 'mid', swim: false }));
  // swim
  f.push(frame('ibis/swim/0', { legL: 0, legR: 0, bob: 0, beakOpen: false, wings: 'folded', swim: true }));
  f.push(frame('ibis/swim/1', { legL: 0, legR: 0, bob: 1.5, beakOpen: false, wings: 'folded', swim: true }));
  // squawk
  f.push(frame('ibis/squawk/0', { legL: 0, legR: 0, bob: 1, beakOpen: true, wings: 'folded', swim: false }));
  f.push(frame('ibis/squawk/1', { legL: 0, legR: 0, bob: 2.5, beakOpen: true, wings: 'mid', swim: false }));
  return f;
}

// Beak-tip offset from sprite anchor (left-facing); the game mirrors for
// right-facing. Items carried in the beak attach here.
export const IBIS_BEAK_OFFSET = { x: -24, y: -44 };
export { W as IBIS_W, H as IBIS_H };
