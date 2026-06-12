import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findGrabbable, grab, drop, isAstray, itemsOwnedBy, makeTrash, GRAB_REACH,
} from '../src/entities/items.js';

const POND = { cx: 1000, cy: 1000, rx: 100, ry: 60 };

function makeItem(overrides = {}) {
  return {
    id: 'it', kind: 'chip', x: 0, y: 0,
    owner: 'picnicker', home: { x: 0, y: 0 },
    holder: null, inPond: false,
    ...overrides,
  };
}

test('findGrabbable picks the nearest free item within reach', () => {
  const near = makeItem({ id: 'near', x: 10, y: 0 });
  const nearer = makeItem({ id: 'nearer', x: 5, y: 0 });
  const far = makeItem({ id: 'far', x: GRAB_REACH + 1, y: 0 });
  assert.equal(findGrabbable(0, 0, [near, far, nearer]), nearer);
});

test('findGrabbable ignores held items and out-of-reach items', () => {
  const held = makeItem({ id: 'held', x: 5, y: 0, holder: 'npc' });
  const far = makeItem({ id: 'far', x: 500, y: 0 });
  assert.equal(findGrabbable(0, 0, [held, far]), null);
});

test('grab sets holder and clears pond state', () => {
  const item = makeItem({ inPond: true });
  grab(item, 'player');
  assert.equal(item.holder, 'player');
  assert.equal(item.inPond, false);
});

test('drop on land leaves the item dry', () => {
  const item = makeItem({ holder: 'player' });
  const splashed = drop(item, 50, 50, POND);
  assert.equal(splashed, false);
  assert.equal(item.holder, null);
  assert.equal(item.inPond, false);
  assert.equal(item.x, 50);
});

test('drop inside the pond marks it inPond', () => {
  const item = makeItem({ holder: 'player' });
  const splashed = drop(item, POND.cx, POND.cy, POND);
  assert.equal(splashed, true);
  assert.equal(item.inPond, true);
});

test('isAstray: away from home and loose', () => {
  const item = makeItem({ x: 100, y: 100 });
  assert.equal(isAstray(item, POND), true);
});

test('isAstray: false when at home, held, or in the pond', () => {
  assert.equal(isAstray(makeItem({ x: 3, y: 3 }), POND), false);
  assert.equal(isAstray(makeItem({ x: 100, holder: 'player' }), POND), false);
  assert.equal(isAstray(makeItem({ x: 100, inPond: true }), POND), false);
});

test('itemsOwnedBy filters by owner', () => {
  const a = makeItem({ id: 'a', owner: 'bbqdad' });
  const b = makeItem({ id: 'b', owner: 'picnicker' });
  assert.deepEqual(itemsOwnedBy([a, b], 'bbqdad'), [a]);
});

test('makeTrash produces unique, unowned, grabbable items', () => {
  const t1 = makeTrash(10, 20);
  const t2 = makeTrash(10, 20);
  assert.notEqual(t1.id, t2.id);
  assert.equal(t1.kind, 'trash');
  assert.equal(t1.owner, null);
  assert.equal(t1.holder, null);
  assert.equal(t1.x, 10);
});
