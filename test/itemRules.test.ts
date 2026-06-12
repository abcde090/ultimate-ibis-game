import { describe, expect, test } from 'vitest';
import {
  makeItem, findGrabbable, grab, drop, isAstray, itemsOwnedBy, makeTrash,
  GRAB_REACH, SLIPPERY_KINDS,
} from '../src/items/itemRules';
import { POND, SEA } from '../src/world/layoutData';

const NO_FLAGS = {};

describe('findGrabbable', () => {
  test('nearest free item within reach', () => {
    const near = makeItem({ id: 'a', kind: 'chip', x: 20, y: 0 });
    const nearer = makeItem({ id: 'b', kind: 'chip', x: 10, y: 0 });
    const far = makeItem({ id: 'c', kind: 'chip', x: GRAB_REACH + 1, y: 0 });
    expect(findGrabbable(0, 0, [near, far, nearer], NO_FLAGS)).toBe(nearer);
  });

  test('ignores held and locked items', () => {
    const held = makeItem({ id: 'a', kind: 'chip', x: 5, y: 0 });
    held.holder = 'npc';
    const locked = makeItem({ id: 'b', kind: 'golden-chip', x: 5, y: 0, locked: 'trophyCaseOpen' });
    expect(findGrabbable(0, 0, [held, locked], NO_FLAGS)).toBeNull();
    expect(findGrabbable(0, 0, [locked], { trophyCaseOpen: true })).toBe(locked);
  });
});

describe('grab / drop', () => {
  test('grab sets holder and dries the item', () => {
    const item = makeItem({ id: 'a', kind: 'phone', x: 0, y: 0 });
    item.inWater = true;
    grab(item, 'player');
    expect(item.holder).toBe('player');
    expect(item.inWater).toBe(false);
  });

  test('drop on land vs in the pond vs in the sea', () => {
    const item = makeItem({ id: 'a', kind: 'phone', x: 0, y: 0 });
    expect(drop(item, 100, 100)).toBe(false);
    expect(drop(item, POND.cx, POND.cy)).toBe(true);
    expect(drop(item, 500, SEA.topY + 50)).toBe(true);
  });
});

describe('isAstray', () => {
  test('loose away from home and dry → astray', () => {
    const item = makeItem({ id: 'a', kind: 'chip', x: 0, y: 0 });
    item.x = 100;
    expect(isAstray(item)).toBe(true);
  });

  test('not astray when home, held, or wet', () => {
    const home = makeItem({ id: 'a', kind: 'chip', x: 0, y: 0 });
    expect(isAstray(home)).toBe(false);
    const held = makeItem({ id: 'b', kind: 'chip', x: 0, y: 0 });
    held.x = 100;
    held.holder = 'player';
    expect(isAstray(held)).toBe(false);
    const wet = makeItem({ id: 'c', kind: 'chip', x: 0, y: 0 });
    wet.x = 100;
    wet.inWater = true;
    expect(isAstray(wet)).toBe(false);
  });
});

describe('helpers', () => {
  test('itemsOwnedBy filters', () => {
    const a = makeItem({ id: 'a', kind: 'chip', x: 0, y: 0, owner: 'picnicker' });
    const b = makeItem({ id: 'b', kind: 'fish', x: 0, y: 0, owner: 'fishmonger' });
    expect(itemsOwnedBy([a, b], 'picnicker')).toEqual([a]);
  });

  test('makeTrash is unique, unowned, slippery-capable set exists', () => {
    const t1 = makeTrash(1, 2);
    const t2 = makeTrash(1, 2);
    expect(t1.id).not.toBe(t2.id);
    expect(t1.owner).toBeNull();
    expect(SLIPPERY_KINDS.has('trash-peel')).toBe(true);
  });
});
