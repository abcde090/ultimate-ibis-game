// The entire park layout as data. Pixel coordinates, 4800×3200 world
// (150×100 tiles @ 32). Anchors are bottom-centre. Imported by the map
// generator AND by layout tests — keep it pure data.

export const MAP_TILES = { w: 150, h: 100 } as const;
export const TILE_PX = 32;
export const WORLD = { w: MAP_TILES.w * TILE_PX, h: MAP_TILES.h * TILE_PX } as const;

export type DistrictId = 'park' | 'cafe' | 'market' | 'beach' | 'oval';

// Tile-space rects {x, y, w, h} (inclusive of x..x+w-1)
export const DISTRICTS: Record<DistrictId, { x: number; y: number; w: number; h: number }> = {
  cafe: { x: 0, y: 0, w: 95, h: 28 },
  oval: { x: 95, y: 0, w: 55, h: 28 },
  park: { x: 0, y: 28, w: 75, h: 38 },
  market: { x: 75, y: 28, w: 75, h: 38 },
  beach: { x: 0, y: 66, w: 150, h: 34 },
};

// Progression: park → cafe → market → beach → oval(finale)
export const GATES = [
  { id: 'gate-park-cafe', from: 'park', to: 'cafe', tileX: 30, tileY: 28, axis: 'h' },
  { id: 'gate-cafe-market', from: 'cafe', to: 'market', tileX: 84, tileY: 28, axis: 'h', truck: true },
  { id: 'gate-market-beach', from: 'market', to: 'beach', tileX: 110, tileY: 66, axis: 'h' },
  { id: 'gate-market-oval', from: 'market', to: 'oval', tileX: 120, tileY: 28, axis: 'h' },
] as const;

// Fence/hedge runs along tile boundaries; gates punch 2-tile holes.
export const BARRIERS = [
  { kind: 'fence', axis: 'h', tileY: 28, fromX: 0, toX: 74, gapAt: [30, 31] },    // park|cafe
  { kind: 'fence', axis: 'h', tileY: 28, fromX: 75, toX: 94, gapAt: [84, 85] },   // market|cafe (truck)
  { kind: 'fence', axis: 'h', tileY: 28, fromX: 95, toX: 149, gapAt: [120, 121] }, // market|oval
  { kind: 'hedge', axis: 'v', tileX: 75, fromY: 28, toY: 65, gapAt: [] },          // park|market
  { kind: 'hedge', axis: 'v', tileX: 95, fromY: 0, toY: 27, gapAt: [] },           // cafe|oval
  { kind: 'hedge', axis: 'h', tileY: 66, fromX: 0, toX: 74, gapAt: [] },           // park|beach
  { kind: 'fence', axis: 'h', tileY: 66, fromX: 75, toX: 149, gapAt: [110, 111] }, // market|beach
] as const;

export const POND = { cx: 720, cy: 1616, rx: 288, ry: 192 };
export const SEA = { topY: 2848 }; // water from here to world bottom
export const NEST = { x: 350, y: 1980, r: 90 };

export interface PropDef {
  sprite: string;          // atlas frame, e.g. "prop/picnic-table"
  x: number;
  y: number;
  id?: string;             // stable id for stateful props (bins, gates…)
  solid?: { w: number; h: number }; // collision box (centred on anchor)
}

const solid = (w: number, h: number) => ({ w, h });

