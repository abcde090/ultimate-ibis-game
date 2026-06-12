// World props: buildings, stalls, furniture, foliage. Anchor bottom-centre.

import { SpriteFrame, doc, ellipse, line, rect, path, poly, shadow, circle } from '../svg';

type Builder = (w: number, h: number) => string;

function prop(name: string, w: number, h: number, build: Builder): SpriteFrame {
  return { name: `prop/${name}`, w, h, svg: doc(w, h, build(w, h)) };
}

// ---------- foliage & park furniture ----------

function gumTree(seed: number): Builder {
  return (w, h) => {
    const cx = w / 2;
    const parts = [shadow(cx, h - 4, w * 0.32)];
    parts.push(path(
      `M ${cx - 7} ${h - 4} Q ${cx - 5 + seed * 3} ${h - 60} ${cx - 11} ${h - 95} L ${cx + 9} ${h - 95} Q ${cx + 6 - seed * 3} ${h - 60} ${cx + 8} ${h - 4} Z`,
      '#cfc4ad', { stroke: '#a89878', sw: 2 },
    ));
    const blobs = seed === 0
      ? [[-26, -112, 26], [16, -120, 28], [-4, -136, 30], [30, -100, 19], [-38, -96, 17]]
      : [[-20, -100, 24], [20, -108, 25], [0, -122, 27], [34, -90, 16]];
    for (const [bx, by, br] of blobs) {
      parts.push(circle(cx + bx!, h + by!, br!, '#6a8f4f'));
      parts.push(circle(cx + bx! - 4, h + by! - 5, br! * 0.65, 'rgba(255,255,255,0.09)'));
    }
    return parts.join('');
  };
}

const bush: Builder = (w, h) => {
  const cx = w / 2;
  return [
    shadow(cx, h - 4, w * 0.42),
    circle(cx - 22, h - 26, 20, '#5a7f44'),
    circle(cx + 18, h - 24, 22, '#638a4a'),
    circle(cx, h - 38, 24, '#6f9852'),
    circle(cx - 8, h - 44, 16, 'rgba(255,255,255,0.08)'),
  ].join('');
};

const picnicTable: Builder = (w, h) => {
  const parts = [shadow(w / 2, h - 6, w * 0.5)];
  parts.push(rect(8, h - 38, w - 16, 16, '#9c6e40', { rx: 4 })); // far bench
  parts.push(rect(0, h - 84, w, 44, '#a87848', { rx: 6, stroke: '#7a5430', sw: 2 }));
  for (let i = 1; i < 5; i++) parts.push(line((w / 5) * i, h - 82, (w / 5) * i, h - 42, 'rgba(122,84,48,0.6)', 1.5));
  parts.push(rect(10, h - 78, 60, 34, '#d94f4f', { rx: 3 }));
  for (let i = 0; i < 3; i++) parts.push(line(12, h - 74 + i * 11, 68, h - 74 + i * 11, '#fff', 1.2));
  parts.push(rect(8, h - 22, w - 16, 16, '#9c6e40', { rx: 4 })); // near bench
  return parts.join('');
};

const bbq: Builder = (w, h) => [
  shadow(w / 2, h - 4, w * 0.5),
  rect(10, h - 64, w - 20, 52, '#4a4a52', { rx: 6, stroke: '#2e2e34', sw: 2 }),
  ...[1, 2, 3, 4].map((i) => line(20, h - 64 + i * 10.5, w - 20, h - 64 + i * 10.5, '#26262c', 2.5)),
  rect(w / 2 - 5, h - 76, 10, 12, '#5a3a22'),
  ellipse(w * 0.34, h - 88, 9, 7, 'rgba(220,220,220,0.3)'),
  ellipse(w * 0.5, h - 100, 11, 8, 'rgba(220,220,220,0.22)'),
].join('');

