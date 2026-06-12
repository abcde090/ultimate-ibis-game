import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dist, clamp, circlePushout, circleRectPushout, pointInEllipse,
  pointInRect, dirTo, pushOutOfAll,
} from '../src/engine/collision.js';

test('dist computes euclidean distance', () => {
  assert.equal(dist(0, 0, 3, 4), 5);
  assert.equal(dist(1, 1, 1, 1), 0);
});

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-2, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
});

test('circlePushout returns null when not overlapping', () => {
  assert.equal(circlePushout({ x: 0, y: 0, r: 5 }, { x: 20, y: 0, r: 5 }), null);
  // Exactly touching is not overlapping.
  assert.equal(circlePushout({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 }), null);
});

test('circlePushout pushes a out of b along the centre line', () => {
  const push = circlePushout({ x: 8, y: 0, r: 5 }, { x: 0, y: 0, r: 5 });
  assert.ok(push);
  assert.ok(Math.abs(push.x - 2) < 1e-9);
  assert.equal(push.y, 0);
});

test('circlePushout handles exactly coincident centres', () => {
  const push = circlePushout({ x: 0, y: 0, r: 5 }, { x: 0, y: 0, r: 5 });
  assert.ok(push);
  assert.equal(push.x, 10);
});

test('circleRectPushout returns null when clear of the rect', () => {
  const rect = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(circleRectPushout({ x: 20, y: 5, r: 4 }, rect), null);
});

test('circleRectPushout pushes out from an edge', () => {
  const rect = { x: 0, y: 0, w: 10, h: 10 };
  const push = circleRectPushout({ x: 12, y: 5, r: 4 }, rect);
  assert.ok(push);
  assert.ok(push.x > 0);
  assert.equal(push.y, 0);
  // After applying, circle clears the rect.
  assert.equal(circleRectPushout({ x: 12 + push.x, y: 5, r: 4 }, rect), null);
});

test('circleRectPushout ejects a centre that is inside the rect', () => {
  const rect = { x: 0, y: 0, w: 100, h: 10 };
  const push = circleRectPushout({ x: 50, y: 3, r: 4 }, rect);
  assert.ok(push);
  // Nearest face is the top.
  assert.equal(push.x, 0);
  assert.ok(push.y < 0);
  const after = { x: 50, y: 3 + push.y, r: 4 };
  assert.equal(circleRectPushout(after, rect), null);
});

test('pointInEllipse', () => {
  assert.ok(pointInEllipse(0, 0, 0, 0, 10, 5));
  assert.ok(pointInEllipse(9, 0, 0, 0, 10, 5));
  assert.ok(!pointInEllipse(0, 6, 0, 0, 10, 5));
});

test('pointInRect', () => {
  const rect = { x: 0, y: 0, w: 10, h: 10 };
  assert.ok(pointInRect(5, 5, rect));
  assert.ok(pointInRect(0, 0, rect));
  assert.ok(!pointInRect(11, 5, rect));
});

test('pushOutOfAll leaves clear positions untouched', () => {
  const rects = [{ x: 0, y: 0, w: 10, h: 10 }];
  const circles = [{ x: 100, y: 100, r: 5 }];
  const pos = pushOutOfAll(50, 50, 4, rects, circles);
  assert.deepEqual(pos, { x: 50, y: 50 });
});

test('pushOutOfAll ejects a point from inside a rect', () => {
  const rects = [{ x: 0, y: 0, w: 100, h: 100 }];
  const pos = pushOutOfAll(50, 95, 4, rects, []);
  assert.equal(circleRectPushout({ ...pos, r: 4 }, rects[0]), null);
});

test('pushOutOfAll ejects a point from inside a circle', () => {
  const circles = [{ x: 0, y: 0, r: 20 }];
  const pos = pushOutOfAll(3, 0, 4, [], circles);
  assert.ok(dist(pos.x, pos.y, 0, 0) >= 24 - 1e-9);
});

test('dirTo normalises and handles zero distance', () => {
  const d = dirTo(0, 0, 10, 0);
  assert.equal(d.x, 1);
  assert.equal(d.y, 0);
  const zero = dirTo(3, 3, 3, 3);
  assert.deepEqual(zero, { x: 0, y: 0 });
});