export const PROPS: PropDef[] = [
  // ---- park ----
  { sprite: 'prop/picnic-table', x: 1600, y: 1400, solid: solid(160, 64) },
  { sprite: 'prop/bbq', x: 950, y: 1150, solid: solid(110, 44) },
  { sprite: 'prop/shed', x: 2100, y: 1060, solid: solid(180, 60) },
  { sprite: 'prop/bench', x: 1100, y: 1700, solid: solid(84, 26) },
  { sprite: 'prop/nest', x: 350, y: 2010 },
  { sprite: 'prop/bin-upright', x: 700, y: 1800, id: 'bin-park-a', solid: solid(30, 16) },
  { sprite: 'prop/bin-upright', x: 1900, y: 1620, id: 'bin-park-b', solid: solid(30, 16) },
  { sprite: 'prop/bin-upright', x: 360, y: 1120, id: 'bin-park-c', solid: solid(30, 16) },
  { sprite: 'prop/tree-gum-a', x: 300, y: 1010, solid: solid(26, 16) },
  { sprite: 'prop/tree-gum-b', x: 2230, y: 1920, solid: solid(24, 14) },
  { sprite: 'prop/tree-gum-a', x: 1250, y: 980, solid: solid(26, 16) },
  { sprite: 'prop/tree-gum-b', x: 520, y: 2060, solid: solid(24, 14) },
  { sprite: 'prop/bush', x: 1500, y: 1920, id: 'bush-park-a' },
  { sprite: 'prop/bush', x: 260, y: 1500, id: 'bush-park-b' },
  { sprite: 'prop/bush', x: 2250, y: 1360, id: 'bush-park-c' },

  // ---- cafe strip ----
  { sprite: 'prop/cafe', x: 450, y: 450, solid: solid(270, 80) },
  { sprite: 'prop/bakery', x: 1100, y: 450, solid: solid(270, 80) },
  { sprite: 'prop/fishchips', x: 1750, y: 450, solid: solid(270, 80) },
  { sprite: 'prop/umbrella', x: 700, y: 700 },
  { sprite: 'prop/bench', x: 820, y: 730, id: 'bench-cafe', solid: solid(84, 26) },
  { sprite: 'prop/bench', x: 1350, y: 720, solid: solid(84, 26) },
  { sprite: 'prop/sign-open', x: 1010, y: 640, id: 'sign-open' },
  { sprite: 'prop/guitar-case', x: 2200, y: 760, id: 'guitar-case' },
  { sprite: 'prop/bin-upright', x: 1500, y: 780, id: 'bin-cafe-a', solid: solid(30, 16) },
  { sprite: 'prop/tree-gum-b', x: 2450, y: 540, solid: solid(24, 14) },
  { sprite: 'prop/tree-gum-a', x: 250, y: 790, solid: solid(26, 16) },
  { sprite: 'prop/bush', x: 1950, y: 700, id: 'bush-cafe-a' },
  { sprite: 'prop/truck', x: 2750, y: 880, id: 'truck', solid: solid(230, 60) },

  // ---- market ----
  { sprite: 'prop/stall-fruit', x: 2800, y: 1300, solid: solid(140, 50) },
  { sprite: 'prop/stall-fish', x: 3400, y: 1300, solid: solid(140, 50) },
  { sprite: 'prop/stall-scarf', x: 3000, y: 1780, solid: solid(140, 50) },
  { sprite: 'prop/balloon-stand', x: 3800, y: 1520, id: 'balloon-stand', solid: solid(40, 20) },
  { sprite: 'prop/price-sign', x: 2690, y: 1340, id: 'price-sign-a' },
  { sprite: 'prop/price-sign', x: 3510, y: 1340, id: 'price-sign-b' },
  { sprite: 'prop/bin-upright', x: 4200, y: 1720, id: 'bin-market-a', solid: solid(30, 16) },
  { sprite: 'prop/bench', x: 3700, y: 1960, solid: solid(84, 26) },
  { sprite: 'prop/tree-gum-a', x: 4500, y: 1130, id: 'magpie-tree', solid: solid(26, 16) },
  { sprite: 'prop/tree-gum-b', x: 2560, y: 1970, solid: solid(24, 14) },
  { sprite: 'prop/bush', x: 4100, y: 1280, id: 'bush-market-a' },

  // ---- beach ----
  { sprite: 'prop/lifeguard-tower', x: 1200, y: 2520, solid: solid(120, 50) },
  { sprite: 'prop/umbrella', x: 600, y: 2620 },
  { sprite: 'prop/umbrella', x: 2000, y: 2720 },
  { sprite: 'prop/umbrella', x: 3300, y: 2580 },
  { sprite: 'prop/towel', x: 700, y: 2700, id: 'towel-a' },
  { sprite: 'prop/towel', x: 2100, y: 2800, id: 'towel-b' },
  { sprite: 'prop/towel', x: 3400, y: 2660, id: 'towel-c' },
  { sprite: 'prop/esky', x: 760, y: 2640, id: 'esky-a', solid: solid(50, 24) },
  { sprite: 'prop/esky', x: 3250, y: 2720, id: 'esky-b', solid: solid(50, 24) },
  { sprite: 'prop/sandcastle', x: 1600, y: 2820, id: 'sandcastle-a' },
  { sprite: 'prop/sandcastle', x: 2800, y: 2840, id: 'sandcastle-b' },
  { sprite: 'prop/bin-upright', x: 400, y: 2420, id: 'bin-beach-a', solid: solid(30, 16) },
  { sprite: 'prop/bin-upright', x: 2600, y: 2380, id: 'bin-beach-b', solid: solid(30, 16) },
  { sprite: 'prop/bush', x: 3900, y: 2300, id: 'bush-beach-a' },

  // ---- oval ----
  { sprite: 'prop/clubhouse', x: 4350, y: 420, solid: solid(330, 70) },
  { sprite: 'prop/trophy-case', x: 4120, y: 450, id: 'trophy-case', solid: solid(90, 30) },
  { sprite: 'prop/pitch-mat', x: 3900, y: 560 },
  { sprite: 'prop/bench', x: 3300, y: 620, solid: solid(84, 26) },
  { sprite: 'prop/bench', x: 3500, y: 360, solid: solid(84, 26) },
  { sprite: 'prop/bin-upright', x: 3200, y: 780, id: 'bin-oval-a', solid: solid(30, 16) },
  { sprite: 'prop/tree-gum-a', x: 3150, y: 260, solid: solid(26, 16) },
];