const bench: Builder = (w, h) => [
  shadow(w / 2, h - 4, w * 0.46),
  rect(8, h - 44, w - 16, 10, '#9c6e40', { rx: 3 }),
  rect(8, h - 30, w - 16, 12, '#a87848', { rx: 3 }),
  line(14, h - 18, 14, h - 4, '#5a4a38', 4),
  line(w - 14, h - 18, w - 14, h - 4, '#5a4a38', 4),
].join('');

const nest: Builder = (w, h) => {
  const cx = w / 2;
  const cy = h - 28;
  const parts: string[] = [ellipse(cx, cy, w * 0.42, h * 0.3, 'rgba(138,106,63,0.25)')];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const wob = Math.sin(i * 7.3) * 5;
    const sx = cx + Math.cos(a) * (w * 0.32 + wob);
    const sy = cy + Math.sin(a) * (h * 0.22 + wob * 0.4);
    const dx = Math.cos(a + Math.PI / 2 + Math.sin(i * 3.7) * 0.5) * 9;
    const dy = Math.sin(a + Math.PI / 2 + Math.sin(i * 3.7) * 0.5) * 5;
    parts.push(line(sx - dx, sy - dy, sx + dx, sy + dy, i % 3 ? '#8a6a3f' : '#a3814f', 3));
  }
  return parts.join('');
};

// ---------- bins ----------

const binUpright: Builder = (w, h) => [
  shadow(w / 2, h - 2, 17),
  rect(w / 2 - 13, h - 40, 26, 38, '#3d6b35', { rx: 3, stroke: '#2a4d24', sw: 2 }),
  rect(w / 2 - 15, h - 46, 30, 8, '#2a4d24', { rx: 2 }),
  line(w / 2 - 6, h - 34, w / 2 - 6, h - 10, 'rgba(0,0,0,0.18)', 2),
  line(w / 2 + 6, h - 34, w / 2 + 6, h - 10, 'rgba(0,0,0,0.18)', 2),
].join('');

const binKnocked: Builder = (w, h) => [
  shadow(w / 2 + 4, h - 2, 22),
  rect(8, h - 26, 38, 24, '#3d6b35', { rx: 3, stroke: '#2a4d24', sw: 2, rot: 8 }),
  ellipse(48, h - 14, 5, 11, '#2a4d24'),
  ellipse(w - 10, h - 8, 11, 4.5, '#2a4d24', { rot: -12 }),
].join('');

// ---------- structures ----------

function storefront(opts: { wall: string; awningA: string; awningB: string; sign: string; window?: boolean }): Builder {
  return (w, h) => {
    const parts = [shadow(w / 2, h - 2, w * 0.46)];
    parts.push(rect(6, h - 150, w - 12, 148, opts.wall, { rx: 4, stroke: 'rgba(0,0,0,0.18)', sw: 2 }));
    // roofline
    parts.push(rect(0, h - 162, w, 18, '#5a4a38', { rx: 4 }));
    // awning
    const n = 7;
    for (let i = 0; i < n; i++) {
      parts.push(rect(2 + i * ((w - 4) / n), h - 132, (w - 4) / n, 26, i % 2 ? '#f0ece0' : opts.awningA, { rx: 2 }));
    }
    parts.push(rect(2, h - 110, w - 4, 5, opts.awningB));
    // window / counter
    if (opts.window !== false) {
      parts.push(rect(20, h - 96, w - 40, 52, '#5a4a38', { rx: 4 }));
      parts.push(rect(26, h - 90, w - 52, 40, '#8fb8d8', { rx: 3, opacity: 0.85 }));
    }
    // door
    parts.push(rect(w / 2 - 16, h - 44, 32, 42, '#4a3a2a', { rx: 3 }));
    // sign text
    parts.push(`<text x="${w / 2}" y="${h - 140}" font-family="Georgia, serif" font-size="17" font-weight="bold" fill="#fdf6e3" text-anchor="middle">${opts.sign}</text>`);
    return parts.join('');
  };
}

