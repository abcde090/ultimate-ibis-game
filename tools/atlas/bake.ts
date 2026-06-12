// Bakes every SVG sprite into public/assets/atlas.png + atlas.json
// (Phaser JSON-hash format) and the ground tiles into tiles.png.
// Deterministic: same inputs → byte-identical layout metadata.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { SpriteFrame } from './svg';
import { ibisFrames } from './sprites/ibis';
import { humanFrames } from './sprites/humans';
import { animalFrames } from './sprites/animals';
import { propFrames } from './sprites/props';
import { itemFrames } from './sprites/items';
import { tileDocs, TILE_SIZE, TILESET_COLUMNS } from './sprites/tiles';

const OUT_DIR = path.resolve(import.meta.dirname, '../../public/assets');
const ATLAS_W = 2048;
const PAD = 2; // bleed gap between frames

interface Placed extends SpriteFrame {
  x: number;
  y: number;
}

// Shelf packing: tallest first, rows across a fixed-width sheet.
function pack(frames: SpriteFrame[]): { placed: Placed[]; height: number } {
  const sorted = [...frames].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  const placed: Placed[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const f of sorted) {
    if (x + f.w + PAD > ATLAS_W) {
      x = 0;
      y += rowH + PAD;
      rowH = 0;
    }
    placed.push({ ...f, x, y });
    x += f.w + PAD;
    rowH = Math.max(rowH, f.h);
  }
  return { placed, height: y + rowH + PAD };
}

async function bakeAtlas(): Promise<void> {
  const frames = [
    ...ibisFrames(),
    ...humanFrames(),
    ...animalFrames(),
    ...propFrames(),
    ...itemFrames(),
  ];
  const names = new Set<string>();
  for (const f of frames) {
    if (names.has(f.name)) throw new Error(`duplicate frame name: ${f.name}`);
    names.add(f.name);
  }

  const { placed, height } = pack(frames);
  const composites = await Promise.all(
    placed.map(async (f) => ({
      input: await sharp(Buffer.from(f.svg)).png().toBuffer(),
      left: f.x,
      top: f.y,
    })),
  );

  const png = await sharp({
    create: { width: ATLAS_W, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();

  const json = {
    frames: Object.fromEntries(
      placed.map((f) => [
        f.name,
        {
          frame: { x: f.x, y: f.y, w: f.w, h: f.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
          sourceSize: { w: f.w, h: f.h },
        },
      ]),
    ),
    meta: { app: 'bin-chicken-bake', version: '1', image: 'atlas.png', size: { w: ATLAS_W, h: height }, scale: '1' },
  };

  await writeFile(path.join(OUT_DIR, 'atlas.png'), png);
  await writeFile(path.join(OUT_DIR, 'atlas.json'), JSON.stringify(json));
  console.log(`atlas: ${placed.length} frames, ${ATLAS_W}x${height}`);
}

async function bakeTiles(): Promise<void> {
  const docs = tileDocs();
  const rows = Math.ceil(docs.length / TILESET_COLUMNS);
  const composites = await Promise.all(
    docs.map(async (d, i) => ({
      input: await sharp(Buffer.from(d.svg)).png().toBuffer(),
      left: (i % TILESET_COLUMNS) * TILE_SIZE,
      top: Math.floor(i / TILESET_COLUMNS) * TILE_SIZE,
    })),
  );
  const png = await sharp({
    create: {
      width: TILESET_COLUMNS * TILE_SIZE,
      height: rows * TILE_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_DIR, 'tiles.png'), png);
  console.log(`tiles: ${docs.length} tiles, ${TILESET_COLUMNS * TILE_SIZE}x${rows * TILE_SIZE}`);
}

await mkdir(OUT_DIR, { recursive: true });
await bakeAtlas();
await bakeTiles();
