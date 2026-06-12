import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  think, makeMind, CATCH_RADIUS, GIVE_UP_RADIUS, STARTLE_SECONDS,
} from '../src/entities/npcBrain.js';

const DEF = { noticeRadius: 240, personalSpace: 0 };
const KEEPER_DEF = { noticeRadius: 260, personalSpace: 95 };

function perception(overrides = {}) {
  return {
    distToPlayer: 9999,
    playerHasMyItem: false,
    astrayItemId: null,
    fetchTargetValid: false,
    playerInPond: false,
    knockedBinId: null,
    binStillKnocked: false,
    atTarget: false,
    startled: false,
    ...overrides,
  };
}

test('idle npc starts chasing when the player steals nearby', () => {
  const mind = makeMind(DEF);
  const next = think(mind, perception({ playerHasMyItem: true, distToPlayer: 100 }));
  assert.equal(next.state, 'chase');
});

test('idle npc ignores theft outside notice radius', () => {
  const mind = makeMind(DEF);
  const next = think(mind, perception({ playerHasMyItem: true, distToPlayer: 500 }));
  assert.equal(next.state, 'idle');
});

test('idle npc goes to fetch an astray item', () => {
  const mind = makeMind(DEF);
  const next = think(mind, perception({ astrayItemId: 'chip-1' }));
  assert.equal(next.state, 'fetch');
  assert.equal(next.targetItemId, 'chip-1');
});

test('groundskeeper shoos when the ibis invades personal space', () => {
  const mind = makeMind(KEEPER_DEF);
  const next = think(mind, perception({ distToPlayer: 50 }));
  assert.equal(next.state, 'shoo');
});

test('npc without personal space never shoos', () => {
  const mind = makeMind(DEF);
  const next = think(mind, perception({ distToPlayer: 5 }));
  assert.equal(next.state, 'idle');
});

test('groundskeeper goes to fix a knocked bin', () => {
  const mind = makeMind(KEEPER_DEF);
  const next = think(mind, perception({ knockedBinId: 'bin-a' }));
  assert.equal(next.state, 'gotobin');
  assert.equal(next.targetBinId, 'bin-a');
});

test('chase catches the player at close range', () => {
  const mind = { ...makeMind(DEF), state: 'chase' };
  const next = think(mind, perception({
    playerHasMyItem: true, distToPlayer: CATCH_RADIUS - 1,
  }));
  assert.equal(next.state, 'catch');
});

test('chase gives up when the player escapes into the pond', () => {
  const mind = { ...makeMind(DEF), state: 'chase' };
  const next = think(mind, perception({
    playerHasMyItem: true, distToPlayer: 80, playerInPond: true,
  }));
  assert.equal(next.state, 'gohome');
});

test('chase gives up beyond the give-up radius', () => {
  const mind = { ...makeMind(DEF), state: 'chase' };
  const next = think(mind, perception({
    playerHasMyItem: true, distToPlayer: GIVE_UP_RADIUS + 1,
  }));
  assert.equal(next.state, 'gohome');
});

test('chase switches to fetch when the player drops the item', () => {
  const mind = { ...makeMind(DEF), state: 'chase' };
  const next = think(mind, perception({ astrayItemId: 'chip-1' }));
  assert.equal(next.state, 'fetch');
  assert.equal(next.targetItemId, 'chip-1');
});

test('catch resolves to fetching the dropped item', () => {
  const mind = { ...makeMind(DEF), state: 'catch' };
  const next = think(mind, perception({ astrayItemId: 'chip-1' }));
  assert.equal(next.state, 'fetch');
});

test('fetch picks up on arrival and carries', () => {
  const mind = { ...makeMind(DEF), state: 'fetch', targetItemId: 'chip-1' };
  const next = think(mind, perception({ fetchTargetValid: true, atTarget: true }));
  assert.equal(next.state, 'carry');
});

test('fetch aborts when the target vanishes (e.g. re-stolen or in pond)', () => {
  const mind = { ...makeMind(DEF), state: 'fetch', targetItemId: 'chip-1' };
  const next = think(mind, perception({ fetchTargetValid: false }));
  assert.equal(next.state, 'gohome');
});

test('fetch breaks into chase if the player re-steals nearby', () => {
  const mind = { ...makeMind(DEF), state: 'fetch', targetItemId: 'chip-1' };
  const next = think(mind, perception({
    playerHasMyItem: true, distToPlayer: 50, fetchTargetValid: false,
  }));
  assert.equal(next.state, 'chase');
});

test('carry finishes at the item home and heads home', () => {
  const mind = { ...makeMind(DEF), state: 'carry', targetItemId: 'chip-1' };
  const next = think(mind, perception({ atTarget: true }));
  assert.equal(next.state, 'gohome');
  assert.equal(next.targetItemId, null);
});

test('a squawk startles any npc except one carrying an item', () => {
  const idle = makeMind(DEF);
  const startledNext = think(idle, perception({ startled: true }));
  assert.equal(startledNext.state, 'startled');
  assert.equal(startledNext.timer, STARTLE_SECONDS);

  const carrying = { ...makeMind(DEF), state: 'carry', targetItemId: 'chip-1' };
  const unbothered = think(carrying, perception({ startled: true }));
  assert.equal(unbothered.state, 'carry');
});

test('startled npc recovers to idle when the timer elapses', () => {
  const mind = { ...makeMind(DEF), state: 'startled', timer: -0.01 };
  const next = think(mind, perception());
  assert.equal(next.state, 'idle');
});

test('startled npc stays startled while the timer runs', () => {
  const mind = { ...makeMind(DEF), state: 'startled', timer: 0.5 };
  const next = think(mind, perception());
  assert.equal(next.state, 'startled');
});

test('gotobin transitions to fixbin on arrival', () => {
  const mind = { ...makeMind(KEEPER_DEF), state: 'gotobin', targetBinId: 'bin-a' };
  const next = think(mind, perception({ binStillKnocked: true, atTarget: true }));
  assert.equal(next.state, 'fixbin');
  assert.ok(next.timer > 0);
});

test('gotobin aborts if someone already fixed the bin', () => {
  const mind = { ...makeMind(KEEPER_DEF), state: 'gotobin', targetBinId: 'bin-a' };
  const next = think(mind, perception({ binStillKnocked: false }));
  assert.equal(next.state, 'gohome');
});

test('fixbin completes after its timer', () => {
  const mind = { ...makeMind(KEEPER_DEF), state: 'fixbin', targetBinId: 'bin-a', timer: -0.01 };
  const next = think(mind, perception());
  assert.equal(next.state, 'gohome');
  assert.equal(next.targetBinId, null);
});

test('gohome arrives and settles to idle', () => {
  const mind = { ...makeMind(DEF), state: 'gohome' };
  assert.equal(think(mind, perception({ atTarget: true })).state, 'idle');
  assert.equal(think(mind, perception({ atTarget: false })).state, 'gohome');
});

test('gohome is interrupted by fresh theft or astray items', () => {
  const mind = { ...makeMind(DEF), state: 'gohome' };
  const chased = think(mind, perception({ playerHasMyItem: true, distToPlayer: 60 }));
  assert.equal(chased.state, 'chase');
  const fetching = think(mind, perception({ astrayItemId: 'chip-2' }));
  assert.equal(fetching.state, 'fetch');
});

test('think never mutates the input mind', () => {
  const mind = makeMind(DEF);
  const frozen = Object.freeze({ ...mind });
  think(Object.freeze(mind), perception({ startled: true }));
  assert.deepEqual(mind, frozen);
});
