// Dog runtime: faster than the ibis, swims the shallows, never the deep.

import Phaser from 'phaser';
import type { DogDef } from '../world/layoutData';
import { thinkDog, makeDogMind, DEEP_WATER_Y, type DogMind } from './brain/dogBrain';
import { inWater } from '../world/waterRules';

const DOG_RUN = 360;
const DOG_WANDER = 90;
const WANDER_RADIUS = 220;

export interface DogContext {
  playerX: number;
  playerY: number;
  playerHidden: boolean;
  dt: number;
  forceDropFromPlayer: (x: number, y: number) => string | null;
}

export class Dog {
  readonly def: DogDef;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  mind: DogMind;
  facing: -1 | 1 = -1;
  private wanderTarget: { x: number; y: number };
  private wanderWait = 0;
  private bark: Phaser.GameObjects.Text;
  private barkTimer = 0;
  escapedEvent = false;

  constructor(scene: Phaser.Scene, def: DogDef) {
    this.def = def;
    this.sprite = scene.physics.add.sprite(def.x, def.y, 'atlas', `${def.coat}/idle/0`);
    this.sprite.setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12, this.sprite.width / 2 - 12, this.sprite.height - 24);
    this.mind = makeDogMind(!!def.leashedTo);
    this.wanderTarget = { x: def.x, y: def.y };
    this.bark = scene.add
      .text(def.x, def.y - 56, '', {
        fontFamily: 'Verdana, sans-serif', fontSize: '14px', fontStyle: 'bold',
        color: '#7a4022', backgroundColor: 'rgba(253,246,227,0.95)', padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(1e9)
      .setVisible(false);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get leashed(): boolean { return this.mind.state === 'leashed'; }

  unleash(): void {
    if (this.mind.state === 'leashed') {
      this.mind = { state: 'chase', timer: 0 }; // freedom! and immediately: BIRD!
      this.sayBark('WOOF!!');
    }
  }

  private sayBark(text: string): void {
    this.bark.setText(text).setVisible(true);
    this.barkTimer = 1.0;
  }

  update(ctx: DogContext): void {
    if (this.mind.timer > 0) this.mind.timer -= ctx.dt;
    if (this.barkTimer > 0) {
      this.barkTimer -= ctx.dt;
      if (this.barkTimer <= 0) this.bark.setVisible(false);
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, ctx.playerX, ctx.playerY);
    const prev = this.mind.state;
    const decision = thinkDog(this.mind, {
      distToPlayer: dist,
      playerHidden: ctx.playerHidden,
      playerDeepWater: ctx.playerY >= DEEP_WATER_Y,
      atTarget: false,
    });
    this.mind = decision.mind;
    if (decision.escapedIntoDeep) this.escapedEvent = true;

    if (this.mind.state === 'chase' && prev !== 'chase') this.sayBark('WOOF!');
    if (this.mind.state === 'celebrate' && prev === 'chase' && !decision.escapedIntoDeep) {
      // Caught the ibis: it drops everything.
      ctx.forceDropFromPlayer(this.x, this.y);
      this.sayBark('woof woof!!');
    }

    this.move(ctx, dist);
    this.updateVisual(ctx);
  }

  private move(ctx: DogContext, distToPlayer: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    if (this.mind.state === 'leashed' || this.mind.state === 'celebrate') {
      body.setVelocity(0, 0);
      return;
    }

    let target: { x: number; y: number };
    let speed: number;
    if (this.mind.state === 'chase') {
      target = { x: ctx.playerX, y: ctx.playerY };
      speed = DOG_RUN;
      if (distToPlayer < 26) {
        body.setVelocity(0, 0);
        return;
      }
    } else {
      this.wanderWait -= ctx.dt;
      if (this.wanderWait <= 0 || Phaser.Math.Distance.Between(this.x, this.y, this.wanderTarget.x, this.wanderTarget.y) < 20) {
        this.wanderWait = 2 + ((this.x * 7919 + this.y * 104729) % 100) / 40; // deterministic-ish
        const angle = ((this.x + this.y + this.wanderWait * 1000) % 628) / 100;
        this.wanderTarget = {
          x: this.def.x + Math.cos(angle) * WANDER_RADIUS,
          y: this.def.y + Math.sin(angle) * WANDER_RADIUS * 0.6,
        };
      }
      target = this.wanderTarget;
      speed = DOG_WANDER;
      if (Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) < 20) {
        body.setVelocity(0, 0);
        return;
      }
    }

    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y) || 1;
    const dirX = (target.x - this.x) / d;
    const dirY = (target.y - this.y) / d;

    // Deep water is the hard line.
    const nextY = this.y + dirY * speed * ctx.dt;
    if (nextY >= DEEP_WATER_Y) {
      body.setVelocity(dirX * speed, 0);
    } else {
      body.setVelocity(dirX * speed, dirY * speed);
    }
    if (Math.abs(dirX) > 0.1) this.facing = dirX > 0 ? 1 : -1;
  }

  private updateVisual(ctx: DogContext): void {
    this.sprite.setFlipX(this.facing === 1);
    this.sprite.setDepth(this.y);
    this.bark.setPosition(this.x, this.y - 56);

    const swimming = inWater(this.x, this.y);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const moving = Math.hypot(body.velocity.x, body.velocity.y) > 5;
    const anim = swimming ? 'swim' : moving ? 'run' : 'idle';
    const key = `${this.def.coat}/${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
    void ctx;
  }
}
