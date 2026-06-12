// Pure NPC decision logic. Takes the npc's current mind + a perception
// snapshot, returns the next mind. The npc runtime (npc.js) builds the
// perception and executes the resulting intent; this module never
// touches the world.

export const CATCH_RADIUS = 34;
export const GIVE_UP_RADIUS = 420;
export const STARTLE_SECONDS = 0.9;
export const BIN_FIX_SECONDS = 1.2;

// perception: {
//   distToPlayer, playerHasMyItem, astrayItemId, playerInPond,
//   knockedBinId (groundskeeper only), atTarget (bool), startled (bool),
// }
export function think(mind, p) {
  // A squawk interrupts everything except carrying an item home.
  if (p.startled && mind.state !== 'carry') {
    return { ...mind, state: 'startled', timer: STARTLE_SECONDS };
  }

  switch (mind.state) {
    case 'startled': {
      if (mind.timer > 0) return mind;
      return { ...mind, state: 'idle' };
    }

    case 'idle':
    case 'patrol': {
      if (p.playerHasMyItem && p.distToPlayer < mind.noticeRadius) {
        return { ...mind, state: 'chase' };
      }
      if (p.astrayItemId) {
        return { ...mind, state: 'fetch', targetItemId: p.astrayItemId };
      }
      if (mind.personalSpace > 0 && p.distToPlayer < mind.personalSpace) {
        return { ...mind, state: 'shoo' };
      }
      if (p.knockedBinId) {
        return { ...mind, state: 'gotobin', targetBinId: p.knockedBinId };
      }
      return mind;
    }

    case 'chase': {
      if (!p.playerHasMyItem) {
        // They dropped it (or we never should have been here).
        return p.astrayItemId
          ? { ...mind, state: 'fetch', targetItemId: p.astrayItemId }
          : { ...mind, state: 'gohome' };
      }
      if (p.playerInPond || p.distToPlayer > GIVE_UP_RADIUS) {
        return { ...mind, state: 'gohome' }; // not worth getting wet
      }
      if (p.distToPlayer < CATCH_RADIUS) {
        // npc.js performs the forced drop, then hands us the astray item.
        return { ...mind, state: 'catch' };
      }
      return mind;
    }

    case 'catch': {
      // Transient: npc.js resolves the drop in the same tick.
      return p.astrayItemId
        ? { ...mind, state: 'fetch', targetItemId: p.astrayItemId }
        : { ...mind, state: 'gohome' };
    }

    case 'fetch': {
      if (p.playerHasMyItem && p.distToPlayer < mind.noticeRadius) {
        return { ...mind, state: 'chase', targetItemId: null };
      }
      if (!p.fetchTargetValid) {
        return { ...mind, state: 'gohome', targetItemId: null };
      }
      if (p.atTarget) {
        // npc.js picks the item up.
        return { ...mind, state: 'carry' };
      }
      return mind;
    }

    case 'carry': {
      if (p.atTarget) {
        // npc.js places the item back at its home.
        return { ...mind, state: 'gohome', targetItemId: null };
      }
      return mind;
    }

    case 'shoo': {
      if (p.playerHasMyItem && p.distToPlayer < mind.noticeRadius) {
        return { ...mind, state: 'chase' };
      }
      if (p.distToPlayer > mind.personalSpace * 2.2 || p.playerInPond) {
        return { ...mind, state: 'gohome' };
      }
      return mind;
    }

    case 'gotobin': {
      if (p.playerHasMyItem && p.distToPlayer < mind.noticeRadius) {
        return { ...mind, state: 'chase', targetBinId: null };
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
      // npc.js rights the bin when the timer elapses.
      return { ...mind, state: 'gohome', targetBinId: null };
    }

    case 'gohome': {
      if (p.playerHasMyItem && p.distToPlayer < mind.noticeRadius) {
        return { ...mind, state: 'chase' };
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

export function makeMind(def) {
  return {
    state: 'idle',
    timer: 0,
    targetItemId: null,
    targetBinId: null,
    noticeRadius: def.noticeRadius,
    personalSpace: def.personalSpace,
  };
}
