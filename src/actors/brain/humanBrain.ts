// Pure human decision logic, ported from v1 (battle-tested) and extended
// with schedules, slips, hidden-player rules, and playful kids who chase
// the ibis for fun. The runtime builds Perception and executes intents;
// this module never touches Phaser or the world.

export const CATCH_RADIUS = 36;
export const GIVE_UP_RADIUS = 460;
export const STARTLE_SECONDS = 0.9;
export const BIN_FIX_SECONDS = 1.2;
export const SLIP_SECONDS = 1.7;

export type HumanState =
  | 'idle' | 'patrol' | 'schedule' | 'startled' | 'chase' | 'catch'
  | 'fetch' | 'carry' | 'shoo' | 'gotobin' | 'fixbin' | 'gohome' | 'slip';

export interface Mind {
  state: HumanState;
  timer: number;
  targetItemId: string | null;
  targetBinId: string | null;
  noticeRadius: number;
  personalSpace: number;
  playful: boolean;       // kids: chase the ibis itself
  hasSchedule: boolean;
  chaseSeconds: number;   // accumulated this chase (for chase-length tasks)
}

export interface Perception {
  distToPlayer: number;
  playerHasMyItem: boolean;  // for playful npcs: player holds ANYTHING
  playerHidden: boolean;
  playerInWater: boolean;
  astrayItemId: string | null;
  fetchTargetValid: boolean;
  knockedBinId: string | null;
  binStillKnocked: boolean;
  atTarget: boolean;
  startled: boolean;
  atSchedulePoint: boolean;
}

export function makeMind(def: {
  noticeRadius: number;
  personalSpace: number;
  playful?: boolean;
  hasSchedule?: boolean;
}): Mind {
  return {
    state: 'idle',
    timer: 0,
    targetItemId: null,
    targetBinId: null,
    noticeRadius: def.noticeRadius,
    personalSpace: def.personalSpace,
    playful: def.playful ?? false,
    hasSchedule: def.hasSchedule ?? false,
    chaseSeconds: 0,
  };
}

function wantsToChase(mind: Mind, p: Perception): boolean {
  if (p.playerHidden) return false;
  if (!p.playerHasMyItem) return false;
  return p.distToPlayer < mind.noticeRadius;
}

export function think(mind: Mind, p: Perception): Mind {
  // A squawk interrupts everything except carrying an item home or being
  // mid-pratfall.
  if (p.startled && mind.state !== 'carry' && mind.state !== 'slip') {
    return { ...mind, state: 'startled', timer: STARTLE_SECONDS };
  }

  switch (mind.state) {
    case 'startled': {
      if (mind.timer > 0) return mind;
      return { ...mind, state: 'idle' };
    }

    case 'slip': {
      if (mind.timer > 0) return mind;
      return { ...mind, state: 'gohome' };
    }

    case 'idle':
    case 'patrol':
    case 'schedule': {
      if (wantsToChase(mind, p)) {
        return { ...mind, state: 'chase', chaseSeconds: 0 };
      }
      if (p.astrayItemId) {
        return { ...mind, state: 'fetch', targetItemId: p.astrayItemId };
      }
      if (mind.personalSpace > 0 && !p.playerHidden && p.distToPlayer < mind.personalSpace) {
        return { ...mind, state: 'shoo' };
      }
      if (p.knockedBinId) {
        return { ...mind, state: 'gotobin', targetBinId: p.knockedBinId };
      }
      if (mind.hasSchedule && mind.state !== 'schedule' && !p.atSchedulePoint) {
        return { ...mind, state: 'schedule' };
      }
      return mind;
    }

    case 'chase': {
      if (p.playerHidden) {
        return { ...mind, state: 'gohome' }; // ...where did it go?
      }
      if (!p.playerHasMyItem) {
        return p.astrayItemId
          ? { ...mind, state: 'fetch', targetItemId: p.astrayItemId }
          : { ...mind, state: 'gohome' };
      }
      if (p.playerInWater || p.distToPlayer > GIVE_UP_RADIUS) {
        return { ...mind, state: 'gohome' }; // not worth getting wet
      }
      if (p.distToPlayer < CATCH_RADIUS) {
        return { ...mind, state: 'catch' }; // runtime resolves the snatch
      }
      return mind;
    }

    case 'catch': {
      return p.astrayItemId
        ? { ...mind, state: 'fetch', targetItemId: p.astrayItemId }
        : { ...mind, state: 'gohome' };
    }

    case 'fetch': {
      if (wantsToChase(mind, p)) {
        return { ...mind, state: 'chase', targetItemId: null, chaseSeconds: 0 };
      }
      if (!p.fetchTargetValid) {
        return { ...mind, state: 'gohome', targetItemId: null };
      }
      if (p.atTarget) {
        return { ...mind, state: 'carry' }; // runtime picks the item up
      }
      return mind;
    }

    case 'carry': {
      if (p.atTarget) {
        return { ...mind, state: 'gohome', targetItemId: null }; // runtime places it
      }
      return mind;
    }

    case 'shoo': {
      if (wantsToChase(mind, p)) {
        return { ...mind, state: 'chase', chaseSeconds: 0 };
      }
      if (p.playerHidden || p.playerInWater || p.distToPlayer > mind.personalSpace * 2.2) {
        return { ...mind, state: 'gohome' };
      }
      return mind;
    }

    case 'gotobin': {
      if (wantsToChase(mind, p)) {
        return { ...mind, state: 'chase', targetBinId: null, chaseSeconds: 0 };
      }
      if (!p.binStillKnocked) {
        return { ...mind, state: 'gohome', targetBinId: null };
      }
      if (p.atTarget) {
        return { ...mind, state: 'fixbin', timer: BIN_FIX_SECONDS };
      }
      return mind;
    }

    case 'fixbin': {
      if (mind.timer > 0) return mind;
      return { ...mind, state: 'gohome', targetBinId: null }; // runtime rights it
    }

    case 'gohome': {
      if (wantsToChase(mind, p)) {
        return { ...mind, state: 'chase', chaseSeconds: 0 };
      }
      if (p.astrayItemId) {
        return { ...mind, state: 'fetch', targetItemId: p.astrayItemId };
      }
      if (p.atTarget) {
        return { ...mind, state: 'idle' };
      }
      return mind;
    }

    default:
      return { ...mind, state: 'idle' };
  }
}
