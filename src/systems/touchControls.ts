// On-screen virtual gamepad for touch devices. Drawn in the top UI scene
// (1280x720 design space, scrollFactor 0) and writes into InputSystem.touch.
// Multitouch: one finger drives the dynamic left thumbstick while others tap
// the right-hand action buttons; ownership is tracked by pointer.id.

import Phaser from 'phaser';
import { InputSystem, type Action } from './input';
import { stickVector, clampThumb } from './stickMath';

const JOY_RADIUS = 90;
const JOY_THUMB = 42;
const LEFT_ZONE_X = 580;  // joystick activates left of here...
const LEFT_ZONE_Y = 210;  // ...and below here (clear of the notepad)

interface TouchButton {
  action: Action;
  x: number;
  y: number;
  r: number;
  color: number;
  label: string;
  circle: Phaser.GameObjects.Arc;
  text: Phaser.GameObjects.Text;
  pointerId: number | null;
  hold: boolean; // squawk holds; the rest are taps
}

export class TouchControls {
  private scene: Phaser.Scene;
  private input: InputSystem;
  private container: Phaser.GameObjects.Container;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private joyPointerId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private buttons: TouchButton[] = [];
  private portraitHint: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, input: InputSystem) {
    this.scene = scene;
    this.input = input;

    // Default the mode on for coarse-pointer / touch-capable devices.
    const touchy =
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0) ||
      (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true);
    this.input.touch.active = !!touchy;

    this.base = scene.add
      .circle(0, 0, JOY_RADIUS, 0xfdf6e3, 0.1)
      .setStrokeStyle(3, 0xfdf6e3, 0.5)
      .setVisible(false);
    this.thumb = scene.add
      .circle(0, 0, JOY_THUMB, 0xfdf6e3, 0.32)
      .setStrokeStyle(2, 0xfdf6e3, 0.7)
      .setVisible(false);

    const objs: Phaser.GameObjects.GameObject[] = [this.base, this.thumb];

    this.buttons = [
      this.makeButton('squawk', 1130, 598, 60, 0xe0533d, 'SQUAWK', true),
      this.makeButton('grab', 1004, 556, 48, 0x3d8ad9, 'GRAB', false),
      this.makeButton('flap', 1158, 466, 46, 0x3fa05a, 'FLAP', false),
      this.makeButton('pause', 1242, 40, 28, 0x6a6a72, 'II', false),
    ];
    for (const b of this.buttons) objs.push(b.circle, b.text);

    this.portraitHint = scene.add
      .text(640, 360, '↻  Rotate to landscape for the best view', {
        fontFamily: 'Verdana, sans-serif', fontSize: '20px', color: '#fdf6e3',
        backgroundColor: 'rgba(20,30,20,0.8)', padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setVisible(false);
    objs.push(this.portraitHint);

    this.container = scene.add.container(0, 0, objs).setScrollFactor(0).setDepth(500);
    this.container.setVisible(this.input.touch.active);

    scene.input.addPointer(2); // allow 3 simultaneous touch points total
    scene.input.on('pointerdown', this.onPointerDown, this);
    scene.input.on('pointermove', this.onPointerMove, this);
    scene.input.on('pointerup', this.onPointerUp, this);
    scene.input.on('pointerupoutside', this.onPointerUp, this);
  }

  private makeButton(
    action: Action, x: number, y: number, r: number, color: number, label: string, hold: boolean,
  ): TouchButton {
    const circle = this.scene.add.circle(x, y, r, color, 0.4).setStrokeStyle(3, 0xfdf6e3, 0.55);
    const text = this.scene.add
      .text(x, y, label, {
        fontFamily: 'Verdana, sans-serif', fontSize: label.length > 2 ? '15px' : '22px',
        fontStyle: 'bold', color: '#fdf6e3',
      })
      .setOrigin(0.5);
    return { action, x, y, r, color, label, circle, text, pointerId: null, hold };
  }

  // Toggle visibility based on game state; redraw nothing else (events do the work).
  update(opts: { paused: boolean; won: boolean }): void {
    const show = this.input.touch.active && !opts.paused && !opts.won;
    if (this.container.visible !== show) {
      this.container.setVisible(show);
      if (!show) this.releaseAll();
    }
    if (show) {
      const portrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
      this.portraitHint.setVisible(portrait);
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (p.wasTouch) this.input.touch.active = true; // a finger re-engages touch mode
    if (!this.container.visible) return;

    const btn = this.buttonAt(p.x, p.y);
    if (btn) {
      btn.pointerId = p.id;
      this.input.touch.pressed.add(btn.action);
      if (btn.hold) this.input.touch.squawkDown = true;
      btn.circle.setFillStyle(btn.color, 0.85).setScale(0.92);
      return;
    }

    if (this.joyPointerId === null && p.x < LEFT_ZONE_X && p.y > LEFT_ZONE_Y) {
      this.joyPointerId = p.id;
      this.joyOrigin = { x: p.x, y: p.y };
      this.base.setPosition(p.x, p.y).setVisible(true);
      this.thumb.setPosition(p.x, p.y).setVisible(true);
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.joyPointerId) return;
    const dx = p.x - this.joyOrigin.x;
    const dy = p.y - this.joyOrigin.y;
    const v = stickVector(dx, dy, JOY_RADIUS);
    this.input.touch.axisX = v.x;
    this.input.touch.axisY = v.y;
    this.input.touch.sprint = v.sprint;
    const t = clampThumb(dx, dy, JOY_RADIUS);
    this.thumb.setPosition(this.joyOrigin.x + t.x, this.joyOrigin.y + t.y);
    this.base.setStrokeStyle(3, v.sprint ? 0xe0533d : 0xfdf6e3, v.sprint ? 0.85 : 0.5);
  }

  private onPointerUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.joyPointerId) this.releaseJoystick();
    const btn = this.buttons.find((b) => b.pointerId === p.id);
    if (btn) this.releaseButton(btn);
  }

  private releaseJoystick(): void {
    this.joyPointerId = null;
    this.input.touch.axisX = 0;
    this.input.touch.axisY = 0;
    this.input.touch.sprint = false;
    this.base.setVisible(false).setStrokeStyle(3, 0xfdf6e3, 0.5);
    this.thumb.setVisible(false);
  }

  private releaseButton(btn: TouchButton): void {
    btn.pointerId = null;
    if (btn.hold) this.input.touch.squawkDown = false;
    btn.circle.setFillStyle(btn.color, 0.4).setScale(1);
  }

  private releaseAll(): void {
    if (this.joyPointerId !== null) this.releaseJoystick();
    for (const b of this.buttons) if (b.pointerId !== null) this.releaseButton(b);
  }

  private buttonAt(x: number, y: number): TouchButton | null {
    for (const b of this.buttons) {
      if (b.pointerId !== null) continue; // already held by another finger
      if (Phaser.Math.Distance.Between(x, y, b.x, b.y) <= b.r + 6) return b;
    }
    return null;
  }
}
