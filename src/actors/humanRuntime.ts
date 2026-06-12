// Wires the pure human brain to Phaser: perception building, movement
// (with pond avoidance), intent execution, schedules, slips, and bubbles.

import Phaser from 'phaser';
import type { NpcDef } from '../world/layoutData';
import { inPond, inWater, slideAroundPond } from '../world/waterRules';
import {
  Mind, Perception, think, makeMind, SLIP_SECONDS,
} from './brain/humanBrain';
import { isAstray, itemsOwnedBy, SLIPPERY_KINDS } from '../items/itemRules';
import type { ItemManager, BinState } from '../items/itemManager';

const CHASE_SPEED = 245;
const SHOO_SPEED = 220;
const WALK_SPEED = 120;
const AT_TARGET = 28;
// Humans reach over tables/counters to pick up or put down items, so
// fetch/carry complete from further away than plain walking-to-a-point.
const ITEM_REACH = 112;
const SLIP_MIN_SPEED = 150;
const SCHEDULE_CYCLE = 60; // seconds

export interface HumanContext {
  playerX: number;
  playerY: number;
  playerHidden: boolean;
  playerInWater: boolean;
  playerHeldItemOwner: string | null | 'none'; // owner of held item, 'none' if empty beak
  playerHoldsAnything: boolean;
  items: ItemManager;
  bins: Map<string, BinState>;
  fixableBinIds: string[];     // bins this npc cares about
  time: number;
  dt: number;
  forceDropFromPlayer: (npcX: number, npcY: number) => string | null; // returns dropped item id
}

export class HumanNpc {
  readonly def: NpcDef;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  mind: Mind;
  heldItemId: string | null = null;
  facing: -1 | 1 = 1;
  startleEvent = false;
  patrolIndex = 0;
  slideSign: number | null = null;
  totalChaseSeconds = 0;
  private bubble: Phaser.GameObjects.Text;
  private bubbleTimer = 0;

