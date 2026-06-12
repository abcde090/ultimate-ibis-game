import { describe, expect, test } from 'vitest';
import {
  thinkDog, makeDogMind, DOG_NOTICE, DOG_GIVE_UP, DOG_CATCH,
  type DogPerception,
} from '../src/actors/brain/dogBrain';

function p(overrides: Partial<DogPerception> = {}): DogPerception {
  return {
    distToPlayer: 9999,
    playerHidden: false,
    playerDeepWater: false,
    atTarget: false,
    ...overrides,
  };
}

describe('dog brain', () => {
  test('leashed dogs stay put no matter what', () => {
    const mind = makeDogMind(true);
    expect(thinkDog(mind, p({ distToPlayer: 10 })).mind.state).toBe('leashed');
  });

  test('wandering dog spots the ibis and chases', () => {
    const mind = makeDogMind(false);
    expect(thinkDog(mind, p({ distToPlayer: DOG_NOTICE - 1 })).mind.state).toBe('chase');
    expect(thinkDog(mind, p({ distToPlayer: DOG_NOTICE + 1 })).mind.state).toBe('wander');
    expect(thinkDog(mind, p({ distToPlayer: 10, playerHidden: true })).mind.state).toBe('wander');
  });

  test('chase: catch up close, lose the hidden ibis, give up at range', () => {
    const chase = { state: 'chase' as const, timer: 0 };
    expect(thinkDog(chase, p({ distToPlayer: DOG_CATCH - 1 })).mind.state).toBe('celebrate');
    expect(thinkDog(chase, p({ distToPlayer: 100, playerHidden: true })).mind.state).toBe('wander');
    expect(thinkDog(chase, p({ distToPlayer: DOG_GIVE_UP + 1 })).mind.state).toBe('wander');
  });

  test('deep water ends the chase and reports the escape', () => {
    const out = thinkDog({ state: 'chase', timer: 0 }, p({ distToPlayer: 60, playerDeepWater: true }));
    expect(out.mind.state).toBe('celebrate');
    expect(out.escapedIntoDeep).toBe(true);
  });

  test('celebrate winds down to wander', () => {
    expect(thinkDog({ state: 'celebrate', timer: 0.5 }, p()).mind.state).toBe('celebrate');
    expect(thinkDog({ state: 'celebrate', timer: -0.1 }, p()).mind.state).toBe('wander');
  });
});
