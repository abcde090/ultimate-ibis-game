// Pure item rules, ported from v1. Items live in a flat list; holders are
// 'player' or an npc id. Water rules come from the world module.

import { inWater } from '../world/waterRules';

export const GRAB_REACH = 48;

export interface GameItem {
  id: string;
  kind: string;
  x: number;
  y: number;
  owner: string | null;
  home: { x: number; y: number };
  holder: string | null;
  inWater: boolean;
  locked: string | null; // flag name required before grabbable
}

export function makeItem(def: {
  id: string; kind: string; x: number; y: number;
  owner?: string | null; locked?: string | null;
}): GameItem {
  return {
    id: def.id,
    kind: def.kind,
    x: def.x,
    y: def.y,
    owner: def.owner ?? null,
    home: { x: def.x, y: def.y },
    holder: null,
    inWater: false,
    locked: def.locked ?? null,
  };
}

export function findGrabbable(
  beakX: number,
  beakY: number,
  items: GameItem[],
  unlockedFlags: Record<string, unknown>,
): GameItem | null {
  let best: GameItem | null = null;
  let bestD = Infinity;
  for (const item of items) {
    if (item.holder !== null) continue;
    if (item.locked && !unlockedFlags[item.locked]) continue;
    const d = Math.hypot(beakX - item.x, beakY - item.y);
    if (d <= GRAB_REACH && d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

export function grab(item: GameItem, holderId: string): void {
  item.holder = holderId;
  item.inWater = false;
}

// Drop at (x, y); returns true if it landed in water.
export function drop(item: GameItem, x: number, y: number): boolean {
  item.holder = null;
  item.x = x;
  item.y = y;
  item.inWater = inWater(x, y);
  return item.inWater;
}

// Would the owner want to fetch it? (Loose, away from home, dry.)
export function isAstray(item: GameItem): boolean {
  if (item.holder !== null) return false;
  if (item.inWater) return false;
  return Math.hypot(item.x - item.home.x, item.y - item.home.y) > 26;
}

export function itemsOwnedBy(items: GameItem[], ownerId: string): GameItem[] {
  return items.filter((it) => it.owner === ownerId);
}

// Items that send humans flying when stepped on at speed.
export const SLIPPERY_KINDS = new Set(['chip', 'sausage', 'trash-peel', 'fish', 'croissant']);

let trashCounter = 0;

export function makeTrash(x: number, y: number): GameItem {
  trashCounter += 1;
  const kinds = ['trash-can', 'trash-peel', 'trash-wrapper'];
  return {
    id: `trash-${trashCounter}`,
    kind: kinds[trashCounter % kinds.length] ?? 'trash-can',
    x,
    y,
    owner: null,
    home: { x, y },
    holder: null,
    inWater: false,
    locked: null,
  };
}
