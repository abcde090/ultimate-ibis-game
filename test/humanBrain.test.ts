import { describe, expect, test } from 'vitest';
import {
  think, makeMind, CATCH_RADIUS, GIVE_UP_RADIUS, STARTLE_SECONDS,
  type Perception,
} from '../src/actors/brain/humanBrain';

const DEF = { noticeRadius: 240, personalSpace: 0 };
const KEEPER = { noticeRadius: 260, personalSpace: 95 };
const KID = { noticeRadius: 300, personalSpace: 0, playful: true };

function perception(overrides: Partial<Perception> = {}): Perception {
  return {
    distToPlayer: 9999,
    playerHasMyItem: false,
    playerHidden: false,
    playerInWater: false,
    astrayItemId: null,
    fetchTargetValid: false,
    knockedBinId: null,
    binStillKnocked: false,
    atTarget: false,
    startled: false,
    atSchedulePoint: true,
    ...overrides,
  };
}

describe('v1 ported behaviour', () => {
  test('idle → chase when player steals nearby', () => {
    expect(think(makeMind(DEF), perception({ playerHasMyItem: true, distToPlayer: 100 })).state).toBe('chase');
  });

  test('idle ignores theft outside notice radius', () => {
    expect(think(makeMind(DEF), perception({ playerHasMyItem: true, distToPlayer: 500 })).state).toBe('idle');
  });

  test('idle → fetch astray item', () => {
    const next = think(makeMind(DEF), perception({ astrayItemId: 'chip-1' }));
    expect(next.state).toBe('fetch');
    expect(next.targetItemId).toBe('chip-1');
  });

  test('personal space → shoo', () => {
    expect(think(makeMind(KEEPER), perception({ distToPlayer: 50 })).state).toBe('shoo');
    expect(think(makeMind(DEF), perception({ distToPlayer: 5 })).state).toBe('idle');
  });

  test('chase catches close, gives up on water and range', () => {
    const chasing = { ...makeMind(DEF), state: 'chase' as const };
    expect(think(chasing, perception({ playerHasMyItem: true, distToPlayer: CATCH_RADIUS - 1 })).state).toBe('catch');
    expect(think(chasing, perception({ playerHasMyItem: true, distToPlayer: 80, playerInWater: true })).state).toBe('gohome');
    expect(think(chasing, perception({ playerHasMyItem: true, distToPlayer: GIVE_UP_RADIUS + 1 })).state).toBe('gohome');
  });

  test('catch → fetch the dropped item', () => {
    const next = think({ ...makeMind(DEF), state: 'catch' }, perception({ astrayItemId: 'chip-1' }));
    expect(next.state).toBe('fetch');
  });

  test('fetch → carry on arrival; aborts when target vanishes', () => {
    const fetching = { ...makeMind(DEF), state: 'fetch' as const, targetItemId: 'chip-1' };
    expect(think(fetching, perception({ fetchTargetValid: true, atTarget: true })).state).toBe('carry');
    expect(think(fetching, perception({ fetchTargetValid: false })).state).toBe('gohome');
  });

  test('carry → gohome at the item home', () => {
    const carrying = { ...makeMind(DEF), state: 'carry' as const, targetItemId: 'chip-1' };
    const next = think(carrying, perception({ atTarget: true }));
    expect(next.state).toBe('gohome');
    expect(next.targetItemId).toBeNull();
  });

  test('squawk startles everyone except carriers and slippers', () => {
    const startled = think(makeMind(DEF), perception({ startled: true }));
    expect(startled.state).toBe('startled');
    expect(startled.timer).toBe(STARTLE_SECONDS);
    expect(think({ ...makeMind(DEF), state: 'carry' }, perception({ startled: true })).state).toBe('carry');
    expect(think({ ...makeMind(DEF), state: 'slip', timer: 1 }, perception({ startled: true })).state).toBe('slip');
  });

  test('bin pipeline: gotobin → fixbin → gohome', () => {
    expect(think(makeMind(KEEPER), perception({ knockedBinId: 'bin-park-a' })).state).toBe('gotobin');
    const going = { ...makeMind(KEEPER), state: 'gotobin' as const, targetBinId: 'bin-park-a' };
    expect(think(going, perception({ binStillKnocked: true, atTarget: true })).state).toBe('fixbin');
    expect(think(going, perception({ binStillKnocked: false })).state).toBe('gohome');
    expect(think({ ...makeMind(KEEPER), state: 'fixbin', timer: -0.01 }, perception()).state).toBe('gohome');
  });

  test('gohome settles to idle and can be re-interrupted', () => {
    const mind = { ...makeMind(DEF), state: 'gohome' as const };
    expect(think(mind, perception({ atTarget: true })).state).toBe('idle');
    expect(think(mind, perception({ playerHasMyItem: true, distToPlayer: 60 })).state).toBe('chase');
  });
});

describe('v2 additions', () => {
  test('hidden player is never chased and breaks an active chase', () => {
    expect(
      think(makeMind(DEF), perception({ playerHasMyItem: true, distToPlayer: 60, playerHidden: true })).state,
    ).toBe('idle');
    expect(
      think({ ...makeMind(DEF), state: 'chase' }, perception({ playerHasMyItem: true, distToPlayer: 60, playerHidden: true })).state,
    ).toBe('gohome');
  });

  test('hidden player breaks shoo too', () => {
    expect(
      think({ ...makeMind(KEEPER), state: 'shoo' }, perception({ distToPlayer: 40, playerHidden: true })).state,
    ).toBe('gohome');
  });

  test('playful kid chases when the player holds anything nearby', () => {
    // Runtime sets playerHasMyItem=true for kids when the ibis holds ANY item.
    expect(think(makeMind(KID), perception({ playerHasMyItem: true, distToPlayer: 200 })).state).toBe('chase');
  });

  test('slip rides out its timer then goes home', () => {
    expect(think({ ...makeMind(DEF), state: 'slip', timer: 0.5 }, perception()).state).toBe('slip');
    expect(think({ ...makeMind(DEF), state: 'slip', timer: -0.01 }, perception()).state).toBe('gohome');
  });

  test('scheduled npc drifts back to its schedule point', () => {
    const mind = makeMind({ ...DEF, hasSchedule: true });
    expect(think(mind, perception({ atSchedulePoint: false })).state).toBe('schedule');
    expect(think(mind, perception({ atSchedulePoint: true })).state).toBe('idle');
  });

  test('think never mutates its input', () => {
    const mind = Object.freeze(makeMind(DEF));
    expect(() => think(mind, perception({ startled: true }))).not.toThrow();
  });
});
