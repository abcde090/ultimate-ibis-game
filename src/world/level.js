// Pure data: the park layout. No DOM, no side effects.

export const WORLD = { w: 1600, h: 1100 };

export const POND = { cx: 1180, cy: 780, rx: 220, ry: 135 };

export const NEST = { x: 1470, y: 150, r: 70 };

// Solid rectangles (also drawn as props by their `kind`).
export const RECTS = [
  { kind: 'table', x: 470, y: 400, w: 150, h: 86 },
  { kind: 'bbq', x: 930, y: 240, w: 110, h: 64 },
  { kind: 'cafe', x: 170, y: 820, w: 190, h: 110 },
];

// Solid circles — gum tree trunks.
export const TREES = [
  { x: 300, y: 170, r: 16 },
  { x: 780, y: 940, r: 16 },
  { x: 1430, y: 960, r: 16 },
  { x: 120, y: 580, r: 16 },
  { x: 1270, y: 110, r: 16 },
  { x: 640, y: 640, r: 16 },
];

// Bins start upright; pecking knocks them over and spills trash.
export function makeBins() {
  return [
    { id: 'bin-a', x: 700, y: 720, r: 15, upright: true, spilled: false },
    { id: 'bin-b', x: 1330, y: 380, r: 15, upright: true, spilled: false },
    { id: 'bin-c', x: 200, y: 300, r: 15, upright: true, spilled: false },
  ];
}

// Cosmetic only (no collision).
export const PATHS = [
  { x1: 0, y1: 540, x2: 1600, y2: 470, width: 70 },
  { x1: 270, y1: 1100, x2: 320, y2: 0, width: 60 },
];

export const PITCH = { x: 760, y: 480, w: 300, h: 150 };

export function makeItems() {
  return [
    { id: 'chip-1', kind: 'chip', label: 'hot chip', x: 510, y: 388, owner: 'picnicker', home: { x: 510, y: 388 } },
    { id: 'chip-2', kind: 'chip', label: 'hot chip', x: 545, y: 380, owner: 'picnicker', home: { x: 545, y: 380 } },
    { id: 'chip-3', kind: 'chip', label: 'hot chip', x: 580, y: 390, owner: 'picnicker', home: { x: 580, y: 390 } },
    { id: 'sandwich', kind: 'sandwich', label: 'sanger', x: 470, y: 500, owner: 'picnicker', home: { x: 470, y: 500 } },
    { id: 'thong', kind: 'thong', label: 'thong', x: 660, y: 470, owner: 'picnicker', home: { x: 660, y: 470 } },
    { id: 'sausage', kind: 'sausage', label: 'snag', x: 985, y: 228, owner: 'bbqdad', home: { x: 985, y: 228 } },
    { id: 'phone', kind: 'phone', label: 'phone', x: 420, y: 880, owner: 'cafecustomer', home: { x: 420, y: 880 } },
    { id: 'golden-chip', kind: 'goldenchip', label: 'GOLDEN CHIP', x: 250, y: 950, owner: 'cafecustomer', home: { x: 250, y: 950 } },
  ].map((it) => ({ ...it, holder: null, inPond: false }));
}

export function makeNpcDefs() {
  return [
    {
      id: 'picnicker', name: 'Picnicker', variant: 'picnicker',
      home: { x: 540, y: 520 }, noticeRadius: 240, personalSpace: 0,
      patrol: null,
    },
    {
      id: 'bbqdad', name: 'BBQ Dad', variant: 'bbqdad',
      home: { x: 990, y: 340 }, noticeRadius: 230, personalSpace: 0,
      patrol: null,
    },
    {
      id: 'groundskeeper', name: 'Groundskeeper', variant: 'groundskeeper',
      home: { x: 900, y: 560 }, noticeRadius: 260, personalSpace: 95,
      // Waypoints chosen so no leg's straight line crosses the pond
      // (humans won't wade, so a crossing leg would strand him on the bank).
      patrol: [
        { x: 900, y: 560 }, { x: 1250, y: 420 }, { x: 700, y: 950 },
        { x: 400, y: 700 },
      ],
    },
    {
      id: 'cafecustomer', name: 'Cafe Customer', variant: 'cafecustomer',
      home: { x: 430, y: 900 }, noticeRadius: 240, personalSpace: 0,
      patrol: null,
    },
  ];
}

export const PLAYER_START = { x: 1450, y: 220 };
