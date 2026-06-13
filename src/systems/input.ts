// Action-mapped input: keyboard + gamepad behind one interface, with
// remappable keyboard bindings (persisted by the settings system).

import Phaser from 'phaser';

export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'sprint' | 'squawk' | 'grab' | 'flap' | 'pause';

export type KeyBindings = Record<Action, string[]>; // KeyboardEvent.code list

// Touch source state, written by the on-screen controls each frame. `active`
// doubles as "touch mode is engaged" — the controls show themselves and the
// merges below take effect only while it is true.
export interface TouchState {
  active: boolean;
  axisX: number;       // -1..1 from the virtual stick
  axisY: number;
  sprint: boolean;     // stick pushed to the rim
  squawkDown: boolean; // squawk button held (drives long-squawk)
  pressed: Set<Action>; // one-shot taps this frame (squawk/grab/flap/pause)
}

function makeTouchState(): TouchState {
  return { active: false, axisX: 0, axisY: 0, sprint: false, squawkDown: false, pressed: new Set() };
}

const clamp1 = (v: number): number => Math.min(1, Math.max(-1, v));

export const DEFAULT_BINDINGS: KeyBindings = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  squawk: ['Space'],
  grab: ['KeyE'],
  flap: ['KeyF'],
  pause: ['Escape', 'KeyP'],
};

const PAD_BUTTONS: Partial<Record<Action, number[]>> = {
  squawk: [0],          // A / Cross
  grab: [1, 2],         // B / Circle, X / Square
  flap: [3],            // Y / Triangle
  sprint: [5, 7],       // RB / RT
  pause: [9],           // Start
};

export class InputSystem {
  private scene: Phaser.Scene;
  private bindings: KeyBindings;
  private down = new Set<string>();
  private pressed = new Set<string>();
  private padPressedLast = new Set<number>();
  private padPressedNow = new Set<number>();
  // Written by TouchControls; merged into every read below.
  readonly touch: TouchState = makeTouchState();

  constructor(scene: Phaser.Scene, bindings: KeyBindings = DEFAULT_BINDINGS) {
    this.scene = scene;
    this.bindings = bindings;
    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown', (e: KeyboardEvent) => {
        if (!e.repeat) {
          this.down.add(e.code);
          this.pressed.add(e.code);
          this.touch.active = false; // a physical key hides the touch controls
        }
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
      });
      kb.on('keyup', (e: KeyboardEvent) => this.down.delete(e.code));
    }
    const onBlur = (): void => this.reset();
    scene.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    // Scene restarts build a fresh InputSystem; detach from the global
    // emitter so handlers don't accumulate across playthroughs.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.game.events.off(Phaser.Core.Events.BLUR, onBlur);
    });
  }

  setBindings(bindings: KeyBindings): void {
    this.bindings = bindings;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    return gp && gp.total > 0 ? gp.getPad(0) : null;
  }

  isDown(action: Action): boolean {
    if ((this.bindings[action] ?? []).some((c) => this.down.has(c))) return true;
    if (this.touch.active) {
      if (action === 'sprint' && this.touch.sprint) return true;
      if (action === 'squawk' && this.touch.squawkDown) return true;
    }
    const pad = this.pad();
    if (!pad) return false;
    const buttons = PAD_BUTTONS[action];
    if (buttons?.some((b) => pad.buttons[b]?.pressed)) return true;
    // Stick / d-pad for movement
    const dead = 0.3;
    if (action === 'left') return pad.leftStick.x < -dead || pad.left;
    if (action === 'right') return pad.leftStick.x > dead || pad.right;
    if (action === 'up') return pad.leftStick.y < -dead || pad.up;
    if (action === 'down') return pad.leftStick.y > dead || pad.down;
    return false;
  }

  justPressed(action: Action): boolean {
    if ((this.bindings[action] ?? []).some((c) => this.pressed.has(c))) return true;
    if (this.touch.active && this.touch.pressed.has(action)) return true;
    const buttons = PAD_BUTTONS[action];
    if (!buttons) return false;
    return buttons.some((b) => this.padPressedNow.has(b) && !this.padPressedLast.has(b));
  }

  axis(): { x: number; y: number } {
    let x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    let y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
    if (this.touch.active) {
      x += this.touch.axisX;
      y += this.touch.axisY;
    }
    return { x: clamp1(x), y: clamp1(y) };
  }

  // Call at the END of each scene update.
  endFrame(): void {
    this.pressed.clear();
    this.touch.pressed.clear();
    this.padPressedLast = this.padPressedNow;
    this.padPressedNow = new Set();
    const pad = this.pad();
    if (pad) {
      pad.buttons.forEach((b, i) => {
        if (b.pressed) this.padPressedNow.add(i);
      });
    }
  }

  reset(): void {
    this.down.clear();
    this.pressed.clear();
    this.touch.axisX = 0;
    this.touch.axisY = 0;
    this.touch.sprint = false;
    this.touch.squawkDown = false;
    this.touch.pressed.clear();
  }
}
