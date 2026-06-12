import { describe, expect, test } from 'vitest';
import {
  MAP_TILES, TILE_PX, WORLD, DISTRICTS, GATES, BARRIERS, POND, SEA, NEST,
  PROPS, NPCS, DOGS, MAGPIE, SEAGULLS, ITEMS, PLAYER_START,
} from '../src/world/layoutData';

function inWater(x: number, y: number): boolean {
  if (y >= SEA.topY) return true;
  const dx = (x - POND.cx) / POND.rx;
  const dy = (y - POND.cy) / POND.ry;
  return dx * dx + dy * dy <= 1;
}

describe('districts', () => {
  test('tile the whole map with no gaps or overlaps', () => {
    const cover = new Array<number>(MAP_TILES.w * MAP_TILES.h).fill(0);
    for (const d of Object.values(DISTRICTS)) {
      for (let y = d.y; y < d.y + d.h; y++) {
        for (let x = d.x; x < d.x + d.w; x++) {
          cover[y * MAP_TILES.w + x] = (cover[y * MAP_TILES.w + x] ?? 0) + 1;
        }
      }
    }
    expect(cover.every((c) => c === 1)).toBe(true);
  });
});

describe('gates and barriers', () => {
  test('every gate sits in a barrier gap', () => {
    for (const gate of GATES) {
      const barrier = BARRIERS.find(
        (b) => b.axis === 'h' && b.tileY === gate.tileY &&
          gate.tileX >= b.fromX && gate.tileX <= b.toX,
      );
      expect(barrier, gate.id).toBeDefined();
      expect(barrier!.gapAt, gate.id).toContain(gate.tileX);
    }
  });

  test('gate ordering matches progression', () => {
    expect(GATES.map((g) => g.id)).toEqual([
      'gate-park-cafe', 'gate-cafe-market', 'gate-market-beach', 'gate-market-oval',
    ]);
  });
});

describe('placement sanity', () => {
  test('all props are inside the world', () => {
    for (const p of PROPS) {
      expect(p.x, p.sprite).toBeGreaterThanOrEqual(0);
      expect(p.x, p.sprite).toBeLessThanOrEqual(WORLD.w);
      expect(p.y, p.sprite).toBeGreaterThanOrEqual(0);
      expect(p.y, p.sprite).toBeLessThanOrEqual(WORLD.h);
    }
  });

  test('no npc, dog, or item spawns in water', () => {
    for (const n of NPCS) expect(inWater(n.x, n.y), n.id).toBe(false);
    for (const d of DOGS) expect(inWater(d.x, d.y), d.id).toBe(false);
    for (const i of ITEMS) expect(inWater(i.x, i.y), i.id).toBe(false);
    for (const s of SEAGULLS) expect(inWater(s.x, s.y), 'seagull').toBe(false);
  });

  test('npc patrol and schedule points stay on land and in the world', () => {
    for (const n of NPCS) {
      for (const p of n.patrol ?? []) expect(inWater(p.x, p.y), n.id).toBe(false);
      for (const s of n.schedule ?? []) expect(inWater(s.x, s.y), n.id).toBe(false);
    }
  });

  test('player start is on land inside the park', () => {
    expect(inWater(PLAYER_START.x, PLAYER_START.y)).toBe(false);
    const d = DISTRICTS.park;
    expect(PLAYER_START.x).toBeGreaterThan(d.x * TILE_PX);
    expect(PLAYER_START.x).toBeLessThan((d.x + d.w) * TILE_PX);
    expect(PLAYER_START.y).toBeGreaterThan(d.y * TILE_PX);
    expect(PLAYER_START.y).toBeLessThan((d.y + d.h) * TILE_PX);
  });

  test('nest is inside the park on land', () => {
    expect(inWater(NEST.x, NEST.y)).toBe(false);
  });
});

describe('references', () => {
  const npcIds = new Set(NPCS.map((n) => n.id));
  const propIds = new Set(PROPS.filter((p) => p.id).map((p) => p.id));

  test('item owners exist', () => {
    for (const item of ITEMS) {
      if (item.owner !== null) expect(npcIds.has(item.owner), `${item.id}→${item.owner}`).toBe(true);
    }
  });

  test('dog leashes anchor to real props', () => {
    for (const dog of DOGS) {
      if (dog.leashedTo) expect(propIds.has(dog.leashedTo), dog.id).toBe(true);
    }
  });

  test('ids are unique across npcs, items, dogs, and stateful props', () => {
    const all = [
      ...NPCS.map((n) => n.id),
      ...ITEMS.map((i) => i.id),
      ...DOGS.map((d) => d.id),
      ...PROPS.filter((p) => p.id).map((p) => p.id!),
      MAGPIE.id,
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  test('magpie perch tree exists', () => {
    expect(propIds.has('magpie-tree')).toBe(true);
  });
});
