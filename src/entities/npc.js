import { POND, RECTS, TREES } from '../world/level.js';
import { dist, dirTo, pointInEllipse, pushOutOfAll } from '../engine/collision.js';
import { think } from './npcBrain.js';
import { isAstray, itemsOwnedBy, grab, drop } from './items.js';
import { resolveWorldCollisions } from './ibis.js';
import { findItem, heldItem } from '../game/state.js';

const CHASE_SPEED = 235;
const SHOO_SPEED = 215;
const WALK_SPEED = 115;
const AT_TARGET = 26;

export function updateNpc(npc, state, dt, events) {
  const mind = npc.mind;
  if (mind.timer > 0) mind.timer -= dt;
  if (npc.alertTimer > 0) npc.alertTimer -= dt;
  if (npc.grumbleTimer > 0) npc.grumbleTimer -= dt;

  const p = buildPerception(npc, state);
  const prevState = mind.state;
  npc.mind = think(mind, p);

  reactToTransition(npc, prevState, state, events);
  executeIntents(npc, state, events);
  move(npc, state, dt);
}

function buildPerception(npc, state) {
  const player = state.player;
  const held = heldItem(state, 'player');
  const owned = itemsOwnedBy(state.items, npc.def.id);
  const astray = owned.find((it) => isAstray(it, POND)) || null;

  const targetItem = npc.mind.targetItemId ? findItem(state, npc.mind.targetItemId) : null;
  const targetBin = npc.mind.targetBinId
    ? state.bins.find((b) => b.id === npc.mind.targetBinId) || null
    : null;

  let knockedBinId = null;
  if (npc.def.id === 'groundskeeper') {
    const knocked = state.bins.find((b) => !b.upright);
    if (knocked) knockedBinId = knocked.id;
  }

  return {
    distToPlayer: dist(npc.x, npc.y, player.x, player.y),
    playerHasMyItem: !!held && held.owner === npc.def.id,
    astrayItemId: astray ? astray.id : null,
    fetchTargetValid: !!targetItem && targetItem.holder === null && !targetItem.inPond,
    playerInPond: player.inPond,
    knockedBinId,
    binStillKnocked: !!targetBin && !targetBin.upright,
    atTarget: distToCurrentTarget(npc, state) < AT_TARGET,
    startled: npc.startleEvent === true,
  };
}

function currentTarget(npc, state) {
  const mind = npc.mind;
  switch (mind.state) {
    case 'chase':
    case 'shoo':
      return { x: state.player.x, y: state.player.y };
    case 'fetch': {
      const item = mind.targetItemId ? findItem(state, mind.targetItemId) : null;
      return item ? { x: item.x, y: item.y } : npc.def.home;
    }
    case 'carry': {
      const item = heldItem(state, npc.def.id);
      return item ? item.home : npc.def.home;
    }
    case 'gotobin': {
      const bin = state.bins.find((b) => b.id === mind.targetBinId);
      return bin ? { x: bin.x, y: bin.y + 24 } : npc.def.home;
    }
    case 'gohome':
      return npc.def.home;
    case 'patrol':
    case 'idle': {
      if (npc.def.patrol) return npc.def.patrol[npc.patrolIndex];
      return npc.def.home;
    }
    default:
      return null;
  }
}

function distToCurrentTarget(npc, state) {
  const t = currentTarget(npc, state);
  if (!t) return Infinity;
  return dist(npc.x, npc.y, t.x, t.y);
}

function reactToTransition(npc, prevState, state, events) {
  const cur = npc.mind.state;
  if (cur === prevState) return;

  if (cur === 'chase' || cur === 'shoo') {
    npc.alertTimer = 1.0;
    events.push({ type: 'npc-alert', npcId: npc.def.id });
    if (npc.def.id === 'groundskeeper') {
      state.flags.groundskeeperChased = true;
    }
  }
  if (cur === 'gohome' && (prevState === 'chase' || prevState === 'shoo')) {
    npc.grumbleTimer = 1.4;
  }
}

