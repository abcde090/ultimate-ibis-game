// Task definitions for all five districts plus progression logic.
// Pure: checks read flags only. District completion opens the next gate.

import type { DistrictId } from '../world/layoutData';
import type { Flags } from './flags';

export interface TaskDef {
  id: string;
  district: DistrictId;
  text: string;
  check: (f: Flags) => boolean;
}

export const TASKS: TaskDef[] = [
  // ---- park ----
  { id: 'park-squawk', district: 'park', text: 'Squawk', check: (f) => f.honked === true },
  { id: 'park-chip', district: 'park', text: 'Steal a hot chip from the picnic', check: (f) => f.chipStolen === true },
  { id: 'park-bin', district: 'park', text: 'Knock over a bin', check: (f) => f.binKnocked === true },
  { id: 'park-trash', district: 'park', text: 'Go full bin chicken: pull out some trash', check: (f) => f.trashGrabbed === true },
  { id: 'park-snag', district: 'park', text: 'Steal the snag off the barbie', check: (f) => f.sausageStolen === true },
  { id: 'park-phone', district: 'park', text: 'Drop the phone in the pond', check: (f) => f.phoneInPond === true },
  { id: 'park-chased', district: 'park', text: 'Get the groundskeeper to chase you', check: (f) => f.groundskeeperChased === true },
  { id: 'park-shed', district: 'park', text: 'Sneak into the groundskeeper’s shed', check: (f) => f.shedSneaked === true },
  // ---- cafe ----
  { id: 'cafe-croissant', district: 'cafe', text: 'Steal a croissant from the bakery', check: (f) => f.croissantStolen === true },
  { id: 'cafe-coffee', district: 'cafe', text: 'Knock over someone’s flat white', check: (f) => f.coffeeSpilled === true },
  { id: 'cafe-sign', district: 'cafe', text: 'Drag the OPEN sign away', check: (f) => f.signDragged === true },
  { id: 'cafe-coin', district: 'cafe', text: 'Steal the busker’s coin', check: (f) => f.coinStolen === true },
  { id: 'cafe-slip', district: 'cafe', text: 'Make the waiter slip on something', check: (f) => f.waiterSlipped === true },
  { id: 'cafe-dog', district: 'cafe', text: 'Untie the dog’s leash', check: (f) => f.dogUnleashed === true },
  { id: 'cafe-photobomb', district: 'cafe', text: 'Photobomb the influencer', check: (f) => f.influencerPhotobombed === true },
  { id: 'cafe-squawkall', district: 'cafe', text: 'Squawk at everyone on the strip', check: (f) => ['barista', 'waiter', 'cafecustomer', 'busker', 'influencer'].every((id) => f.cafeSquawkedAt.includes(id)) },
  // ---- market ----
  { id: 'market-mango', district: 'market', text: 'Steal a mango', check: (f) => f.mangoStolen === true },
  { id: 'market-fish', district: 'market', text: 'Steal the fishmonger’s fish', check: (f) => f.fishStolen === true },
  { id: 'market-scarf', district: 'market', text: 'Steal a scarf and wear it', check: (f) => f.scarfWorn === true },
  { id: 'market-balloon', district: 'market', text: 'Pop a balloon', check: (f) => f.balloonPopped === true },
  { id: 'market-signs', district: 'market', text: 'Mess with the price signs', check: (f) => f.signsSwapped === true },
  { id: 'market-chase', district: 'market', text: 'Lead a vendor on a merry chase', check: (f) => f.vendorChasedLong === true },
  { id: 'market-guitarfish', district: 'market', text: 'Drop a fish in the busker’s guitar case', check: (f) => f.fishInGuitarCase === true },
  { id: 'market-magpie', district: 'market', text: 'Get robbed by the magpie (it happens)', check: (f) => f.magpieRobbedYou === true },
  // ---- beach ----
  { id: 'beach-sandcastle', district: 'beach', text: 'Trample a sandcastle', check: (f) => f.sandcastleTrampled === true },
  { id: 'beach-whistle', district: 'beach', text: 'Steal the lifeguard’s whistle', check: (f) => f.whistleStolen === true },
  { id: 'beach-towel', district: 'beach', text: 'Drag a towel into the sea', check: (f) => f.towelDragged === true },
  { id: 'beach-sunscreen', district: 'beach', text: 'Steal the sunscreen', check: (f) => f.sunscreenStolen === true },
  { id: 'beach-bucket', district: 'beach', text: 'Steal the kid’s bucket', check: (f) => f.bucketStolen === true },
  { id: 'beach-dog', district: 'beach', text: 'Escape the dog by swimming out deep', check: (f) => f.dogEscapedBySwimming === true },
  { id: 'beach-seagulls', district: 'beach', text: 'Scatter the seagulls with a long squawk', check: (f) => f.seagullsScattered === true },
  { id: 'beach-squawkall', district: 'beach', text: 'Squawk at everyone on the beach', check: (f) => ['lifeguard', 'sunbather'].every((id) => f.beachSquawkedAt.includes(id)) },
  // ---- oval (the finale heist) ----
  { id: 'oval-infiltrate', district: 'oval', text: 'Infiltrate the sausage sizzle', check: (f) => f.ovalInfiltrated === true },
  { id: 'oval-key', district: 'oval', text: 'Steal the club president’s key', check: (f) => f.keyStolen === true },
  { id: 'oval-case', district: 'oval', text: 'Open the trophy case', check: (f) => f.trophyCaseOpen === true },
  { id: 'oval-goldenchip', district: 'oval', text: 'Take the GOLDEN CHIP to your nest', check: (f) => f.goldenChipAtNest === true },
];

