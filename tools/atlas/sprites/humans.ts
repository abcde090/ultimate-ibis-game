// One parameterised human rig → every archetype via a style table.
// 56×96 frames (kids scaled to 0.72), anchor bottom-centre, facing LEFT.
// Cycles per archetype: idle(2), walk(4), chase(4), startled(1), slip(2), sit(1).

import { SpriteFrame, doc, ellipse, line, rect, shadow, path } from '../svg';

export interface HumanStyle {
  key: string;          // atlas prefix: "human-barista"
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  hat?: { color: string; kind: 'brim' | 'cap' | 'chef' | 'floppy' };
  apron?: string;
  hiVis?: boolean;
  kid?: boolean;
}

export const HUMAN_STYLES: HumanStyle[] = [
  { key: 'human-picnicker', shirt: '#d96aa0', pants: '#41454d', skin: '#e8b48c', hair: '#5a3a22' },
  { key: 'human-bbqdad', shirt: '#5a7d9c', pants: '#6a6a72', skin: '#dba072', hair: '#888888', apron: '#e8e0d0' },
  { key: 'human-groundskeeper', shirt: '#7d9c5a', pants: '#5a5446', skin: '#c98c5f', hair: '#444444', hat: { color: '#c9b370', kind: 'brim' }, hiVis: true },
  { key: 'human-cafecustomer', shirt: '#9c6ad9', pants: '#3a3f4a', skin: '#f0c8a0', hair: '#222222', hat: { color: '#333333', kind: 'cap' } },
  { key: 'human-barista', shirt: '#4a4038', pants: '#2e2a26', skin: '#d8a87c', hair: '#3a2a1a', apron: '#8a6a4a' },
  { key: 'human-waiter', shirt: '#f0ece0', pants: '#26262e', skin: '#e0b088', hair: '#1a1a1a', apron: '#2e2e36' },
  { key: 'human-busker', shirt: '#c95f3f', pants: '#4a5568', skin: '#caa27a', hair: '#6a4a2a', hat: { color: '#7a5430', kind: 'floppy' } },
  { key: 'human-influencer', shirt: '#f5c8d8', pants: '#e8e2d8', skin: '#f0c8a0', hair: '#c9963f' },
  { key: 'human-fruitvendor', shirt: '#e0a33d', pants: '#5a5446', skin: '#b87a50', hair: '#2a2a2a', apron: '#7a9460' },
  { key: 'human-fishmonger', shirt: '#5f8ca3', pants: '#3f4854', skin: '#e8b48c', hair: '#d8d3c2', apron: '#dde4e8' },
  { key: 'human-lifeguard', shirt: '#e8c93d', pants: '#d94f4f', skin: '#c98c5f', hair: '#e8dca0', hat: { color: '#e8e0d0', kind: 'cap' } },
  { key: 'human-sunbather', shirt: '#3fb0a3', pants: '#2a7a72', skin: '#dba072', hair: '#4a2a1a', hat: { color: '#e8a0b8', kind: 'floppy' } },
  { key: 'human-clubpresident', shirt: '#f0ece0', pants: '#d8d3c2', skin: '#e8b48c', hair: '#aaaaaa', hat: { color: '#3d6b35', kind: 'cap' } },
  { key: 'human-kid-a', shirt: '#d94f4f', pants: '#3a5a8c', skin: '#e8b48c', hair: '#3a2a1a', kid: true },
  { key: 'human-kid-b', shirt: '#3fa05a', pants: '#7a5430', skin: '#b87a50', hair: '#1a1a1a', kid: true },
];

const W = 56;
const H = 96;
const CX = 28;
const FOOT = 92;

interface HumanPose {
  legL: number; legR: number;       // foot forward offsets
  armMode: 'rest' | 'swing' | 'up'; // up = chase flail
  armPhase: number;                  // -1..1 swing
  lean: number;                      // body lean (deg, negative = forward/left)
  bob: number;
  sitting?: boolean;
  slipping?: 0 | 1;                  // slip frames
}