function executeIntents(npc, state, events) {
  const mind = npc.mind;

  // Caught the ibis: it drops the loot on the spot.
  if (mind.state === 'catch') {
    const held = heldItem(state, 'player');
    if (held && held.owner === npc.def.id) {
      // Land the item clear of solid props so the npc can fetch it.
      const spot = pushOutOfAll(
        state.player.x + state.player.facing * 20, state.player.y,
        10, RECTS, TREES,
      );
      drop(held, spot.x, spot.y, POND);
      state.player.heldItemId = null;
      events.push({ type: 'forced-drop', itemId: held.id });
    }
    return;
  }

  // Arrived at a loose item: scoop it up.
  if (mind.state === 'carry' && npc.heldItemId === null && mind.targetItemId) {
    const item = findItem(state, mind.targetItemId);
    if (item && item.holder === null && !item.inPond) {
      grab(item, npc.def.id);
      npc.heldItemId = item.id;
    } else {
      npc.mind = { ...mind, state: 'gohome', targetItemId: null };
    }
  }

  // Arrived home with the item: put it back.
  if (mind.state === 'gohome' && npc.heldItemId !== null) {
    const item = findItem(state, npc.heldItemId);
    if (item) drop(item, item.home.x, item.home.y, POND);
    npc.heldItemId = null;
    npc.mind = { ...npc.mind, targetItemId: null };
  }

  // Finished righting the bin.
  if (mind.state === 'gohome' && npc.binToFix) {
    const bin = state.bins.find((b) => b.id === npc.binToFix);
    if (bin) { bin.upright = true; bin.spilled = false; }
    npc.binToFix = null;
    events.push({ type: 'bin-fixed' });
  }
  if (mind.state === 'fixbin') {
    npc.binToFix = mind.targetBinId;
  }

  // Carried item rides in the npc's hands (only while we truly hold it).
  if (npc.heldItemId !== null) {
    const item = findItem(state, npc.heldItemId);
    if (item && item.holder === npc.def.id) {
      item.x = npc.x + npc.facing * 14;
      item.y = npc.y - 34;
    } else {
      npc.heldItemId = null; // lost it somehow — never drag it back
    }
  }
}

function move(npc, state, dt) {
  const mind = npc.mind;
  npc.moving = false;
  if (mind.state === 'startled' || mind.state === 'fixbin') return;

  const target = currentTarget(npc, state);
  if (!target) return;

  const d = dist(npc.x, npc.y, target.x, target.y);

  // Advance patrol waypoints.
  if ((mind.state === 'idle' || mind.state === 'patrol') && npc.def.patrol && d < AT_TARGET) {
    npc.patrolIndex = (npc.patrolIndex + 1) % npc.def.patrol.length;
    return;
  }
  if (d < AT_TARGET) return;

  let speed = WALK_SPEED;
  if (mind.state === 'chase') speed = CHASE_SPEED;
  if (mind.state === 'shoo') speed = SHOO_SPEED;

  const dir = dirTo(npc.x, npc.y, target.x, target.y);
  let nx = npc.x + dir.x * speed * dt;
  let ny = npc.y + dir.y * speed * dt;

  // Humans refuse to enter the pond — slide around its edge instead
  // of freezing when the straight line to the target crosses water.
  if (pointInEllipse(nx, ny, POND.cx, POND.cy, POND.rx, POND.ry)) {
    const slid = slideAroundPond(npc, dir, speed * dt);
    if (!slid) return;
    nx = slid.x;
    ny = slid.y;
  } else {
    npc.slideSign = null; // straight path is clear again
  }

  npc.x = nx;
  npc.y = ny;
  npc.moving = true;
  if (Math.abs(dir.x) > 0.1) npc.facing = dir.x > 0 ? 1 : -1;
  npc.walkPhase += dt * 11;

  resolveWorldCollisions(npc, state.bins);
}

// Step tangentially along the pond bank in whichever direction makes
// progress towards where the npc wants to go. Returns the new position,
// or null if no tangent step stays dry. Exported for tests.
export function slideAroundPond(npc, desiredDir, stepLen) {
  // Work in the pond's "circle space" so the tangent hugs the ellipse.
  const u = (npc.x - POND.cx) / POND.rx;
  const v = (npc.y - POND.cy) / POND.ry;
  const mag = Math.hypot(u, v) || 1;
  // Tangent of the ellipse at this point, mapped back to world space.
  let tx = (-v / mag) * POND.rx;
  let ty = (u / mag) * POND.ry;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;
  // Pick the tangent direction that agrees with where we're headed, then
  // stick with it for the whole slide — re-deciding every frame makes the
  // npc oscillate forever at the pond's apex when the target is dead ahead.
  if (!npc.slideSign) {
    const dot = tx * desiredDir.x + ty * desiredDir.y;
    npc.slideSign = dot >= 0 ? 1 : -1;
  }
  const nx = npc.x + tx * npc.slideSign * stepLen;
  const ny = npc.y + ty * npc.slideSign * stepLen;
  if (pointInEllipse(nx, ny, POND.cx, POND.cy, POND.rx, POND.ry)) return null;
  return { x: nx, y: ny };
}