export interface NpcDef {
  id: string;
  archetype: string;       // atlas prefix: "human-barista"
  x: number;
  y: number;
  district: DistrictId;
  patrol?: Array<{ x: number; y: number }>;
  sitting?: boolean;
  noticeRadius: number;
  personalSpace: number;
  schedule?: Array<{ t: number; x: number; y: number }>; // 60 s cycle
}

export const NPCS: NpcDef[] = [
  { id: 'picnicker', archetype: 'human-picnicker', x: 1650, y: 1520, district: 'park', noticeRadius: 260, personalSpace: 0 },
  { id: 'bbqdad', archetype: 'human-bbqdad', x: 1000, y: 1260, district: 'park', noticeRadius: 250, personalSpace: 0 },
  {
    id: 'groundskeeper', archetype: 'human-groundskeeper', x: 1300, y: 1780, district: 'park',
    noticeRadius: 280, personalSpace: 100,
    patrol: [{ x: 1300, y: 1780 }, { x: 1900, y: 1300 }, { x: 700, y: 1200 }, { x: 500, y: 1850 }],
  },
  { id: 'kid-park', archetype: 'human-kid-a', x: 1800, y: 1870, district: 'park', noticeRadius: 300, personalSpace: 0 },

  { id: 'barista', archetype: 'human-barista', x: 460, y: 560, district: 'cafe', noticeRadius: 230, personalSpace: 0,
    schedule: [{ t: 0, x: 460, y: 560 }, { t: 25, x: 750, y: 690 }, { t: 40, x: 460, y: 560 }] },
  { id: 'waiter', archetype: 'human-waiter', x: 900, y: 700, district: 'cafe', noticeRadius: 240, personalSpace: 0,
    schedule: [{ t: 0, x: 900, y: 700 }, { t: 15, x: 1380, y: 700 }, { t: 30, x: 1750, y: 620 }, { t: 45, x: 900, y: 700 }] },
  { id: 'cafecustomer', archetype: 'human-cafecustomer', x: 760, y: 750, district: 'cafe', noticeRadius: 240, personalSpace: 0, sitting: true },
  { id: 'busker', archetype: 'human-busker', x: 2240, y: 720, district: 'cafe', noticeRadius: 220, personalSpace: 0 },
  { id: 'influencer', archetype: 'human-influencer', x: 1320, y: 690, district: 'cafe', noticeRadius: 230, personalSpace: 0 },

  { id: 'fruitvendor', archetype: 'human-fruitvendor', x: 2800, y: 1240, district: 'market', noticeRadius: 260, personalSpace: 0,
    schedule: [{ t: 0, x: 2800, y: 1240 }, { t: 20, x: 3000, y: 1700 }, { t: 35, x: 2800, y: 1240 }] },
  { id: 'fishmonger', archetype: 'human-fishmonger', x: 3400, y: 1240, district: 'market', noticeRadius: 250, personalSpace: 0 },
  { id: 'kid-market', archetype: 'human-kid-b', x: 3200, y: 1620, district: 'market', noticeRadius: 320, personalSpace: 0 },

  { id: 'lifeguard', archetype: 'human-lifeguard', x: 1200, y: 2460, district: 'beach', noticeRadius: 270, personalSpace: 90,
    patrol: [{ x: 1200, y: 2460 }, { x: 2400, y: 2500 }, { x: 3200, y: 2450 }, { x: 1800, y: 2400 }] },
  { id: 'sunbather', archetype: 'human-sunbather', x: 2100, y: 2760, district: 'beach', noticeRadius: 200, personalSpace: 0, sitting: true },

  { id: 'clubpresident', archetype: 'human-clubpresident', x: 4150, y: 520, district: 'oval', noticeRadius: 300, personalSpace: 110,
    patrol: [{ x: 4150, y: 520 }, { x: 3800, y: 650 }, { x: 4300, y: 700 }] },
];