function marketStall(opts: { canopyA: string; canopyB: string; goods: string }): Builder {
  return (w, h) => {
    const parts = [shadow(w / 2, h - 2, w * 0.44)];
    // legs
    parts.push(line(12, h - 86, 12, h - 4, '#7a5430', 5));
    parts.push(line(w - 12, h - 86, w - 12, h - 4, '#7a5430', 5));
    // counter
    parts.push(rect(4, h - 56, w - 8, 30, '#a87848', { rx: 4, stroke: '#7a5430', sw: 2 }));
    // goods (per-stall doodle group sits on the counter)
    parts.push(opts.goods);
    // canopy
    const n = 5;
    for (let i = 0; i < n; i++) {
      parts.push(rect(i * (w / n), h - 110, w / n, 30, i % 2 ? opts.canopyB : opts.canopyA, { rx: 3 }));
    }
    parts.push(poly([[0, h - 82], [w, h - 82], [w - 8, h - 72], [8, h - 72]], 'rgba(0,0,0,0.12)'));
    return parts.join('');
  };
}

const fruitGoods = [
  circle(40, 92, 8, '#e0a33d'), circle(56, 90, 8, '#d94f4f'), circle(72, 93, 8, '#3fa05a'),
  circle(48, 84, 7, '#e8c93d'), circle(64, 83, 7, '#e07a3d'), circle(96, 89, 9, '#7a9460'),
].join('');
const fishGoods = [
  ellipse(50, 90, 16, 6, '#7aa3b8', { rot: -8 }), poly([[64, 88], [74, 84], [74, 94]], '#7aa3b8'),
  ellipse(92, 92, 14, 5, '#8fb3c8', { rot: 5 }), poly([[104, 91], [113, 87], [113, 96]], '#8fb3c8'),
  rect(28, 96, 96, 6, '#dde4e8', { rx: 3 }),
].join('');
const scarfGoods = [
  line(36, 78, 36, 102, '#d96aa0', 7), line(52, 78, 52, 104, '#3fb0a3', 7),
  line(68, 78, 68, 100, '#e0a33d', 7), line(84, 78, 84, 103, '#9c6ad9', 7),
  line(100, 78, 100, 101, '#d94f4f', 7),
].join('');

const balloonStand: Builder = (w, h) => {
  const parts = [shadow(w / 2, h - 2, 14)];
  parts.push(line(w / 2, h - 70, w / 2, h - 4, '#7a5430', 5));
  const balloons: Array<[number, number, string]> = [
    [-22, -108, '#d94f4f'], [0, -118, '#e8c93d'], [22, -106, '#3d8ad9'], [-10, -96, '#3fa05a'], [14, -92, '#d96aa0'],
  ];
  for (const [bx, by, c] of balloons) {
    parts.push(line(w / 2, h - 70, w / 2 + bx, h + by + 14, 'rgba(60,60,60,0.5)', 1));
    parts.push(ellipse(w / 2 + bx, h + by, 11, 13, c));
  }
  return parts.join('');
};

const shed: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.46),
  rect(8, h - 96, w - 16, 94, '#8a9460', { rx: 3, stroke: '#5a6440', sw: 2 }),
  poly([[0, h - 96], [w / 2, h - 130], [w, h - 96]], '#5a6440'),
  rect(w / 2 - 18, h - 56, 36, 54, '#4a3a2a', { rx: 3 }),
  circle(w / 2 + 10, h - 30, 2.5, '#c9b370'),
  rect(24, h - 80, 26, 22, '#5a4a38', { rx: 3 }),
].join('');

const lifeguardTower: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.4),
  line(24, h - 90, 18, h - 4, '#b89858', 7),
  line(w - 24, h - 90, w - 18, h - 4, '#b89858', 7),
  rect(14, h - 140, w - 28, 56, '#e8c93d', { rx: 5, stroke: '#b8952a', sw: 2 }),
  rect(26, h - 128, w - 52, 28, '#d94f4f', { rx: 3 }),
  poly([[6, h - 140], [w / 2, h - 168], [w - 6, h - 140]], '#d94f4f'),
  line(14, h - 90, w - 14, h - 90, '#b89858', 5),
].join('');

