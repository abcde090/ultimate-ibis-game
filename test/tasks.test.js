import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TASKS, FINAL_TASK, NPC_IDS, makeTaskState, makeFlags, updateTasks,
} from '../src/game/tasks.js';

function allFlagsDone() {
  return {
    ...makeFlags(),
    honked: true,
    chipStolen: true,
    binKnocked: true,
    trashGrabbed: true,
    sausageStolen: true,
    phoneInPond: true,
    groundskeeperChased: true,
    honkedAt: [...NPC_IDS],
  };
}

test('fresh task state has nothing completed', () => {
  const { taskState, newlyCompleted } = updateTasks(makeTaskState(), makeFlags());
  assert.deepEqual(taskState.completed, []);
  assert.deepEqual(newlyCompleted, []);
  assert.equal(taskState.finalUnlocked, false);
});

test('a single flag completes its task once', () => {
  const flags = { ...makeFlags(), honked: true };
  const first = updateTasks(makeTaskState(), flags);
  assert.deepEqual(first.newlyCompleted, ['honk']);
  const second = updateTasks(first.taskState, flags);
  assert.deepEqual(second.newlyCompleted, []);
  assert.deepEqual(second.taskState.completed, ['honk']);
});

test('squawk-at-everyone needs every npc', () => {
  const some = { ...makeFlags(), honkedAt: NPC_IDS.slice(0, 2) };
  const r1 = updateTasks(makeTaskState(), some);
  assert.ok(!r1.taskState.completed.includes('honkall'));
  const all = { ...makeFlags(), honkedAt: [...NPC_IDS] };
  const r2 = updateTasks(makeTaskState(), all);
  assert.ok(r2.taskState.completed.includes('honkall'));
});

test('completing every base task unlocks the final task', () => {
  const { taskState } = updateTasks(makeTaskState(), allFlagsDone());
  assert.equal(taskState.completed.length, TASKS.length);
  assert.equal(taskState.finalUnlocked, true);
  assert.equal(taskState.won, false);
});

test('the golden chip only wins after the final task is unlocked', () => {
  // Golden chip at nest but base tasks incomplete: no win.
  const early = updateTasks(makeTaskState(), {
    ...makeFlags(), goldenChipAtNest: true,
  });
  assert.equal(early.taskState.won, false);
  assert.ok(!early.taskState.completed.includes(FINAL_TASK.id));

  // All base tasks done, then the chip arrives: win.
  const unlocked = updateTasks(makeTaskState(), allFlagsDone());
  const finale = updateTasks(unlocked.taskState, {
    ...allFlagsDone(), goldenChipAtNest: true,
  });
  assert.equal(finale.taskState.won, true);
  assert.ok(finale.newlyCompleted.includes(FINAL_TASK.id));
});

test('unlock and win can happen in the same tick', () => {
  const { taskState, newlyCompleted } = updateTasks(makeTaskState(), {
    ...allFlagsDone(), goldenChipAtNest: true,
  });
  assert.equal(taskState.finalUnlocked, true);
  assert.equal(taskState.won, true);
  assert.ok(newlyCompleted.includes(FINAL_TASK.id));
});

test('updateTasks does not mutate its inputs', () => {
  const original = makeTaskState();
  const frozen = Object.freeze({ ...original, completed: Object.freeze([]) });
  updateTasks(frozen, Object.freeze({ ...makeFlags(), honked: true }));
  assert.deepEqual(original.completed, []);
});

test('every task id is unique', () => {
  const ids = [...TASKS.map((t) => t.id), FINAL_TASK.id];
  assert.equal(new Set(ids).size, ids.length);
});