export const DISTRICT_ORDER: DistrictId[] = ['park', 'cafe', 'market', 'beach', 'oval'];

// District → the gate its completion opens.
export const GATE_FOR_DISTRICT: Partial<Record<DistrictId, string>> = {
  park: 'gate-park-cafe',
  cafe: 'gate-cafe-market',
  market: 'gate-market-beach',
  beach: 'gate-market-oval',
};

export interface TaskState {
  completed: string[];
  unlockedDistricts: DistrictId[];
  won: boolean;
}

export function makeTaskState(): TaskState {
  return { completed: [], unlockedDistricts: ['park'], won: false };
}

export function tasksFor(district: DistrictId): TaskDef[] {
  return TASKS.filter((t) => t.district === district);
}

export function districtComplete(district: DistrictId, completed: string[]): boolean {
  return tasksFor(district).every((t) => completed.includes(t.id));
}

export interface TaskUpdate {
  taskState: TaskState;
  newlyCompleted: string[];
  gatesToOpen: string[];
  newDistricts: DistrictId[];
}

export function updateTasks(prev: TaskState, flags: Flags): TaskUpdate {
  const completed = [...prev.completed];
  const newlyCompleted: string[] = [];

  for (const task of TASKS) {
    if (!prev.unlockedDistricts.includes(task.district)) continue;
    if (completed.includes(task.id)) continue;
    if (task.check(flags)) {
      completed.push(task.id);
      newlyCompleted.push(task.id);
    }
  }

  const unlockedDistricts = [...prev.unlockedDistricts];
  const gatesToOpen: string[] = [];
  const newDistricts: DistrictId[] = [];

  for (let i = 0; i < DISTRICT_ORDER.length - 1; i++) {
    const district = DISTRICT_ORDER[i]!;
    const next = DISTRICT_ORDER[i + 1]!;
    if (
      unlockedDistricts.includes(district) &&
      !unlockedDistricts.includes(next) &&
      districtComplete(district, completed)
    ) {
      unlockedDistricts.push(next);
      newDistricts.push(next);
      const gate = GATE_FOR_DISTRICT[district];
      if (gate) gatesToOpen.push(gate);
    }
  }

  const won = prev.won || completed.includes('oval-goldenchip');

  return {
    taskState: { completed, unlockedDistricts, won },
    newlyCompleted,
    gatesToOpen,
    newDistricts,
  };
}