function human(s: HumanStyle, p: HumanPose): string {
  const parts: string[] = [];

  if (p.slipping !== undefined) return slipFrame(s, p.slipping);

  const hipY = FOOT - 40 - p.bob;
  parts.push(shadow(CX, FOOT, 15));

  if (p.sitting) {
    // Sitting on the ground, legs forward
    parts.push(line(CX - 4, hipY + 18, CX - 18, FOOT - 2, s.pants, 6));
    parts.push(line(CX + 4, hipY + 18, CX - 14, FOOT, s.pants, 6));
  } else {
    parts.push(line(CX - 5, hipY + 16, CX - 5 + p.legL, FOOT, s.pants, 6));
    parts.push(line(CX + 5, hipY + 16, CX + 5 + p.legR, FOOT, s.pants, 6));
  }

  const torsoY = p.sitting ? hipY + 8 : hipY;
  const bodyParts: string[] = [];
  // Torso
  bodyParts.push(rect(CX - 11, torsoY - 14, 22, 34, s.shirt, { rx: 8 }));
  if (s.hiVis) bodyParts.push(rect(CX - 11, torsoY - 6, 22, 6, '#f5d33d'));
  if (s.apron) bodyParts.push(rect(CX - 8, torsoY - 4, 16, 22, s.apron, { rx: 4 }));

  // Arms
  const shoulderY = torsoY - 9;
  if (p.armMode === 'up') {
    const wave = p.armPhase * 6;
    bodyParts.push(line(CX - 10, shoulderY, CX - 17, shoulderY - 17 + wave, s.skin, 4.5));
    bodyParts.push(line(CX + 10, shoulderY, CX + 17, shoulderY - 17 - wave, s.skin, 4.5));
  } else if (p.armMode === 'swing') {
    bodyParts.push(line(CX - 10, shoulderY, CX - 12 + p.armPhase * 7, shoulderY + 21, s.skin, 4.5));
    bodyParts.push(line(CX + 10, shoulderY, CX + 12 - p.armPhase * 7, shoulderY + 21, s.skin, 4.5));
  } else {
    bodyParts.push(line(CX - 10, shoulderY, CX - 13, shoulderY + 21, s.skin, 4.5));
    bodyParts.push(line(CX + 10, shoulderY, CX + 13, shoulderY + 21, s.skin, 4.5));
  }

  // Head
  const headY = torsoY - 23;
  bodyParts.push(ellipse(CX, headY, 9, 9, s.skin));
  // Hair / hat
  if (s.hat) {
    if (s.hat.kind === 'brim' || s.hat.kind === 'floppy') {
      const brim = s.hat.kind === 'floppy' ? 15 : 13;
      bodyParts.push(ellipse(CX, headY - 5, brim, 4, s.hat.color));
      bodyParts.push(rect(CX - 7, headY - 15, 14, 11, s.hat.color, { rx: 5 }));
    } else if (s.hat.kind === 'cap') {
      bodyParts.push(path(`M ${CX - 9} ${headY - 4} A 9 9 0 0 1 ${CX + 9} ${headY - 4} Z`, s.hat.color));
      bodyParts.push(rect(CX - 16, headY - 5, 10, 3.5, s.hat.color, { rx: 1.5 }));
    }
  } else {
    bodyParts.push(path(`M ${CX - 8.5} ${headY - 2} A 8.5 8.5 0 0 1 ${CX + 8.5} ${headY - 2} Z`, s.hair));
  }

  const leanT = p.lean !== 0 ? `rotate(${p.lean} ${CX} ${FOOT - 20})` : '';
  parts.push(leanT ? `<g transform="${leanT}">${bodyParts.join('')}</g>` : bodyParts.join(''));
  return parts.join('');
}