const clubhouse: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.46),
  rect(6, h - 130, w - 12, 128, '#e8e0d0', { rx: 4, stroke: '#b8a888', sw: 2 }),
  poly([[0, h - 130], [w / 2, h - 178], [w, h - 130]], '#7a4535'),
  rect(w / 2 - 22, h - 60, 44, 58, '#4a3a2a', { rx: 4 }),
  rect(28, h - 104, 56, 40, '#8fb8d8', { rx: 3 }),
  rect(w - 84, h - 104, 56, 40, '#8fb8d8', { rx: 3 }),
  `<text x="${w / 2}" y="${h - 112}" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#5a4a38" text-anchor="middle">MAGGEE BAY CC</text>`,
].join('');

const trophyCase: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.4),
  rect(6, h - 104, w - 12, 102, '#7a5430', { rx: 4, stroke: '#5a3a20', sw: 2 }),
  rect(14, h - 96, w - 28, 70, '#cfe0ec', { rx: 3, opacity: 0.9 }),
  rect(18, h - 56, w - 36, 4, '#7a5430'),
  // the golden chip on its cushion
  rect(w / 2 - 14, h - 78, 28, 10, '#9c2e4a', { rx: 3 }),
  rect(w / 2 - 11, h - 86, 22, 8, '#ffd700', { rx: 3, rot: -6, stroke: '#b8860b', sw: 1 }),
].join('');

// ---------- fences, gates, vehicles, beach bits ----------

const fenceH: Builder = (w, h) => [
  line(4, h - 24, 4, h - 2, '#8a7048', 5),
  line(w - 4, h - 24, w - 4, h - 2, '#8a7048', 5),
  line(0, h - 20, w, h - 20, '#a3854f', 5),
  line(0, h - 9, w, h - 9, '#a3854f', 5),
].join('');

const hedge: Builder = (w, h) => [
  rect(0, h - 34, w, 32, '#4f7340', { rx: 9 }),
  circle(12, h - 32, 9, '#5a7f44'),
  circle(34, h - 36, 10, '#638a4a'),
  circle(54, h - 31, 9, '#5a7f44'),
].join('');

function gateBuilder(open: boolean): Builder {
  return (w, h) => {
    const parts = [
      line(5, h - 36, 5, h - 2, '#6a5438', 7),
      line(w - 5, h - 36, w - 5, h - 2, '#6a5438', 7),
    ];
    if (open) {
      parts.push(line(5, h - 30, 22, h - 16, '#8a7048', 4));
      parts.push(line(5, h - 16, 22, h - 4, '#8a7048', 4));
    } else {
      parts.push(line(5, h - 28, w - 5, h - 28, '#8a7048', 4.5));
      parts.push(line(5, h - 12, w - 5, h - 12, '#8a7048', 4.5));
      parts.push(line(10, h - 32, w - 10, h - 8, '#8a7048', 4));
    }
    return parts.join('');
  };
}

const truck: Builder = (w, h) => [
  shadow(w / 2, h - 4, w * 0.46),
  rect(8, h - 96, w - 78, 70, '#e8e0d0', { rx: 6, stroke: '#b8a888', sw: 2 }),
  rect(w - 74, h - 72, 64, 46, '#d8d3c2', { rx: 6, stroke: '#a89878', sw: 2 }),
  rect(w - 64, h - 64, 30, 22, '#8fb8d8', { rx: 3 }),
  circle(40, h - 18, 15, '#33312e'), circle(40, h - 18, 7, '#8a8a8a'),
  circle(w - 44, h - 18, 15, '#33312e'), circle(w - 44, h - 18, 7, '#8a8a8a'),
  `<text x="${(w - 70) / 2 + 8}" y="${h - 56}" font-family="Verdana" font-size="14" font-weight="bold" fill="#c95f3f" text-anchor="middle">FRESHIES</text>`,
].join('');

