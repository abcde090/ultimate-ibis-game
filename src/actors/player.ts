// The ibis: a physics body (feet circle) + visual sprite with hop offset.

import Phaser from 'phaser';
import { InputSystem } from '../systems/input';
import { inWater } from '../world/waterRules';
import { IBIS_BEAK_OFFSET } from '../world/spriteMeta';
import { PLAYER, stepMovement, pickAnim, canFlap, maxSpeed } from './playerRules';

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  facing: -1 | 1 = -1;
  airborneLeft = 0;
  flapCooldown = 0;
  squawkLeft = 0;
  hiddenTime = 0;
  hidden = false;
  swimming = false;
  draggingId: string | null = null;
  carriedId: string | null = null;
  inBush = false; // set each frame by the world's bush overlap

  private hopTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'atlas', 'ibis/idle/0');
    this.sprite.setOrigin(0.5, 1);
    const body = this.body();
    body.setCircle(PLAYER.bodyRadius, this.sprite.width / 2 - PLAYER.bodyRadius, this.sprite.height - PLAYER.bodyRadius * 2);
    body.setCollideWorldBounds(true);
    this.sprite.setDepth(y);
  }

  body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  beakTip(): { x: number; y: number } {
    // Art faces left, so offset.x is negative; mirror it when facing right.
    return {
      x: this.x + (this.facing === -1 ? IBIS_BEAK_OFFSET.x : -IBIS_BEAK_OFFSET.x),
      y: this.y + IBIS_BEAK_OFFSET.y,
    };
  }

  get airborne(): boolean {
    return this.airborneLeft > 0;
  }

  update(input: InputSystem, dt: number): void {
    this.airborneLeft = Math.max(0, this.airborneLeft - dt);
    this.flapCooldown = Math.max(0, this.flapCooldown - dt);
    this.squawkLeft = Math.max(0, this.squawkLeft - dt);

    this.swimming = !this.airborne && inWater(this.x, this.y);

    const axis = input.axis();
    // On touch, the joystick is analog: how far it's pushed sets the speed.
    // Keyboard/gamepad stay digital (null throttle → walk / Shift-sprint).
    const analogThrottle = input.touch.active
      ? Math.min(1, Math.hypot(axis.x, axis.y))
      : null;
    const body = this.body();
    const next = stepMovement(
      { vx: body.velocity.x, vy: body.velocity.y, facing: this.facing },
      {
        axisX: axis.x,
        axisY: axis.y,
        sprint: input.isDown('sprint'),
        analogThrottle,
        swimming: this.swimming,
        dragging: this.draggingId !== null,
        airborne: this.airborne,
        dt,
      },
    );
    body.setVelocity(next.vx, next.vy);
    this.facing = next.facing;

    // Hide in bushes: stationary + inside bush + on the ground.
    const still = Math.hypot(next.vx, next.vy) < 8;
    if (this.inBush && still && !this.airborne) {
      this.hiddenTime += dt;
    } else {
      this.hiddenTime = 0;
    }
    this.hidden = this.hiddenTime >= PLAYER.hideSettleSeconds;

    this.updateVisual(axis);
    this.inBush = false; // re-set by overlap before next update
  }

  tryFlap(): boolean {
    if (!canFlap({ airborne: this.airborne, dragging: this.draggingId !== null, cooldown: this.flapCooldown })) {
      return false;
    }
    this.airborneLeft = PLAYER.flapSeconds;
    this.flapCooldown = PLAYER.flapSeconds + PLAYER.flapCooldown;
    // Hop boost in the current travel (or facing) direction.
    const body = this.body();
    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 40) {
      body.setVelocity(this.facing * maxSpeed({ sprint: false, analogThrottle: null, swimming: false, dragging: false, airborne: true }) * 0.7, body.velocity.y);
    }
    this.hopTween?.stop();
    this.hopTween = this.sprite.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: PLAYER.flapSeconds * 1000,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        this.sprite.setDisplayOrigin(this.sprite.width / 2, this.sprite.height + Math.sin(t * Math.PI) * 26);
      },
      onComplete: () => this.sprite.setOrigin(0.5, 1),
    });
    return true;
  }

  squawk(): void {
    this.squawkLeft = 0.5;
  }

  private updateVisual(axis: { x: number; y: number }): void {
    this.sprite.setFlipX(this.facing === 1);
    this.sprite.setDepth(this.y);
    this.sprite.setAlpha(this.hidden ? 0.35 : 1);

    const anim = pickAnim({
      airborne: this.airborne,
      swimming: this.swimming,
      squawking: this.squawkLeft > 0,
      moving: axis.x !== 0 || axis.y !== 0,
    });
    const key = `ibis/${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
