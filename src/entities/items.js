// Pure item logic: grabbing, dropping, pond physics. No DOM.

import { dist, pointInEllipse } from '../engine/collision.js';

export const GRAB_REACH = 46;

// Nearest free item within reach of the beak tip, or null.
export function findGrabbable(beakX, beakY, items) {
  let best = null;
  let bestD = Infinity;
  for (const item of items) {
    if (item.holder !== null) continue;
    const d = dist(beakX, beakY, item.x, item.y);
    if (d <= GRAB_REACH && d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

export function grab(item, holderId) {
  item.holder = holderId;
  item.inPond = false;
}

// Drop at (x, y); returns true if it landed in the pond.
export function drop(item, x, y, pond) {
  item.holder = null;
  item.x = x;
  item.y = y;
  item.inPond = pointInEllipse(x, y, pond.cx, pond.cy, pond.rx, pond.ry);
  return item.inPond;
}

// Is this item somewhere its owner would want to fetch it from?
// (Loose, away from home, and not in the pond — humans won't wade.)
export function isAstray(item, pond) {
  if (item.holder !== null) return false;
  if (item.inPond) return false;
  return dist(item.x, item.y, item.home.x, item.home.y) > 24;
}

export function itemsOwnedBy(items, ownerId) {
  return items.filter((it) => it.owner === ownerId);
}

let trashCounter = 0;

export function makeTrash(x, y) {
  trashCounter += 1;
  const kinds = ['can', 'peel', 'wrapper'];
  return {
    id: `trash-${trashCounter}`,
    kind: 'trash',
    trashKind: kinds[trashCounter % kinds.length],
    label: 'sweet, sweet garbage',
    x, y,
    owner: null,
    home: { x, y },
    holder: null,
    inPond: false,
  };
}
