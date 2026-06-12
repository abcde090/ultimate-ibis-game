// Dogs, the rival magpie, ambient seagulls. Anchor bottom-centre, facing LEFT.

import { SpriteFrame, doc, ellipse, line, path, shadow, circle } from '../svg';

// ---------- Dog: 56×48, idle(2) run(4) swim(2), two coat colours ----------

const DOG_COATS = [
  { key: 'dog-brown', coat: '#8a5a32', ear: '#6a4022', collar: '#d94f4f' },
  { key: 'dog-black', coat: '#33312e', ear: '#1f1e1c', collar: '#3d8ad9' },
];

function dogBody(coat: { coat: string; ear: string; collar: string }, p: { legPhase: number; swim: boolean; bob: number }): string {
  const parts: string[] = [];
  const by = 30 - p.bob + (p.swim ? 8 : 0);
  if (!p.swim) {
    parts.push(shadow(28, 44, 18));
    // legs (4)
    const o = p.legPhase;
    parts.push(line(18, by + 6, 16 - o * 4, 44, coat.coat, 4));
    parts.push(line(24, by + 6, 26 + o * 4, 44, coat.coat, 4));
    parts.push(line(34, by + 6, 32 - o * 4, 44, coat.coat, 4));
    parts.push(line(40, by + 6, 42 + o * 4, 44, coat.coat, 4));
  } else {
    parts.push(ellipse(28, by + 8, 22, 5, 'rgba(255,255,255,0.45)'));
  }
  // body
  parts.push(ellipse(29, by, 16, 9, coat.coat));
  // tail
  parts.push(path(`M 43 ${by - 3} Q 50 ${by - 10} 49 ${by - 14}`, 'none', { stroke: coat.coat, sw: 3.5 }));
  // head
  parts.push(ellipse(12, by - 6, 8, 7, coat.coat));
  // snout
  parts.push(ellipse(6, by - 4, 4.5, 3.5, coat.coat));
  parts.push(circle(3.5, by - 4, 1.6, '#1f1f1f'));
  // ear
  parts.push(path(`M 14 ${by - 12} Q 18 ${by - 18} 20 ${by - 10} Z`, coat.ear));
  // eye
  parts.push(circle(10, by - 8, 1.3, '#1f1f1f'));
  // collar
  if (!p.swim) parts.push(line(16, by - 1, 20, by + 2, coat.collar, 3));
  return parts.join('');
}

// ---------- Magpie: 40×40, perch(2) fly(3) swoop(1) ----------

function magpieBody(p: { wings: number; swoop: boolean }): string {
  // wings: 0 folded, 1 mid, 2 up
  const parts: string[] = [];
  const by = p.swoop ? 18 : 30;
  if (!p.swoop && p.wings === 0) parts.push(shadow(20, 36, 9));
  // body
  parts.push(ellipse(20, by, 9, 6, '#1a1a1a', { rot: p.swoop ? -25 : -5 }));
  // white nape/back patch (Australian magpie)
  parts.push(ellipse(24, by - 3, 5, 3, '#f0ece0', { rot: -10 }));
  // wings
  if (p.wings > 0) {
    const lift = p.wings === 2 ? -12 : -5;
    parts.push(path(`M 20 ${by - 2} Q 30 ${by + lift} 37 ${by + lift + 2} L 28 ${by + 3} Z`, '#1a1a1a'));
    parts.push(path(`M 20 ${by - 2} Q 10 ${by + lift} 3 ${by + lift + 2} L 12 ${by + 3} Z`, '#2e2e2e'));
  }
  // tail
  parts.push(path(`M 27 ${by} L 35 ${by + 4} L 33 ${by + 7} L 26 ${by + 4} Z`, '#1a1a1a'));
  // head
  parts.push(circle(12, by - 5, 4.5, '#1a1a1a'));
  // beak
  parts.push(path(`M 8 ${by - 5} L 2 ${by - 3.5} L 8 ${by - 2.5} Z`, '#b8c4c9'));
  // eye (red — menace)
  parts.push(circle(11, by - 6, 1.2, '#c93f2e'));
  if (!p.swoop && p.wings === 0) {
    parts.push(line(17, by + 5, 17, 36, '#3a3a3a', 1.8));
    parts.push(line(22, by + 5, 22, 36, '#3a3a3a', 1.8));
  }
  return parts.join('');
}

