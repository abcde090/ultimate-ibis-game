// Pure 2D collision / geometry helpers. No DOM, no side effects.

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.hypot(dx, dy);
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Returns {x, y} push-out vector to move circle `a` out of circle `b`,
// or null if they don't overlap. Circles: {x, y, r}.
export function circlePushout(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const d = Math.hypot(dx, dy);
  const overlap = a.r + b.r - d;
  if (overlap <= 0) return null;
  if (d === 0) return { x: overlap, y: 0 }; // degenerate: push right
  return { x: (dx / d) * overlap, y: (dy / d) * overlap };
}

// Push-out vector for circle {x,y,r} vs axis-aligned rect {x,y,w,h},
// or null if no overlap.
export function circleRectPushout(c, rect) {
  const nx = clamp(c.x, rect.x, rect.x + rect.w);
  const ny = clamp(c.y, rect.y, rect.y + rect.h);
  const dx = c.x - nx;
  const dy = c.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.r * c.r) return null;

  if (d2 > 0) {
    const d = Math.sqrt(d2);
    const overlap = c.r - d;
    return { x: (dx / d) * overlap, y: (dy / d) * overlap };
  }

  // Centre is inside the rect: push out along the nearest face.
  const left = c.x - rect.x;
  const right = rect.x + rect.w - c.x;
  const top = c.y - rect.y;
  const bottom = rect.y + rect.h - c.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: -(left + c.r), y: 0 };
  if (min === right) return { x: right + c.r, y: 0 };
  if (min === top) return { x: 0, y: -(top + c.r) };
  return { x: 0, y: bottom + c.r };
}

export function pointInEllipse(px, py, cx, cy, rx, ry) {
  const dx = (px - cx) / rx;
  const dy = (py - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w &&
         py >= rect.y && py <= rect.y + rect.h;
}

// Push a point with radius r out of every rect and circle obstacle it
// overlaps. Returns a corrected {x, y}; used to keep dropped items out
// of solid props where humans couldn't reach them.
export function pushOutOfAll(x, y, r, rects, circles) {
  let px = x;
  let py = y;
  for (const rect of rects) {
    const push = circleRectPushout({ x: px, y: py, r }, rect);
    if (push) { px += push.x; py += push.y; }
  }
  for (const c of circles) {
    const push = circlePushout({ x: px, y: py, r }, c);
    if (push) { px += push.x; py += push.y; }
  }
  return { x: px, y: py };
}

// Normalised direction from (ax,ay) to (bx,by); zero vector if same point.
export function dirTo(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  if (d === 0) return { x: 0, y: 0 };
  return { x: dx / d, y: dy / d };
}
