// The star. 64×72 frames, anchor bottom-centre, authored facing LEFT.
// Cycles: idle(2), waddle(4), flap(3), swim(2), squawk(2).

import { SpriteFrame, doc, ellipse, line, path, shadow, PAL } from '../svg';

const W = 64;
const H = 72;
const CX = 32;
const FOOT = 68; // anchor line
// Final size trim around the feet (the body is already drawn slim/small);
// lands the bird at roughly half an adult human's height.
const SCALE = 0.85;

interface Pose {
  legL: number;   // forward/back offset of left leg foot, px
  legR: number;
  bob: number;    // body lift
  beakOpen: boolean;
  wings: 'folded' | 'mid' | 'up';
  swim: boolean;
}

// A slender wading bird, not a goose: small horizontal body, long thin
// legs, neck carried up-and-forward. Authored facing left.
function ibisBody(p: Pose): string {
  const bx = 36;                                  // body centre x (toward the rear)
  const by = FOOT - 22 - p.bob + (p.swim ? 11 : 0); // body centre y
  const parts: string[] = [];

  if (!p.swim) {
    parts.push(shadow(CX, FOOT, 13));
    // Legs — long and thin.
    parts.push(line(33, by + 5, 33 + p.legL, FOOT, '#3a3a3a', 1.8));
    parts.push(line(40, by + 5, 40 + p.legR, FOOT, '#3a3a3a', 1.8));
  } else {
    parts.push(ellipse(CX, by + 8, 17, 4, 'rgba(255,255,255,0.45)'));
  }

  // Black tail plumes at the rear.
  parts.push(path(
    `M ${bx + 8} ${by - 3} Q ${bx + 19} ${by - 5} ${bx + 17} ${by + 4} Q ${bx + 11} ${by + 3} ${bx + 6} ${by + 4} Z`,
    PAL.ink,
  ));

  // Body — slim horizontal oval.
  parts.push(ellipse(bx, by, 13, 8, PAL.ibisBody, { stroke: PAL.outline, rot: -5 }));
  // Wing.
  if (p.wings === 'folded') {
    parts.push(ellipse(bx + 1, by - 1, 8.5, 4.5, PAL.ibisShade, { rot: -7 }));
  } else {
    const lift = p.wings === 'up' ? -14 : -5;
    parts.push(path(
      `M ${bx} ${by - 3} Q ${bx + 13} ${by + lift} ${bx + 21} ${by + lift + 3}`
      + ` Q ${bx + 11} ${by + 3} ${bx} ${by + 1} Z`,
      PAL.ibisBody, { stroke: PAL.outline, sw: 1 },
    ));
    parts.push(path(
      `M ${bx + 14} ${by + lift + 1} Q ${bx + 20} ${by + lift + 2} ${bx + 21} ${by + lift + 3} L ${bx + 15} ${by + lift + 5} Z`,
      PAL.ink,
    ));
  }

  // Neck — slim, from the body's front up and slightly forward to the head.
  const hx = 19;
  const hy = by - 15;
  parts.push(path(
    `M ${bx - 9} ${by - 2} Q ${bx - 17} ${by - 8} ${hx + 2} ${hy + 3}`,
    'none', { stroke: PAL.ibisBody, sw: 5 },
  ));
  // Bald black head.
  parts.push(ellipse(hx, hy, 5, 4.5, PAL.ink, { rot: 10 }));
  // Long, down-curved black bill.
  if (p.beakOpen) {
    parts.push(path(`M ${hx - 4} ${hy - 1} Q ${hx - 14} ${hy + 1} ${hx - 17} ${hy + 11}`, 'none', { stroke: PAL.ink, sw: 2.6 }));
    parts.push(path(`M ${hx - 4} ${hy + 2} Q ${hx - 11} ${hy + 8} ${hx - 12} ${hy + 17}`, 'none', { stroke: PAL.ink, sw: 2.6 }));
  } else {
    parts.push(path(`M ${hx - 4} ${hy} Q ${hx - 16} ${hy + 3} ${hx - 18} ${hy + 15}`, 'none', { stroke: PAL.ink, sw: 3.2 }));
  }
  // Eye.
  parts.push(ellipse(hx - 0.5, hy - 1, 1.2, 1.2, '#e8e4d8'));

  return parts.join('');
}

function frame(name: string, p: Pose): SpriteFrame {
  const scaled = `<g transform="translate(${CX} ${FOOT}) scale(${SCALE}) translate(${-CX} ${-FOOT})">${ibisBody(p)}</g>`;
  return { name, w: W, h: H, svg: doc(W, H, scaled) };
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
// right-facing. Items carried in the beak attach here. Derived from the bill
// tip of the design above after the SCALE wrap (keep in sync with
// src/world/spriteMeta.ts, which the game actually imports).
export const IBIS_BEAK_OFFSET = { x: -26, y: -23 };
export { W as IBIS_W, H as IBIS_H, SCALE as IBIS_SCALE };
