// Keyboard state tracker. `pressed` keys fire once per keydown.

const HONK_KEYS = ['Space'];
const GRAB_KEYS = ['KeyE'];

export function createInput(target = window) {
  const down = new Set();
  const pressedThisFrame = new Set();

  function onKeyDown(e) {
    if (e.repeat) return;
    down.add(e.code);
    pressedThisFrame.add(e.code);
    // Stop the page scrolling on space/arrows while playing.
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    down.delete(e.code);
  }

  function onBlur() {
    down.clear();
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);

  return {
    // Movement axis in [-1, 1] each, not normalised.
    axis() {
      const x = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) -
                (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
      const y = (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0) -
                (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0);
      return { x, y };
    },
    sprinting() {
      return down.has('ShiftLeft') || down.has('ShiftRight');
    },
    honkPressed() {
      return HONK_KEYS.some((k) => pressedThisFrame.has(k));
    },
    grabPressed() {
      return GRAB_KEYS.some((k) => pressedThisFrame.has(k));
    },
    // Call once at the end of each frame.
    endFrame() {
      pressedThisFrame.clear();
    },
    // Forget everything held/pressed — used on game start and restart so
    // stale keys can't leak into a fresh game.
    reset() {
      down.clear();
      pressedThisFrame.clear();
    },
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