  constructor(scene: Phaser.Scene, def: NpcDef) {
    this.def = def;
    this.sprite = scene.physics.add.sprite(def.x, def.y, 'atlas', `${def.archetype}/idle/0`);
    this.sprite.setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setCircle(13, this.sprite.width / 2 - 13, this.sprite.height - 26);
    this.mind = makeMind({
      noticeRadius: def.noticeRadius,
      personalSpace: def.personalSpace,
      playful: def.archetype.includes('kid'),
      hasSchedule: !!def.schedule,
    });
    this.bubble = scene.add
      .text(def.x, def.y - 104, '', {
        fontFamily: 'Verdana, sans-serif', fontSize: '16px', fontStyle: 'bold',
        color: '#e0533d', backgroundColor: 'rgba(253,246,227,0.95)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(1e9)
      .setVisible(false);
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  private body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  say(text: string, color = '#e0533d', seconds = 1.1): void {
    this.bubble.setText(text).setColor(color).setVisible(true);
    this.bubbleTimer = seconds;
  }

  // The pratfall: interrupts everything, drops whatever they carry.
  triggerSlip(): void {
    this.mind = { ...this.mind, state: 'slip', timer: SLIP_SECONDS };
    if (this.heldItemId) this.heldItemId = null; // item keeps lying where it is
    this.say('WAH!', '#e0533d');
  }

  update(ctx: HumanContext): string[] {
    const events: string[] = [];
    const mind = this.mind;
    if (mind.timer > 0) mind.timer -= ctx.dt;
    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= ctx.dt;
      if (this.bubbleTimer <= 0) this.bubble.setVisible(false);
    }

    const p = this.buildPerception(ctx);
    const prevState = mind.state;
    this.mind = think(mind, p);

    if (this.mind.state === 'chase') {
      this.mind.chaseSeconds += ctx.dt;
      this.totalChaseSeconds += ctx.dt;
    }

    this.reactToTransition(prevState, events);
    this.executeIntents(ctx, events);
    this.move(ctx);
    this.updateVisual();
    this.startleEvent = false;
    return events;
  }

  private buildPerception(ctx: HumanContext): Perception {
    const playerHasMyItem = this.mind.playful
      ? ctx.playerHoldsAnything
      : ctx.playerHeldItemOwner === this.def.id;

    const owned = itemsOwnedBy(ctx.items.items, this.def.id);
    const astray = owned.find((it) => isAstray(it)) ?? null;

    const targetItem = this.mind.targetItemId ? ctx.items.byId(this.mind.targetItemId) : null;
    const targetBin = this.mind.targetBinId ? ctx.bins.get(this.mind.targetBinId) ?? null : null;

    let knockedBinId: string | null = null;
    for (const id of ctx.fixableBinIds) {
      const bin = ctx.bins.get(id);
      if (bin && !bin.upright) {
        knockedBinId = id;
        break;
      }
    }

    return {
      distToPlayer: Phaser.Math.Distance.Between(this.x, this.y, ctx.playerX, ctx.playerY),
      playerHasMyItem,
      playerHidden: ctx.playerHidden,
      playerInWater: ctx.playerInWater,
      astrayItemId: astray?.id ?? null,
      fetchTargetValid: !!targetItem && targetItem.holder === null && !targetItem.inWater,
      knockedBinId,
      binStillKnocked: !!targetBin && !targetBin.upright,
      atTarget: this.distToCurrentTarget(ctx) < this.targetReach(),
      startled: this.startleEvent,
      atSchedulePoint: this.distToSchedulePoint(ctx) < AT_TARGET,
    };
  }

  private schedulePoint(ctx: HumanContext): { x: number; y: number } {
    const sched = this.def.schedule;
    if (!sched || sched.length === 0) return this.def;
    const t = ctx.time % SCHEDULE_CYCLE;
    let current = sched[sched.length - 1]!;
    for (const slot of sched) {
      if (t >= slot.t) current = slot;
    }
    return current;
  }

  private distToSchedulePoint(ctx: HumanContext): number {
    const pt = this.schedulePoint(ctx);
    return Phaser.Math.Distance.Between(this.x, this.y, pt.x, pt.y);
  }

  private currentTarget(ctx: HumanContext): { x: number; y: number } | null {
    switch (this.mind.state) {
      case 'chase':
      case 'shoo':
        return { x: ctx.playerX, y: ctx.playerY };
      case 'fetch': {
        const item = this.mind.targetItemId ? ctx.items.byId(this.mind.targetItemId) : null;
        return item ? { x: item.x, y: item.y } : this.def;
      }
      case 'carry': {
        const item = this.heldItemId ? ctx.items.byId(this.heldItemId) : null;
        return item ? item.home : this.def;
      }
      case 'gotobin': {
        const bin = this.mind.targetBinId ? ctx.bins.get(this.mind.targetBinId) : null;
        return bin ? { x: bin.x, y: bin.y + 26 } : this.def;
      }
      case 'gohome':
        return { x: this.def.x, y: this.def.y };
      case 'schedule':
        return this.schedulePoint(ctx);
      case 'idle':
      case 'patrol': {
        if (this.def.patrol) return this.def.patrol[this.patrolIndex] ?? this.def;
        if (this.def.schedule) return this.schedulePoint(ctx);
        return null;
      }
      default:
        return null;
    }
  }

  private distToCurrentTarget(ctx: HumanContext): number {
    const t = this.currentTarget(ctx);
    if (!t) return Infinity;
    return Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
  }

  private targetReach(): number {
    return this.mind.state === 'fetch' || this.mind.state === 'carry' ? ITEM_REACH : AT_TARGET;
  }

  private reactToTransition(prevState: string, events: string[]): void {
    const cur = this.mind.state;
    if (cur === prevState) return;
    if (cur === 'chase' || cur === 'shoo') {
      this.say('!');
      events.push(`${cur}-start`);
    }
    if (cur === 'gohome' && (prevState === 'chase' || prevState === 'shoo')) {
      this.say('hmph', '#666666', 1.4);
      events.push('chase-giveup');
    }
    if (cur === 'startled' && prevState !== 'startled') {
      this.say('?!');
    }
  }

  private executeIntents(ctx: HumanContext, events: string[]): void {
    const mind = this.mind;

    if (mind.state === 'catch') {
      const droppedId = ctx.forceDropFromPlayer(this.x, this.y);
      if (droppedId) events.push('caught-player');
      return;
    }

    if (mind.state === 'carry' && this.heldItemId === null && mind.targetItemId) {
      const item = ctx.items.byId(mind.targetItemId);
      if (item && item.holder === null && !item.inWater) {
        ctx.items.npcGrab(item, this.def.id);
        this.heldItemId = item.id;
      } else {
        this.mind = { ...mind, state: 'gohome', targetItemId: null };
      }
    }

    if (mind.state === 'gohome' && this.heldItemId !== null) {
      const item = ctx.items.byId(this.heldItemId);
      if (item && item.holder === this.def.id) ctx.items.npcPlaceHome(item);
      this.heldItemId = null;
    }

    if (mind.state === 'fixbin' && mind.timer <= 0 && mind.targetBinId) {
      const bin = ctx.bins.get(mind.targetBinId);
      if (bin && !bin.upright) {
        bin.upright = true;
        bin.sprite.setFrame('prop/bin-upright');
        if (bin.solid?.body) (bin.solid.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        events.push('bin-fixed');
      }
    }

    // Slapstick: running over something slippery.
    if ((mind.state === 'chase' || mind.state === 'shoo' || mind.state === 'schedule') && this.speed() > SLIP_MIN_SPEED - 40) {
      for (const item of ctx.items.items) {
        if (item.holder !== null || item.inWater || !SLIPPERY_KINDS.has(item.kind)) continue;
        if (Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y) < 16) {
          this.triggerSlip();
          events.push('slipped');
          break;
        }
      }
    }
  }

  private speed(): number {
    const v = this.body().velocity;
    return Math.hypot(v.x, v.y);
  }

  private move(ctx: HumanContext): void {
    const body = this.body();
    const mind = this.mind;

    if (mind.state === 'startled' || mind.state === 'fixbin' || mind.state === 'slip') {
      body.setVelocity(0, 0);
      return;
    }

    const target = this.currentTarget(ctx);
    if (!target) {
      body.setVelocity(0, 0);
      return;
    }

    const d = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if ((mind.state === 'idle' || mind.state === 'patrol') && this.def.patrol && d < AT_TARGET) {
      this.patrolIndex = (this.patrolIndex + 1) % this.def.patrol.length;
      return;
    }
    if (d < this.targetReach()) {
      body.setVelocity(0, 0);
      return;
    }

    let speed = WALK_SPEED;
    if (mind.state === 'chase') speed = CHASE_SPEED;
    if (mind.state === 'shoo') speed = SHOO_SPEED;

    let dirX = (target.x - this.x) / d;
    let dirY = (target.y - this.y) / d;

    // Humans never wade: slide around the pond, halt at the sea.
    const nextX = this.x + dirX * speed * ctx.dt;
    const nextY = this.y + dirY * speed * ctx.dt;
    if (inPond(nextX, nextY)) {
      const slider = { x: this.x, y: this.y, slideSign: this.slideSign };
      const slid = slideAroundPond(slider, { x: dirX, y: dirY }, 1);
      this.slideSign = slider.slideSign ?? null; // keep the sticky direction
      if (slid) {
        const sl = Math.hypot(slid.x - this.x, slid.y - this.y) || 1;
        dirX = (slid.x - this.x) / sl;
        dirY = (slid.y - this.y) / sl;
      } else {
        body.setVelocity(0, 0);
        return;
      }
    } else if (inWater(nextX, nextY)) {
      body.setVelocity(0, 0);
      return;
    } else {
      this.slideSign = null;
    }

    body.setVelocity(dirX * speed, dirY * speed);
    if (Math.abs(dirX) > 0.1) this.facing = dirX > 0 ? 1 : -1;
  }

  private updateVisual(): void {
    this.sprite.setFlipX(this.facing === 1);
    this.sprite.setDepth(this.y);
    this.bubble.setPosition(this.x, this.y - 104);

    const moving = this.speed() > 5;
    let anim = 'idle';
    switch (this.mind.state) {
      case 'chase':
      case 'shoo':
        anim = 'chase';
        break;
      case 'startled':
        anim = 'startled';
        break;
      case 'slip':
        anim = 'slip';
        break;
      default:
        anim = moving ? 'walk' : this.def.sitting ? 'sit' : 'idle';
    }
    const key = `${this.def.archetype}/${anim}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