const esky: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.42),
  rect(6, h - 42, w - 12, 40, '#3d8ad9', { rx: 6, stroke: '#2a5f9c', sw: 2 }),
  rect(2, h - 50, w - 4, 12, '#dde4e8', { rx: 5 }),
  rect(w / 2 - 10, h - 46, 20, 5, '#b8c4c9', { rx: 2 }),
].join('');

const towel: Builder = (w, h) => [
  rect(4, 8, w - 8, h - 16, '#3fb0a3', { rx: 4, rot: -4 }),
  line(10, h / 2 - 8, w - 10, h / 2 - 14, '#f0ece0', 5),
  line(10, h / 2 + 8, w - 10, h / 2 + 2, '#f0ece0', 5),
].join('');

const sandcastle: Builder = (w, h) => [
  shadow(w / 2, h - 2, w * 0.42),
  rect(10, h - 34, w - 20, 32, '#d8bd8a', { rx: 3 }),
  rect(16, h - 50, 14, 18, '#d8bd8a', { rx: 2 }),
  rect(w - 30, h - 50, 14, 18, '#d8bd8a', { rx: 2 }),
  rect(w / 2 - 9, h - 58, 18, 26, '#cfb480', { rx: 2 }),
  line(w / 2, h - 58, w / 2, h - 70, '#7a5430', 1.5),
  poly([[w / 2, h - 70], [w / 2 + 10, h - 66], [w / 2, h - 62]], '#d94f4f'),
].join('');

const sandcastleFlat: Builder = (w, h) => [
  ellipse(w / 2, h - 10, w * 0.42, 8, '#d8bd8a'),
  ellipse(w / 2 - 14, h - 14, 10, 4, '#cfb480'),
  line(w / 2 + 12, h - 16, w / 2 + 22, h - 8, '#7a5430', 1.5),
  poly([[w / 2 + 22, h - 12], [w / 2 + 30, h - 10], [w / 2 + 22, h - 6]], '#d94f4f'),
].join('');

const umbrella: Builder = (w, h) => {
  const parts = [shadow(w / 2 + 8, h - 2, w * 0.36)];
  parts.push(line(w / 2, h - 110, w / 2 + 8, h - 2, '#8a7048', 4));
  const cols = ['#d94f4f', '#f0ece0'];
  for (let i = 0; i < 6; i++) {
    const a0 = Math.PI + (i / 6) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 6) * Math.PI;
    const x0 = w / 2 + Math.cos(a0) * 56;
    const y0 = h - 110 + Math.sin(a0) * 34;
    const x1 = w / 2 + Math.cos(a1) * 56;
    const y1 = h - 110 + Math.sin(a1) * 34;
    parts.push(path(`M ${w / 2} ${h - 110} L ${x0} ${y0} A 56 34 0 0 1 ${x1} ${y1} Z`, cols[i % 2] ?? '#d94f4f'));
  }
  return parts.join('');
};

const signOpen: Builder = (w, h) => [
  shadow(w / 2, h - 2, 13),
  line(10, h - 40, 6, h - 2, '#6a5438', 4),
  line(w - 10, h - 40, w - 6, h - 2, '#6a5438', 4),
  rect(4, h - 62, w - 8, 26, '#fdf6e3', { rx: 3, stroke: '#5a4a38', sw: 2 }),
  `<text x="${w / 2}" y="${h - 44}" font-family="Georgia" font-size="13" font-weight="bold" fill="#c95f3f" text-anchor="middle">OPEN</text>`,
].join('');

const guitarCase: Builder = (w, h) => [
  ellipse(w / 2, h / 2 + 4, w * 0.42, h * 0.32, '#5a4a38', { rot: -10 }),
  ellipse(w / 2, h / 2 + 2, w * 0.34, h * 0.24, '#7a6048', { rot: -10 }),
  circle(w / 2 - 8, h / 2, 3, '#e8c93d'),
  circle(w / 2 + 6, h / 2 + 4, 3, '#d8d3c2'),
].join('');

