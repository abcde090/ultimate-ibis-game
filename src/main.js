import './engine/polyfills.js';
import { WORLD, POND, NEST, RECTS, TREES } from './world/level.js';
import { createInput } from './engine/input.js';
import { createAudio } from './engine/audio.js';
import { createCamera } from './engine/camera.js';
import { dist, pushOutOfAll } from './engine/collision.js';
import { updateIbis, beakTip } from './entities/ibis.js';
import { updateNpc } from './entities/npc.js';
import { findGrabbable, grab, drop, makeTrash } from './entities/items.js';
import { createGameState, findItem, heldItem } from './game/state.js';
import { updateTasks, FINAL_TASK } from './game/tasks.js';
import { render } from './world/render.js';
import { createHud, showBootError } from './ui/hud.js';

const VIEW_W = 960;
const VIEW_H = 600;
const HONK_RADIUS = 260;
const BIN_PECK_REACH = 44;

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas ? canvas.getContext('2d') : null;
  if (!ctx) {
    showBootError('Your browser could not create a canvas. The ibis is devastated.');
    return;
  }

  const input = createInput(window);
  const audio = createAudio();
  const cam = createCamera(VIEW_W, VIEW_H, WORLD.w, WORLD.h);
  const hud = createHud();
  let state = createGameState();
  let running = false;
  let lastTime = null;

  cam.snap(state.player.x, state.player.y);

  document.getElementById('start-btn').addEventListener('click', () => {
    audio.resume();
    audio.honk();
    input.reset();
    document.getElementById('title-screen').classList.add('hidden');
    running = true;
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    state = createGameState();
    input.reset();
    cam.snap(state.player.x, state.player.y);
    document.getElementById('win-screen').classList.add('hidden');
  });

  function frame(now) {
    const dt = lastTime === null ? 1 / 60 : Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (running) update(dt);
    render(ctx, state, cam, VIEW_W, VIEW_H);
    input.endFrame();
    requestAnimationFrame(frame);
  }

  function update(dt) {
    state.time += dt;
    const player = state.player;

    updateIbis(player, input, state.bins, dt);

    if (input.honkPressed()) handleHonk();
    if (input.grabPressed()) handleGrabKey();

    // A held item rides at the beak tip.
    const held = heldItem(state, 'player');
    if (held) {
      const beak = beakTip(player);
      held.x = beak.x;
      held.y = beak.y;
    }

    const events = [];
    for (const npc of state.npcs) {
      updateNpc(npc, state, dt, events);
      npc.startleEvent = false;
    }
    for (const ev of events) {
      if (ev.type === 'forced-drop') {
        // The ibis protests being robbed.
        player.honkTimer = 0.4;
        audio.honk();
      }
    }

    syncFlags();
    advanceTasks();
    cam.follow(player.x, player.y, dt);
    hud.sync(state.taskState);
  }

  function handleHonk() {
    const player = state.player;
    player.honkTimer = 0.5;
    audio.honk();
    state.flags.honked = true;
    for (const npc of state.npcs) {
      if (dist(player.x, player.y, npc.x, npc.y) <= HONK_RADIUS) {
        npc.startleEvent = true;
        if (!state.flags.honkedAt.includes(npc.def.id)) {
          state.flags.honkedAt.push(npc.def.id);
        }
      }
    }
  }

  function handleGrabKey() {
    const player = state.player;
    const beak = beakTip(player);
    const held = heldItem(state, 'player');

    if (held) {
      // Land it clear of solid props so humans can always fetch it back.
      const spot = pushOutOfAll(beak.x, beak.y, 10, RECTS, TREES);
      const splashed = drop(held, spot.x, spot.y, POND);
      player.heldItemId = null;
      if (splashed) audio.splash();
      return;
    }

    const item = findGrabbable(beak.x, beak.y, state.items);
    if (item) {
      grab(item, 'player');
      player.heldItemId = item.id;
      if (item.kind === 'chip') state.flags.chipStolen = true;
      if (item.kind === 'sausage') state.flags.sausageStolen = true;
      if (item.kind === 'trash') state.flags.trashGrabbed = true;
      return;
    }

    // No item in reach — peck a bin over instead?
    const bin = state.bins.find(
      (b) => b.upright && dist(beak.x, beak.y, b.x, b.y - 18) <= BIN_PECK_REACH,
    );
    if (bin) {
      bin.upright = false;
      bin.spilled = true;
      audio.clang();
      state.flags.binKnocked = true;
      // Knocking bins is always fun, but cap the litter so a marathon
      // session can't flood the park with trash entities.
      const trashCount = state.items.filter((it) => it.kind === 'trash').length;
      if (trashCount < 12) {
        state.items.push(
          makeTrash(bin.x - 26, bin.y + 14),
          makeTrash(bin.x + 20, bin.y + 22),
        );
      }
    }
  }

  function syncFlags() {
    const flags = state.flags;
    const phone = findItem(state, 'phone');
    if (phone && phone.inPond) flags.phoneInPond = true;

    const golden = findItem(state, 'golden-chip');
    if (
      golden &&
      golden.holder !== 'cafecustomer' &&
      dist(golden.x, golden.y, NEST.x, NEST.y) <= NEST.r
    ) {
      flags.goldenChipAtNest = true;
    }
  }

  function advanceTasks() {
    const before = state.taskState.finalUnlocked;
    const { taskState, newlyCompleted } = updateTasks(state.taskState, state.flags);
    state.taskState = taskState;

    if (newlyCompleted.includes(FINAL_TASK.id)) {
      audio.fanfare();
    } else if (newlyCompleted.length > 0 || (!before && taskState.finalUnlocked)) {
      audio.ding();
    }
  }

  // Debug/E2E hook: read-only access to live state from the console.
  window.__game = {
    get state() { return state; },
    get running() { return running; },
  };

  hud.sync(state.taskState);
  requestAnimationFrame(frame);
}

boot();
