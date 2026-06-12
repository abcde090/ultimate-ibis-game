// Pure task definitions and progress logic. Flags are set by the game
// runtime as mischief occurs; checks only read them.

export const NPC_IDS = ['picnicker', 'bbqdad', 'groundskeeper', 'cafecustomer'];

export const TASKS = [
  { id: 'honk', text: 'Squawk', check: (f) => !!f.honked },
  { id: 'chip', text: 'Steal a hot chip from the picnic', check: (f) => !!f.chipStolen },
  { id: 'bin', text: 'Knock over a bin', check: (f) => !!f.binKnocked },
  { id: 'trash', text: 'Go full bin chicken: pull out some trash', check: (f) => !!f.trashGrabbed },
  { id: 'snag', text: 'Steal the snag off the barbie', check: (f) => !!f.sausageStolen },
  { id: 'phone', text: 'Drop the phone in the pond', check: (f) => !!f.phoneInPond },
  { id: 'chased', text: 'Get the groundskeeper to chase you', check: (f) => !!f.groundskeeperChased },
  {
    id: 'honkall', text: 'Squawk at every human',
    check: (f) => NPC_IDS.every((id) => f.honkedAt && f.honkedAt.includes(id)),
  },
];

export const FINAL_TASK = {
  id: 'goldenchip',
  text: 'Steal the GOLDEN CHIP and take it to your nest',
  check: (f) => !!f.goldenChipAtNest,
};

export function makeTaskState() {
  return { completed: [], finalUnlocked: false, won: false };
}

// Returns { taskState, newlyCompleted } — taskState is a fresh object.
export function updateTasks(taskState, flags) {
  const completed = [...taskState.completed];
  const newlyCompleted = [];

  for (const task of TASKS) {
    if (!completed.includes(task.id) && task.check(flags)) {
      completed.push(task.id);
      newlyCompleted.push(task.id);
    }
  }

  let finalUnlocked = taskState.finalUnlocked;
  if (!finalUnlocked && TASKS.every((t) => completed.includes(t.id))) {
    finalUnlocked = true;
  }

  let won = taskState.won;
  if (finalUnlocked && !completed.includes(FINAL_TASK.id) && FINAL_TASK.check(flags)) {
    completed.push(FINAL_TASK.id);
    newlyCompleted.push(FINAL_TASK.id);
    won = true;
  }

  return {
    taskState: { completed, finalUnlocked, won },
    newlyCompleted,
  };
}

export function makeFlags() {
  return {
    honked: false,
    chipStolen: false,
    binKnocked: false,
    trashGrabbed: false,
    sausageStolen: false,
    phoneInPond: false,
    groundskeeperChased: false,
    honkedAt: [],
    goldenChipAtNest: false,
  };
}
