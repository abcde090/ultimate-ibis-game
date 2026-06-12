// Paints the ground tile layer and writes public/assets/map.json in Tiled
// JSON format (openable in the Tiled editor). Entities/collision come from
// src/world/layoutData.ts directly — only the ground lives here.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { TILE, TILE_SIZE, TILESET_COLUMNS, TILE_ORDER } from '../atlas/sprites/tiles';
import { MAP_TILES, DISTRICTS, POND, SEA, PATHS, TILE_PX } from '../../src/world/layoutData';

const { w: W, h: H } = MAP_TILES;
const grid = new Array<number>(W * H).fill(TILE['grass-a'] ?? 1);

// Deterministic RNG for mottling.
let seed = 424242;
const rnd = (): number => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const set = (x: number, y: number, gid: number | undefined): void => {
  if (x < 0 || y < 0 || x >= W || y >= H || gid === undefined) return;
  grid[y * W + x] = gid;
};
const get = (x: number, y: number): number => grid[y * W + x] ?? 0;

// 1. Base grass mottle everywhere.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const r = rnd();
    set(x, y, r < 0.6 ? TILE['grass-a'] : r < 0.85 ? TILE['grass-b'] : TILE['grass-c']);
  }
}

// 2. Cafe strip: paved street south of the shopfronts.
for (let y = 12; y < DISTRICTS.cafe.h; y++) {
  for (let x = DISTRICTS.cafe.x; x < DISTRICTS.cafe.x + DISTRICTS.cafe.w; x++) {
    set(x, y, TILE.pavement);
  }
}

// 3. Oval: lighter managed turf ellipse.
{
  const cx = 122, cy = 14, rx = 25, ry = 11.5;
  for (let y = 0; y < 28; y++) {
    for (let x = 95; x < W; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) set(x, y, TILE['oval-grass']);
    }
  }
}

// 4. Beach: sand, foam line, then sea.
const seaTopTile = Math.floor(SEA.topY / TILE_PX); // 89
for (let y = DISTRICTS.beach.y; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (y < seaTopTile - 1) set(x, y, rnd() < 0.5 ? TILE['sand-a'] : TILE['sand-b']);
    else if (y === seaTopTile - 1) set(x, y, TILE.foam);
    else if (y < seaTopTile + 4) set(x, y, TILE.water);
    else set(x, y, TILE['water-deep']);
  }
}

// 5. Pond (park) with a sandy bank ring.
{
  const cx = POND.cx / TILE_PX;
  const cy = POND.cy / TILE_PX;
  const rx = POND.rx / TILE_PX;
  const ry = POND.ry / TILE_PX;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d <= 1) set(x, y, TILE.water);
      else if (d <= 1.45) set(x, y, TILE['sand-a']);
    }
  }
}

// 6. Paths (2 tiles wide), never over water/foam.
const protectedTiles = new Set([TILE.water, TILE['water-deep'], TILE.foam]);
for (const p of PATHS) {
  const steps = Math.max(Math.abs(p.toX - p.fromX), Math.abs(p.toY - p.fromY));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(p.fromX + ((p.toX - p.fromX) * i) / Math.max(steps, 1));
    const y = Math.round(p.fromY + ((p.toY - p.fromY) * i) / Math.max(steps, 1));
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      if (!protectedTiles.has(get(x + ox, y + oy))) set(x + ox, y + oy, TILE.path);
    }
  }
}

// 7. Emit Tiled JSON.
const mapJson = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: W,
  height: H,
  tilewidth: TILE_SIZE,
  tileheight: TILE_SIZE,
  infinite: false,
  layers: [
    {
      type: 'tilelayer',
      id: 1,
      name: 'ground',
      width: W,
      height: H,
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      data: grid,
    },
  ],
  nextlayerid: 2,
  nextobjectid: 1,
  tilesets: [
    {
      firstgid: 1,
      name: 'tiles',
      image: 'tiles.png',
      imagewidth: TILESET_COLUMNS * TILE_SIZE,
      imageheight: Math.ceil(TILE_ORDER.length / TILESET_COLUMNS) * TILE_SIZE,
      tilewidth: TILE_SIZE,
      tileheight: TILE_SIZE,
      tilecount: TILE_ORDER.length,
      columns: TILESET_COLUMNS,
      margin: 0,
      spacing: 0,
    },
  ],
};

const OUT = path.resolve(import.meta.dirname, '../../public/assets');
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, 'map.json'), JSON.stringify(mapJson));
console.log(`map: ${W}x${H} tiles → map.json`);
