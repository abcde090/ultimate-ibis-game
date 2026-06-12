import { makeItems, makeBins, makeNpcDefs, PLAYER_START } from '../world/level.js';
import { makeMind } from '../entities/npcBrain.js';
import { makeFlags, makeTaskState } from './tasks.js';

export function createGameState() {
  return {
    time: 0,
    player: {
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      vx: 0,
      vy: 0,
      r: 14,
      facing: -1,          // -1 left, 1 right
      walkPhase: 0,
      moving: false,
      sprinting: false,
      inPond: false,
      heldItemId: null,
      honkTimer: 0,        // squawk-bubble countdown
    },
    npcs: makeNpcDefs().map((def) => ({
      def,
      x: def.home.x,
      y: def.home.y,
      r: 15,
      facing: 1,
      walkPhase: 0,
      moving: false,
      mind: makeMind(def),
      patrolIndex: 0,
      heldItemId: null,
      alertTimer: 0,       // "!" bubble countdown
      grumbleTimer: 0,     // "hmph" bubble countdown
    })),
    items: makeItems(),
    bins: makeBins(),
    flags: makeFlags(),
    taskState: makeTaskState(),
    finalRevealTimer: 0,
  };
}

export function findItem(state, id) {
  return state.items.find((it) => it.id === id) || null;
}

export function heldItem(state, holderId) {
  return state.items.find((it) => it.holder === holderId) || null;
}
