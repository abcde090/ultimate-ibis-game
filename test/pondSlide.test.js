import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slideAroundPond } from '../src/entities/npc.js';
import { POND } from '../src/world/level.js';
import { pointInEllipse, dirTo, dist } from '../src/engine/collision.js';

// Simulate the relevant part of npc movement: walk straight at the target,
// slide along the bank whenever the straight step would enter the pond.
function walkTowards(start, target, { speed = 115, dt = 1 / 60, maxSeconds = 30 } = {}) {
  const npc = { x: start.x, y: start.y };
  const maxSteps = Math.ceil(maxSeconds / dt);
  for (let i = 0; i < maxSteps; i++) {
    if (dist(npc.x, npc.y, target.x, target.y) < 26) return { reached: true, npc };
    const dir = dirTo(npc.x, npc.y, target.x, target.y);
    let nx = npc.x + dir.x * speed * dt;
    let ny = npc.y + dir.y * speed * dt;
    if (pointInEllipse(nx, ny, POND.cx, POND.cy, POND.rx, POND.ry)) {
      const slid = slideAroundPond(npc, dir, speed * dt);
      if (!slid) return { reached: false, npc, stuck: true };
      nx = slid.x;
      ny = slid.y;
    }
    assert.ok(
      !pointInEllipse(nx, ny, POND.cx, POND.cy, POND.rx, POND.ry),
      `npc waded into the pond at (${nx.toFixed(1)}, ${ny.toFixed(1)})`,
    );
    npc.x = nx;
    npc.y = ny;
  }
  return { reached: false, npc, stuck: false };
}

test('npc walks around the pond instead of freezing at the bank (north to south)', () => {
  const result = walkTowards(
    { x: POND.cx, y: POND.cy - POND.ry - 40 },
    { x: POND.cx, y: POND.cy + POND.ry + 80 },
  );
  assert.ok(result.reached, `should round the pond, ended at (${result.npc.x}, ${result.npc.y})`);
});

test('npc rounds the pond travelling east to west', () => {
  const result = walkTowards(
    { x: POND.cx + POND.rx + 30, y: POND.cy },
    { x: POND.cx - POND.rx - 60, y: POND.cy + 10 },
  );
  assert.ok(result.reached);
});

test('the old stuck patrol leg now completes', () => {
  // The original groundskeeper route walked (1250,500) -> (1100,950),
  // a straight line through the pond, which used to strand him forever.
  const result = walkTowards({ x: 1250, y: 500 }, { x: 1100, y: 950 });
  assert.ok(result.reached);
});

test('slide never returns a position inside the pond', () => {
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const npc = {
      x: POND.cx + Math.cos(a) * (POND.rx + 2),
      y: POND.cy + Math.sin(a) * (POND.ry + 2),
    };
    // Desired direction: straight at the pond centre (worst case).
    const dir = dirTo(npc.x, npc.y, POND.cx, POND.cy);
    const slid = slideAroundPond(npc, dir, 4);
    if (slid) {
      assert.ok(!pointInEllipse(slid.x, slid.y, POND.cx, POND.cy, POND.rx, POND.ry));
    }
  }
});