function slipFrame(s: HumanStyle, stage: 0 | 1): string {
  const parts: string[] = [shadow(CX, FOOT, 17)];
  if (stage === 0) {
    // Mid-air, legs out, arms windmilling
    const hipY = FOOT - 34;
    parts.push(line(CX - 4, hipY + 12, CX - 22, hipY + 6, s.pants, 6));
    parts.push(line(CX + 4, hipY + 12, CX + 16, hipY - 2, s.pants, 6));
    parts.push(rect(CX - 11, hipY - 18, 22, 32, s.shirt, { rx: 8, rot: -18 }));
    parts.push(line(CX - 8, hipY - 12, CX - 20, hipY - 26, s.skin, 4.5));
    parts.push(line(CX + 8, hipY - 14, CX + 18, hipY - 28, s.skin, 4.5));
    parts.push(ellipse(CX + 2, hipY - 28, 9, 9, s.skin, { rot: -18 }));
    parts.push(path(`M ${CX - 6.5} ${hipY - 31} A 8.5 8.5 0 0 1 ${CX + 10} ${hipY - 33} Z`, s.hair));
  } else {
    // Flat on their back, stars optional
    parts.push(ellipse(CX, FOOT - 8, 22, 7, s.shirt));
    parts.push(ellipse(CX - 20, FOOT - 9, 7, 6, s.skin));
    parts.push(line(CX + 12, FOOT - 8, CX + 22, FOOT - 2, s.pants, 6));
    parts.push(line(CX + 8, FOOT - 8, CX + 19, FOOT - 14, s.pants, 6));
  }
  return parts.join('');
}

function fr(s: HumanStyle, anim: string, i: number, p: HumanPose): SpriteFrame {
  const scale = s.kid ? 0.72 : 1;
  const body = human(s, p);
  const svg = scale === 1
    ? doc(W, H, body)
    : doc(W, H, `<g transform="translate(${CX * (1 - scale)} ${FOOT * (1 - scale)}) scale(${scale})">${body}</g>`);
  return { name: `${s.key}/${anim}/${i}`, w: W, h: H, svg };
}

export function humanFrames(): SpriteFrame[] {
  const frames: SpriteFrame[] = [];
  for (const s of HUMAN_STYLES) {
    frames.push(fr(s, 'idle', 0, { legL: 0, legR: 0, armMode: 'rest', armPhase: 0, lean: 0, bob: 0 }));
    frames.push(fr(s, 'idle', 1, { legL: 0, legR: 0, armMode: 'rest', armPhase: 0, lean: 0, bob: 1.2 }));
    const stride = [7, 0, -7, 0] as const;
    for (let i = 0; i < 4; i++) {
      frames.push(fr(s, 'walk', i, {
        legL: stride[i] ?? 0, legR: stride[(i + 2) % 4] ?? 0,
        armMode: 'swing', armPhase: i < 2 ? 1 : -1, lean: 0, bob: i % 2 ? 0 : 1.5,
      }));
    }
    for (let i = 0; i < 4; i++) {
      frames.push(fr(s, 'chase', i, {
        legL: (stride[i] ?? 0) * 1.5, legR: (stride[(i + 2) % 4] ?? 0) * 1.5,
        armMode: 'up', armPhase: i < 2 ? 1 : -1, lean: -8, bob: i % 2 ? 0 : 2.5,
      }));
    }
    frames.push(fr(s, 'startled', 0, { legL: -3, legR: 3, armMode: 'up', armPhase: 1, lean: 4, bob: 6 }));
    frames.push(fr(s, 'slip', 0, { legL: 0, legR: 0, armMode: 'rest', armPhase: 0, lean: 0, bob: 0, slipping: 0 }));
    frames.push(fr(s, 'slip', 1, { legL: 0, legR: 0, armMode: 'rest', armPhase: 0, lean: 0, bob: 0, slipping: 1 }));
    frames.push(fr(s, 'sit', 0, { legL: 0, legR: 0, armMode: 'rest', armPhase: 0, lean: 0, bob: 0, sitting: true }));
  }
  return frames;
}

export { W as HUMAN_W, H as HUMAN_H };
