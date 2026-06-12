import { describe, expect, test } from 'vitest';
import {
  SAVE_KEY, SAVE_VERSION, SaveSystem, makeSave, parseSave, type StorageAdapter,
} from '../src/systems/save';
import { makeFlags } from '../src/systems/flags';
import { makeTaskState } from '../src/systems/tasks';

function memoryAdapter(): StorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    read: (k) => store.get(k) ?? null,
    write: (k, v) => void store.set(k, v),
    remove: (k) => void store.delete(k),
  };
}

describe('round trip', () => {
  test('save → load preserves progress', () => {
    const adapter = memoryAdapter();
    const sys = new SaveSystem(adapter);
    const ts = { ...makeTaskState(), completed: ['park-squawk', 'park-chip'], unlockedDistricts: ['park', 'cafe'] as ('park' | 'cafe')[] };
    const flags = { ...makeFlags(), honked: true, chipStolen: true, cafeSquawkedAt: ['barista'] };
    sys.save(makeSave(ts, flags, { x: 123, y: 456 }, 99));

    const loaded = sys.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.completed).toEqual(['park-squawk', 'park-chip']);
    expect(loaded!.unlockedDistricts).toEqual(['park', 'cafe']);
    expect(loaded!.flags.honked).toBe(true);
    expect(loaded!.flags.cafeSquawkedAt).toEqual(['barista']);
    expect(loaded!.position).toEqual({ x: 123, y: 456 });
    expect(loaded!.playSeconds).toBe(99);
  });

  test('clear removes the save', () => {
    const adapter = memoryAdapter();
    const sys = new SaveSystem(adapter);
    sys.save(makeSave(makeTaskState(), makeFlags(), null, 0));
    expect(adapter.store.has(SAVE_KEY)).toBe(true);
    sys.clear();
    expect(sys.load()).toBeNull();
  });
});

describe('parseSave hardening', () => {
  test('rejects garbage, null, wrong versions', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('not json{{')).toBeNull();
    expect(parseSave('"just a string"')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 99 }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 0 }))).toBeNull();
    expect(parseSave(JSON.stringify({ no: 'version' }))).toBeNull();
  });

  test('migrates a v1 save to a fresh v2 start', () => {
    const v1 = JSON.stringify({ version: 1, tasksDone: ['honk'], anything: 'else' });
    const loaded = parseSave(v1);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_VERSION);
    expect(loaded!.completed).toEqual([]);
    expect(loaded!.unlockedDistricts).toEqual(['park']);
  });

  test('sanitises tampered fields onto safe defaults', () => {
    const tampered = JSON.stringify({
      version: 2,
      completed: ['park-squawk', 42, null],
      unlockedDistricts: ['park', 'moon-base'],
      won: 'yes',
      flags: { honked: 'true', chipStolen: true, cafeSquawkedAt: 'barista' },
      position: { x: 'a', y: 2 },
      playSeconds: 'lots',
    });
    const loaded = parseSave(tampered)!;
    expect(loaded.completed).toEqual(['park-squawk']);
    expect(loaded.unlockedDistricts).toEqual(['park']);
    expect(loaded.won).toBe(false);
    expect(loaded.flags.honked).toBe(false); // string 'true' rejected
    expect(loaded.flags.chipStolen).toBe(true);
    expect(loaded.flags.cafeSquawkedAt).toEqual([]); // non-array rejected
    expect(loaded.position).toBeNull();
    expect(loaded.playSeconds).toBe(0);
  });

  test('empty unlocked list falls back to park', () => {
    const loaded = parseSave(JSON.stringify({ version: 2, unlockedDistricts: [] }))!;
    expect(loaded.unlockedDistricts).toEqual(['park']);
  });
});
