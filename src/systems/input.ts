// Action-mapped input: keyboard + gamepad behind one interface, with
// remappable keyboard bindings (persisted by the settings system).

import Phaser from 'phaser';

export type Action =
  | 'up' | 'down' | 'left' | 'right'
  | 'sprint' | 'squawk' | 'grab' | 'flap' | 'pause';

export type KeyBindings = Record<Action, string[]>; // KeyboardEvent.code list

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

  constructor(scene: Phaser.Scene, bindings: KeyBindings = DEFAULT_BINDINGS) {
    this.scene = scene;
    this.bindings = bindings;
    const kb = scene.input.keyboard;
    if (kb) {
      kb.on('keydown', (e: KeyboardEvent) => {
        if (!e.repeat) {
          this.down.add(e.code);
          this.pressed.add(e.code);
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
    const buttons = PAD_BUTTONS[action];
    if (!buttons) return false;
    return buttons.some((b) => this.padPressedNow.has(b) && !this.padPressedLast.has(b));
  }

  axis(): { x: number; y: number } {
    const x = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    const y = (this.isDown('down') ? 1 : 0) - (this.isDown('up') ? 1 : 0);
    return { x, y };
  }

  // Call at the END of each scene update.
  endFrame(): void {
    this.pressed.clear();
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
  }
}