const priceSign: Builder = (w, h) => [
  shadow(w / 2, h - 2, 10),
  line(w / 2, h - 30, w / 2, h - 2, '#6a5438', 3.5),
  rect(3, h - 48, w - 6, 20, '#2e2e36', { rx: 2 }),
  line(8, h - 42, w - 8, h - 42, '#fdf6e3', 2),
  line(8, h - 35, w - 14, h - 35, '#c9b370', 2),
].join('');

const cricketPitchMat: Builder = (w, h) => [
  rect(0, 0, w, h, '#c9b97a', { rx: 6 }),
  line(8, 8, w - 8, 8, 'rgba(255,255,255,0.5)', 2),
  line(8, h - 8, w - 8, h - 8, 'rgba(255,255,255,0.5)', 2),
  line(w / 2 - 8, h / 2 - 10, w / 2 - 8, h / 2 + 10, '#8a7048', 2.5),
  line(w / 2, h / 2 - 10, w / 2, h / 2 + 10, '#8a7048', 2.5),
  line(w / 2 + 8, h / 2 - 10, w / 2 + 8, h / 2 + 10, '#8a7048', 2.5),
].join('');

export function propFrames(): SpriteFrame[] {
  return [
    prop('tree-gum-a', 150, 184, gumTree(0)),
    prop('tree-gum-b', 130, 164, gumTree(1)),
    prop('bush', 100, 80, bush),
    prop('picnic-table', 170, 120, picnicTable),
    prop('bbq', 130, 110, bbq),
    prop('bench', 100, 70, bench),
    prop('nest', 130, 80, nest),
    prop('bin-upright', 40, 56, binUpright),
    prop('bin-knocked', 64, 40, binKnocked),
    prop('cafe', 280, 230, storefront({ wall: '#e8d8b8', awningA: '#c95f3f', awningB: '#a3492e', sign: 'THE FLAT WHITE' })),
    prop('bakery', 280, 230, storefront({ wall: '#e0cfc0', awningA: '#3d8ad9', awningB: '#2a5f9c', sign: 'BAKERY' })),
    prop('fishchips', 280, 230, storefront({ wall: '#d8e0d0', awningA: '#3fa05a', awningB: '#2a7a42', sign: 'SALTY’S FISH N CHIPS' })),
    prop('stall-fruit', 150, 144, marketStall({ canopyA: '#e0a33d', canopyB: '#f0ece0', goods: fruitGoods })),
    prop('stall-fish', 150, 144, marketStall({ canopyA: '#5f8ca3', canopyB: '#f0ece0', goods: fishGoods })),
    prop('stall-scarf', 150, 144, marketStall({ canopyA: '#9c6ad9', canopyB: '#f0ece0', goods: scarfGoods })),
    prop('balloon-stand', 90, 140, balloonStand),
    prop('shed', 200, 140, shed),
    prop('lifeguard-tower', 150, 180, lifeguardTower),
    prop('clubhouse', 340, 190, clubhouse),
    prop('trophy-case', 100, 110, trophyCase),
    prop('fence-h', 64, 44, fenceH),
    prop('hedge', 64, 40, hedge),
    prop('gate-closed', 64, 44, gateBuilder(false)),
    prop('gate-open', 64, 44, gateBuilder(true)),
    prop('truck', 240, 110, truck),
    prop('esky', 64, 60, esky),
    prop('towel', 84, 60, towel),
    prop('sandcastle', 76, 76, sandcastle),
    prop('sandcastle-flat', 76, 30, sandcastleFlat),
    prop('umbrella', 130, 120, umbrella),
    prop('sign-open', 44, 66, signOpen),
    prop('guitar-case', 60, 44, guitarCase),
    prop('price-sign', 36, 52, priceSign),
    prop('pitch-mat', 200, 90, cricketPitchMat),
  ];
}
