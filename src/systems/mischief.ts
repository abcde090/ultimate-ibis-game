// The glue between player actions, NPC events, flags, and task progression.
// Owned by the World scene; emits scene events for UI ('toast', 'tasks-changed').

import Phaser from 'phaser';
import { NEST, DISTRICTS, TILE_PX } from '../world/layoutData';
import type { DistrictId } from '../world/layoutData';
import { inPond } from '../world/waterRules';
import { makeFlags, type Flags } from './flags';
import { makeTaskState, updateTasks, type TaskState, TASKS } from './tasks';
import type { ItemManager } from '../items/itemManager';
import type { GameItem } from '../items/itemRules';
import type { HumanNpc } from '../actors/humanRuntime';

const HONK_RADIUS = 280;
const DISTRICT_NAMES: Record<DistrictId, string> = {
  park: 'the Park Lawn',
  cafe: 'the Cafe Strip',
  market: 'the Market Stalls',
  beach: 'the Foreshore',
  oval: 'the Cricket Oval',
};

export class Mischief {
  flags: Flags = makeFlags();
  taskState: TaskState = makeTaskState();
  private scene: Phaser.Scene;
  private items: ItemManager;

  constructor(scene: Phaser.Scene, items: ItemManager) {
    this.scene = scene;
    this.items = items;
  }

  // ---- player actions ----

  onGrabbed(item: GameItem): void {
    switch (item.kind) {
      case 'chip': this.flags.chipStolen = true; break;
      case 'sausage': this.flags.sausageStolen = true; break;
      case 'croissant': this.flags.croissantStolen = true; break;
      case 'coin': this.flags.coinStolen = true; break;
      case 'mango': this.flags.mangoStolen = true; break;
      case 'fish': this.flags.fishStolen = true; break;
      case 'scarf': this.flags.scarfWorn = true; break;
      case 'sunscreen': this.flags.sunscreenStolen = true; break;
      case 'bucket': this.flags.bucketStolen = true; break;
      case 'whistle': this.flags.whistleStolen = true; break;
      case 'key': this.flags.keyStolen = true; break;
      default: break;
    }
    if (item.kind.startsWith('trash')) this.flags.trashGrabbed = true;
  }

  onDropped(item: GameItem, x: number, y: number): void {
    if (item.kind === 'phone' && inPond(x, y)) this.flags.phoneInPond = true;
    if (item.kind === 'coffee' && Math.hypot(x - item.home.x, y - item.home.y) > 60) {
      this.flags.coffeeSpilled = true;
    }
    if (item.kind === 'fish') {
      // Near the busker's guitar case?
      const guitarCase = this.propPos('guitar-case');
      if (guitarCase && Math.hypot(x - guitarCase.x, y - guitarCase.y) < 60) {
        this.flags.fishInGuitarCase = true;
      }
    }
    if (item.kind === 'golden-chip' && Math.hypot(x - NEST.x, y - NEST.y) <= NEST.r) {
      this.flags.goldenChipAtNest = true;
    }
  }

  private propPos(id: string): { x: number; y: number } | null {
    const sprite = (this.scene as unknown as { propSprites?: Map<string, Phaser.GameObjects.Sprite> })
      .propSprites?.get(id);
    return sprite ? { x: sprite.x, y: sprite.y } : null;
  }

  onBinKnocked(): void {
    this.flags.binKnocked = true;
  }

  onHonk(playerX: number, playerY: number, long: boolean, npcs: HumanNpc[]): HumanNpc[] {
    this.flags.honked = true;
    const radius = long ? HONK_RADIUS * 1.5 : HONK_RADIUS;
    const startled: HumanNpc[] = [];
    for (const npc of npcs) {
      if (Phaser.Math.Distance.Between(playerX, playerY, npc.x, npc.y) <= radius) {
        npc.startleEvent = true;
        startled.push(npc);
        this.recordSquawkAt(npc.def.id);
        if (npc.def.id === 'influencer') this.flags.influencerPhotobombed = true;
      }
    }
    return startled;
  }

  private recordSquawkAt(npcId: string): void {
    const cafeIds = ['barista', 'waiter', 'cafecustomer', 'busker', 'influencer'];
    const beachIds = ['lifeguard', 'sunbather'];
    if (cafeIds.includes(npcId) && !this.flags.cafeSquawkedAt.includes(npcId)) {
      this.flags.cafeSquawkedAt = [...this.flags.cafeSquawkedAt, npcId];
    }
    if (beachIds.includes(npcId) && !this.flags.beachSquawkedAt.includes(npcId)) {
      this.flags.beachSquawkedAt = [...this.flags.beachSquawkedAt, npcId];
    }
  }

  // ---- npc events ----

  onNpcEvents(npc: HumanNpc, events: string[]): void {
    for (const ev of events) {
      if (ev === 'chase-start' || ev === 'shoo-start') {
        if (npc.def.id === 'groundskeeper') this.flags.groundskeeperChased = true;
      }
      if (ev === 'slipped' && npc.def.id === 'waiter') this.flags.waiterSlipped = true;
    }
    if (
      (npc.def.id === 'fruitvendor' || npc.def.id === 'fishmonger') &&
      npc.totalChaseSeconds > 4
    ) {
      this.flags.vendorChasedLong = true;
    }
  }

  // ---- per-frame sync & progression ----

  sync(playerX: number, playerY: number): { gatesToOpen: string[]; toasts: string[]; won: boolean } {
    // District presence flags.
    if (this.districtAt(playerX, playerY) === 'oval') this.flags.ovalInfiltrated = true;

    const phone = this.items.byId('phone');
    if (phone && phone.inWater && inPond(phone.x, phone.y)) this.flags.phoneInPond = true;

    const golden = this.items.byId('golden-chip');
    if (golden && golden.holder !== 'clubpresident' &&
        Math.hypot(golden.x - NEST.x, golden.y - NEST.y) <= NEST.r) {
      this.flags.goldenChipAtNest = true;
    }

    const before = this.taskState;
    const result = updateTasks(this.taskState, this.flags);
    this.taskState = result.taskState;

    const toasts: string[] = [];
    for (const id of result.newlyCompleted) {
      const task = TASKS.find((t) => t.id === id);
      if (task) toasts.push(`✓ ${task.text}`);
    }
    for (const district of result.newDistricts) {
      toasts.push(`${DISTRICT_NAMES[district]} is now open!`);
    }

    if (result.newlyCompleted.length > 0 || result.newDistricts.length > 0) {
      this.scene.events.emit('tasks-changed', this.taskState);
    }

    return {
      gatesToOpen: result.gatesToOpen,
      toasts,
      won: this.taskState.won && !before.won,
    };
  }

  districtAt(x: number, y: number): DistrictId {
    const tx = Math.floor(x / TILE_PX);
    const ty = Math.floor(y / TILE_PX);
    for (const [id, d] of Object.entries(DISTRICTS)) {
      if (tx >= d.x && tx < d.x + d.w && ty >= d.y && ty < d.y + d.h) return id as DistrictId;
    }
    return 'park';
  }
}