export interface DogDef {
  id: string;
  coat: 'dog-brown' | 'dog-black';
  x: number;
  y: number;
  district: DistrictId;
  leashedTo?: string; // prop id; freed by a task
}

export const DOGS: DogDef[] = [
  { id: 'dog-cafe', coat: 'dog-brown', x: 850, y: 770, district: 'cafe', leashedTo: 'bench-cafe' },
  { id: 'dog-beach', coat: 'dog-black', x: 2900, y: 2620, district: 'beach' },
];

export const MAGPIE = { id: 'magpie', perch: { x: 4500, y: 1000 }, district: 'market' as DistrictId };

export const SEAGULLS = [
  { x: 1500, y: 2620 }, { x: 1560, y: 2660 }, { x: 1620, y: 2610 },
  { x: 2450, y: 2750 }, { x: 2510, y: 2790 },
];

export interface ItemDef {
  id: string;
  kind: string;           // atlas frame suffix: "item/<kind>"
  x: number;
  y: number;
  owner: string | null;   // npc id who retrieves it
  heavy?: boolean;        // drag instead of carry
  locked?: string;        // flag required before grabbable
}

export const ITEMS: ItemDef[] = [
  // park
  { id: 'chip-1', kind: 'chip', x: 1560, y: 1330, owner: 'picnicker' },
  { id: 'chip-2', kind: 'chip', x: 1600, y: 1322, owner: 'picnicker' },
  { id: 'chip-3', kind: 'chip', x: 1640, y: 1332, owner: 'picnicker' },
  { id: 'sandwich', kind: 'sandwich', x: 1680, y: 1340, owner: 'picnicker' },
  { id: 'phone', kind: 'phone', x: 1530, y: 1342, owner: 'picnicker' },
  { id: 'thong', kind: 'thong', x: 1750, y: 1500, owner: 'picnicker' },
  { id: 'sausage', kind: 'sausage', x: 950, y: 1085, owner: 'bbqdad' },
  // cafe
  { id: 'croissant', kind: 'croissant', x: 1080, y: 600, owner: 'barista' },
  { id: 'coffee', kind: 'coffee', x: 1310, y: 650, owner: 'waiter' },
  { id: 'coin', kind: 'coin', x: 2200, y: 745, owner: 'busker' },
  // market
  { id: 'mango', kind: 'mango', x: 2780, y: 1270, owner: 'fruitvendor' },
  { id: 'fish', kind: 'fish', x: 3380, y: 1270, owner: 'fishmonger' },
  { id: 'scarf', kind: 'scarf', x: 3020, y: 1750, owner: 'fruitvendor' },
  // beach
  { id: 'sunscreen', kind: 'sunscreen', x: 2080, y: 2740, owner: 'sunbather' },
  { id: 'bucket', kind: 'bucket', x: 1620, y: 2800, owner: 'sunbather' },
  { id: 'whistle', kind: 'whistle', x: 1180, y: 2500, owner: 'lifeguard' },
  // oval
  { id: 'club-key', kind: 'key', x: 4330, y: 470, owner: 'clubpresident' },
  { id: 'golden-chip', kind: 'golden-chip', x: 4120, y: 425, owner: 'clubpresident', locked: 'trophyCaseOpen' },
];

export const PLAYER_START = { x: 1300, y: 1500 };

// Paths painted on the ground layer (tile coords, painted 2 tiles wide).
export const PATHS: Array<{ fromX: number; fromY: number; toX: number; toY: number }> = [
  { fromX: 0, fromY: 46, toX: 74, toY: 46 },    // park main east-west
  { fromX: 38, fromY: 28, toX: 38, toY: 65 },   // park north-south through gate? no — gate at 30
  { fromX: 30, fromY: 28, toX: 30, toY: 46 },   // gate feeder
  { fromX: 84, fromY: 14, toX: 84, toY: 46 },   // cafe→market laneway
  { fromX: 75, fromY: 46, toX: 149, toY: 46 },  // market east-west
  { fromX: 110, fromY: 46, toX: 110, toY: 70 }, // market→beach boardwalk
  { fromX: 120, fromY: 28, toX: 120, toY: 46 }, // market→oval feeder
];
