// The rival. Perches on the market gum tree; swoops to steal whatever the
// ibis carries, then stashes it at the base of its tree. A long squawk
// sends it packing mid-swoop.

import Phaser from 'phaser';
import { MAGPIE } from '../world/layoutData';
import type { ItemManager } from '../items/itemManager';
import { MAGPIE_TALON_OFFSET } from '../world/spriteMeta';

const SWOOP_RANGE = 380;
const SWOOP_SPEED = 420;
const RETURN_SPEED = 300;
const COOLDOWN = 22;
const STASH = { x: MAGPIE.perch.x + 50, y: MAGPIE.perch.y + 140 };

type MagpieState = 'perch' | 'swoop' | 'return' | 'flee';

export interface MagpieContext {
  playerX: number;
  playerY: number;
  playerCarriedId: string | null;
  items: ItemManager;
  dt: number;
  scaredOff: boolean; // long squawk near it this frame
}

export class Magpie {
  readonly sprite: Phaser.GameObjects.Sprite;
  state: MagpieState = 'perch';
  carriedId: string | null = null;
  cooldown = 0;
  fleeTimer = 0;
  robbedEvent = false;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add
      .sprite(MAGPIE.perch.x, MAGPIE.perch.y, 'atlas', 'magpie/perch/0')
      .setOrigin(0.5, 1)
      .setDepth(MAGPIE.perch.y + 200); // above the tree canopy
    this.sprite.play('magpie/perch');
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  update(ctx: MagpieContext): void {
    this.cooldown = Math.max(0, this.cooldown - ctx.dt);

    if (ctx.scaredOff && (this.state === 'swoop' || this.state === 'perch')) {
      this.state = 'flee';
      this.fleeTimer = 8;
      this.cooldown = COOLDOWN;
    }

    switch (this.state) {
      case 'perch': {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, ctx.playerX, ctx.playerY);
        if (ctx.playerCarriedId && dist < SWOOP_RANGE && this.cooldown <= 0) {
          this.state = 'swoop';
          this.play('fly');
        }
        break;
      }

      case 'swoop': {
        if (!ctx.playerCarriedId) {
          this.state = 'return';
          break;
        }
        const arrived = this.flyToward(ctx.playerX, ctx.playerY - 30, SWOOP_SPEED, ctx.dt);
        if (arrived) {
          const item = ctx.items.byId(ctx.playerCarriedId);
          if (item && item.holder === 'player') {
            ctx.items.npcGrab(item, 'magpie');
            this.carriedId = item.id;
            this.robbedEvent = true;
          }
          this.state = 'return';
          this.cooldown = COOLDOWN;
        }
        break;
      }

      case 'return': {
        const arrived = this.flyToward(MAGPIE.perch.x, MAGPIE.perch.y, RETURN_SPEED, ctx.dt);
        if (this.carriedId) {
          const item = ctx.items.byId(this.carriedId);
          if (item) {
            item.x = this.x + MAGPIE_TALON_OFFSET.x;
            item.y = this.y - MAGPIE_TALON_OFFSET.y;
            ctx.items.spriteOf(item.id)?.setPosition(item.x, item.y).setDepth(this.sprite.depth - 1);
          }
        }
        if (arrived) {
          if (this.carriedId) {
            const item = ctx.items.byId(this.carriedId);
            if (item) {
              item.holder = null;
              item.x = STASH.x;
              item.y = STASH.y;
              ctx.items.spriteOf(item.id)?.setPosition(item.x, item.y).setDepth(item.y);
            }
            this.carriedId = null;
          }
          this.state = 'perch';
          this.play('perch');
        }
        break;
      }

      case 'flee': {
        this.fleeTimer -= ctx.dt;
        this.flyToward(MAGPIE.perch.x + 600, MAGPIE.perch.y - 400, RETURN_SPEED, ctx.dt);
        this.sprite.setAlpha(Math.max(0, this.fleeTimer / 3));
        if (this.fleeTimer <= 0) {
          this.sprite.setPosition(MAGPIE.perch.x, MAGPIE.perch.y).setAlpha(1);
          this.state = 'perch';
          this.play('perch');
        }
        break;
      }
    }

    this.sprite.setFlipX(this.state === 'swoop' ? this.x < MAGPIE.perch.x : false);
  }

  private play(anim: string): void {
    const key = `magpie/${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }

  private flyToward(tx: number, ty: number, speed: number, dt: number): boolean {
    const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty);
    if (d < 14) return true;
    this.sprite.x += ((tx - this.x) / d) * speed * dt;
    this.sprite.y += ((ty - this.y) / d) * speed * dt;
    this.sprite.setDepth(this.y + 300); // always airborne-ish
    return false;
  }
}