// ---------- Seagull: 36×36, stand(2) fly(3) ----------

function seagullBody(p: { flying: boolean; wings: number; bob: number }): string {
  const parts: string[] = [];
  const by = (p.flying ? 16 : 26) - p.bob;
  if (!p.flying) {
    parts.push(shadow(18, 33, 8));
    parts.push(line(15, by + 5, 15, 33, '#e0a33d', 1.8));
    parts.push(line(20, by + 5, 20, 33, '#e0a33d', 1.8));
  }
  parts.push(ellipse(18, by, 8, 5.5, '#e8e4dc'));
  parts.push(ellipse(21, by - 2, 5, 3, '#b8bec4'));
  if (p.flying) {
    const lift = p.wings === 2 ? -10 : p.wings === 1 ? -4 : 2;
    parts.push(path(`M 18 ${by - 1} Q 27 ${by + lift} 34 ${by + lift}`, 'none', { stroke: '#d8d4cc', sw: 4 }));
    parts.push(path(`M 18 ${by - 1} Q 9 ${by + lift} 2 ${by + lift}`, 'none', { stroke: '#c8c4bc', sw: 4 }));
  }
  parts.push(circle(10, by - 4, 3.8, '#e8e4dc'));
  parts.push(path(`M 7 ${by - 4} L 2 ${by - 3} L 7 ${by - 2} Z`, '#e0a33d'));
  parts.push(circle(9.5, by - 5, 1, '#1f1f1f'));
  return parts.join('');
}

export function animalFrames(): SpriteFrame[] {
  const f: SpriteFrame[] = [];
  for (const coat of DOG_COATS) {
    f.push({ name: `${coat.key}/idle/0`, w: 56, h: 48, svg: doc(56, 48, dogBody(coat, { legPhase: 0, swim: false, bob: 0 })) });
    f.push({ name: `${coat.key}/idle/1`, w: 56, h: 48, svg: doc(56, 48, dogBody(coat, { legPhase: 0, swim: false, bob: 1 })) });
    const phases = [1, 0, -1, 0] as const;
    for (let i = 0; i < 4; i++) {
      f.push({ name: `${coat.key}/run/${i}`, w: 56, h: 48, svg: doc(56, 48, dogBody(coat, { legPhase: phases[i] ?? 0, swim: false, bob: i % 2 ? 0 : 2 })) });
    }
    f.push({ name: `${coat.key}/swim/0`, w: 56, h: 48, svg: doc(56, 48, dogBody(coat, { legPhase: 0, swim: true, bob: 0 })) });
    f.push({ name: `${coat.key}/swim/1`, w: 56, h: 48, svg: doc(56, 48, dogBody(coat, { legPhase: 0, swim: true, bob: 1 })) });
  }
  f.push({ name: 'magpie/perch/0', w: 40, h: 40, svg: doc(40, 40, magpieBody({ wings: 0, swoop: false })) });
  f.push({ name: 'magpie/perch/1', w: 40, h: 40, svg: doc(40, 40, magpieBody({ wings: 1, swoop: false })) });
  for (let i = 0; i < 3; i++) {
    f.push({ name: `magpie/fly/${i}`, w: 40, h: 40, svg: doc(40, 40, magpieBody({ wings: ((i % 3) as 0 | 1 | 2), swoop: false })) });
  }
  f.push({ name: 'magpie/swoop/0', w: 40, h: 40, svg: doc(40, 40, magpieBody({ wings: 2, swoop: true })) });
  f.push({ name: 'seagull/stand/0', w: 36, h: 36, svg: doc(36, 36, seagullBody({ flying: false, wings: 0, bob: 0 })) });
  f.push({ name: 'seagull/stand/1', w: 36, h: 36, svg: doc(36, 36, seagullBody({ flying: false, wings: 0, bob: 1 })) });
  for (let i = 0; i < 3; i++) {
    f.push({ name: `seagull/fly/${i}`, w: 36, h: 36, svg: doc(36, 36, seagullBody({ flying: true, wings: i, bob: 0 })) });
  }
  return f;
}
