import { TASKS, FINAL_TASK } from '../game/tasks.js';

// DOM-based HUD: the to-do notepad and the win screen.
export function createHud() {
  const listEl = document.getElementById('task-list');
  const winEl = document.getElementById('win-screen');
  if (!listEl || !winEl) {
    throw new Error('HUD elements (#task-list, #win-screen) missing from index.html');
  }
  let rendered = { completedCount: -1, finalUnlocked: false, won: false };

  function sync(taskState) {
    const changed =
      taskState.completed.length !== rendered.completedCount ||
      taskState.finalUnlocked !== rendered.finalUnlocked ||
      taskState.won !== rendered.won;
    if (!changed) return;

    const prevCompleted = rendered.completedCount;
    rendered = {
      completedCount: taskState.completed.length,
      finalUnlocked: taskState.finalUnlocked,
      won: taskState.won,
    };

    listEl.innerHTML = '';
    const visible = taskState.finalUnlocked ? [...TASKS, FINAL_TASK] : TASKS;
    for (const task of visible) {
      const li = document.createElement('li');
      li.textContent = task.text;
      if (taskState.completed.includes(task.id)) {
        li.classList.add('done');
        if (prevCompleted >= 0) li.classList.add('fresh');
      }
      if (task.id === FINAL_TASK.id) li.classList.add('final');
      listEl.appendChild(li);
    }

    if (taskState.won) winEl.classList.remove('hidden');
  }

  return { sync };
}

export function showBootError(message) {
  const el = document.getElementById('boot-error');
  const msg = document.getElementById('boot-error-msg');
  if (el && msg) {
    msg.textContent = message;
    el.classList.remove('hidden');
  } else {
    // Last resort if the DOM is in an unexpected state.
    alert(message);
  }
}
