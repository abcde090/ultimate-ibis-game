// Owns every item: sprites, grab/drop, bin pecking, and draggable props.

import Phaser from 'phaser';
import { ITEMS } from '../world/layoutData';
import { inPond } from '../world/waterRules';
import type { Flags } from '../systems/flags';
import {
  GameItem, makeItem, findGrabbable, grab, drop, makeTrash,
} from './itemRules';
import { IBIS_BEAK_OFFSET, HUMAN_HAND_OFFSET } from '../world/spriteMeta';

export interface BinState {
  id: string;
  x: number;
  y: number;
  upright: boolean;
  sprite: Phaser.GameObjects.Sprite;
  solid: Phaser.GameObjects.Rectangle | null;
}

const BIN_PECK_REACH = 52;
const DRAG_REACH = 56;
const MAX_TRASH = 12;

export interface DragTarget {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  homeX: number;
  homeY: number;
}

export class ItemManager {
  readonly items: GameItem[] = [];
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (const def of ITEMS) {
      const item = makeItem({
        id: def.id, kind: def.kind, x: def.x, y: def.y,
        owner: def.owner, locked: def.locked ?? null,
      });
      this.items.push(item);
      this.sprites.set(item.id, this.makeSprite(item));
    }
  }

  private makeSprite(item: GameItem): Phaser.GameObjects.Sprite {
    return this.scene.add
      .sprite(item.x, item.y, 'atlas', `item/${item.kind}`)
      .setOrigin(0.5, 0.7)
      .setDepth(item.y);
  }

  byId(id: string): GameItem | null {
    return this.items.find((it) => it.id === id) ?? null;
  }

  heldBy(holderId: string): GameItem | null {
    return this.items.find((it) => it.holder === holderId) ?? null;
  }

  spriteOf(id: string): Phaser.GameObjects.Sprite | null {
    return this.sprites.get(id) ?? null;
  }

  // Returns what happened so the world can set flags / play sounds.
  tryGrab(beakX: number, beakY: number, flags: Flags): GameItem | null {
    const item = findGrabbable(beakX, beakY, this.items, flags);
    if (!item) return null;
    grab(item, 'player');
    return item;
  }

  dropHeld(holderId: string, x: number, y: number): { item: GameItem; splashed: boolean; inPond: boolean } | null {
    const item = this.heldBy(holderId);
    if (!item) return null;
    const splashed = drop(item, x, y);
    return { item, splashed, inPond: inPond(x, y) };
  }

  npcGrab(item: GameItem, npcId: string): void {
    grab(item, npcId);
  }

  npcPlaceHome(item: GameItem): void {
    drop(item, item.home.x, item.home.y);
  }

  // Forced drop lands beside the catcher so it is always fetchable.
  forcedDrop(item: GameItem, npcX: number, npcY: number, playerX: number, playerY: number): void {
    const dx = playerX - npcX;
    const dy = playerY - npcY;
    const d = Math.hypot(dx, dy) || 1;
    drop(item, npcX + (dx / d) * 18, npcY + (dy / d) * 18);
  }

  spawnTrash(x: number, y: number): void {
    const trashCount = this.items.filter((it) => it.kind.startsWith('trash')).length;
    if (trashCount >= MAX_TRASH) return;
    for (const [ox, oy] of [[-30, 14], [24, 22]] as const) {
      const trash = makeTrash(x + ox, y + oy);
      this.items.push(trash);
      this.sprites.set(trash.id, this.makeSprite(trash));
    }
  }

  peckableBin(beakX: number, beakY: number, bins: Iterable<BinState>): BinState | null {
    for (const bin of bins) {
      if (!bin.upright) continue;
      if (Math.hypot(beakX - bin.x, beakY - (bin.y - 20)) <= BIN_PECK_REACH) return bin;
    }
    return null;
  }

  draggableNear(x: number, y: number, targets: Iterable<DragTarget>): DragTarget | null {
    for (const t of targets) {
      if (Math.hypot(x - t.sprite.x, y - t.sprite.y) <= DRAG_REACH) return t;
    }
    return null;
  }

  // Keep sprites glued to their holders / positions each frame.
  update(
    playerX: number, playerY: number, playerFacing: -1 | 1, playerDepth: number,
    npcPos: (id: string) => { x: number; y: number; facing: -1 | 1 } | null,
  ): void {
    for (const item of this.items) {
      const sprite = this.sprites.get(item.id);
      if (!sprite) continue;
      if (item.holder === 'player') {
        const bx = playerX + (playerFacing === -1 ? IBIS_BEAK_OFFSET.x : -IBIS_BEAK_OFFSET.x);
        const by = playerY + IBIS_BEAK_OFFSET.y;
        item.x = bx;
        item.y = by;
        sprite.setPosition(bx, by).setDepth(playerDepth + 1);
      } else if (item.holder !== null) {
        const npc = npcPos(item.holder);
        if (npc) {
          item.x = npc.x + (npc.facing === -1 ? HUMAN_HAND_OFFSET.x : -HUMAN_HAND_OFFSET.x);
          item.y = npc.y + HUMAN_HAND_OFFSET.y;
          sprite.setPosition(item.x, item.y).setDepth(npc.y + 1);
        }
      } else {
        sprite.setPosition(item.x, item.y).setDepth(item.y);
        sprite.setAlpha(item.inWater ? 0.8 : 1);
      }
    }
  }
}
