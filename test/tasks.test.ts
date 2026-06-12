import { describe, expect, test } from 'vitest';
import {
  TASKS, DISTRICT_ORDER, makeTaskState, updateTasks, tasksFor, districtComplete,
} from '../src/systems/tasks';
import { makeFlags, type Flags } from '../src/systems/flags';

function parkDone(): Flags {
  return {
    ...makeFlags(),
    honked: true, chipStolen: true, binKnocked: true, trashGrabbed: true,
    sausageStolen: true, phoneInPond: true, groundskeeperChased: true, shedSneaked: true,
  };
}

describe('task structure', () => {
  test('every district has tasks; oval has the 4-step finale', () => {
    for (const d of DISTRICT_ORDER) expect(tasksFor(d).length).toBeGreaterThanOrEqual(4);
    expect(tasksFor('oval').length).toBe(4);
    expect(TASKS.filter((t) => t.district !== 'oval').length).toBe(32);
  });

  test('task ids are unique', () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
  });

  test('every check is callable on fresh flags without completing', () => {
    const flags = makeFlags();
    for (const t of TASKS) expect(t.check(flags), t.id).toBe(false);
  });
});

describe('progression', () => {
  test('fresh state: only the park is unlocked', () => {
    const s = makeTaskState();
    expect(s.unlockedDistricts).toEqual(['park']);
  });

  test('a flag completes its task exactly once', () => {
    const flags = { ...makeFlags(), honked: true };
    const r1 = updateTasks(makeTaskState(), flags);
    expect(r1.newlyCompleted).toEqual(['park-squawk']);
    const r2 = updateTasks(r1.taskState, flags);
    expect(r2.newlyCompleted).toEqual([]);
  });

  test('locked-district tasks do not complete even when flags are set', () => {
    const flags = { ...makeFlags(), mangoStolen: true };
    const r = updateTasks(makeTaskState(), flags);
    expect(r.taskState.completed).not.toContain('market-mango');
  });

  test('completing the park opens the cafe gate and unlocks cafe tasks', () => {
    const r = updateTasks(makeTaskState(), parkDone());
    expect(districtComplete('park', r.taskState.completed)).toBe(true);
    expect(r.gatesToOpen).toEqual(['gate-park-cafe']);
    expect(r.newDistricts).toEqual(['cafe']);
    expect(r.taskState.unlockedDistricts).toContain('cafe');
  });

  test('cascade stops at the first incomplete district', () => {
    const r = updateTasks(makeTaskState(), parkDone());
    expect(r.taskState.unlockedDistricts).not.toContain('market');
  });

  test('the win fires only on the golden chip task', () => {
    const all: Flags = { ...makeFlags() };
    for (const key of Object.keys(all)) {
      if (typeof all[key] === 'boolean') all[key] = true;
    }
    all.cafeSquawkedAt = ['barista', 'waiter', 'cafecustomer', 'busker', 'influencer'];
    all.beachSquawkedAt = ['lifeguard', 'sunbather'];

    // Walk the full chain in one tick-per-district sequence.
    let state = makeTaskState();
    for (let i = 0; i < DISTRICT_ORDER.length; i++) {
      state = updateTasks(state, all).taskState;
    }
    expect(state.won).toBe(true);
    expect(state.completed).toContain('oval-goldenchip');
  });

  test('updateTasks does not mutate its input', () => {
    const prev = makeTaskState();
    const frozen = { ...prev, completed: Object.freeze([]) as unknown as string[] };
    expect(() => updateTasks(frozen, parkDone())).not.toThrow();
    expect(prev.completed).toEqual([]);
  });
});
