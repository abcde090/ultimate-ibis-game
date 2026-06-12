// Pure dog decision logic. Dogs are faster than the ibis and happily swim,
// but won't follow into deep water — that's the escape route.

export const DOG_NOTICE = 320;
export const DOG_GIVE_UP = 620;
export const DOG_CATCH = 30;
export const DEEP_WATER_Y = 3008; // tiles y >= 94 are deep sea

export type DogState = 'leashed' | 'wander' | 'chase' | 'celebrate';

export interface DogMind {
  state: DogState;
  timer: number;
}

export interface DogPerception {
  distToPlayer: number;
  playerHidden: boolean;
  playerDeepWater: boolean;
  atTarget: boolean;
}

export function makeDogMind(leashed: boolean): DogMind {
  return { state: leashed ? 'leashed' : 'wander', timer: 0 };
}

export interface DogDecision {
  mind: DogMind;
  escapedIntoDeep?: boolean; // chase ended because the ibis out-swam the dog
}

export function thinkDog(mind: DogMind, p: DogPerception): DogDecision {
  switch (mind.state) {
    case 'leashed':
      return { mind }; // freed externally via the unleash interaction

    case 'wander': {
      if (!p.playerHidden && p.distToPlayer < DOG_NOTICE && !p.playerDeepWater) {
        return { mind: { state: 'chase', timer: 0 } };
      }
      return { mind };
    }

    case 'chase': {
      if (p.playerDeepWater) {
        // Paddling in circles, defeated.
        return { mind: { state: 'celebrate', timer: 1.4 }, escapedIntoDeep: true };
      }
      if (p.playerHidden || p.distToPlayer > DOG_GIVE_UP) {
        return { mind: { state: 'wander', timer: 0 } };
      }
      if (p.distToPlayer < DOG_CATCH) {
        // Runtime forces the drop; brief victory lap.
        return { mind: { state: 'celebrate', timer: 1.2 } };
      }
      return { mind };
    }

    case 'celebrate': {
      if (mind.timer > 0) return { mind };
      return { mind: { state: 'wander', timer: 0 } };
    }

    default:
      return { mind: { state: 'wander', timer: 0 } };
  }
}
