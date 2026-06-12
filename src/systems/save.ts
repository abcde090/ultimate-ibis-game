// Versioned save system behind a storage adapter (localStorage in the
// browser; a Steam wrap can swap in file storage without touching callers).

import type { DistrictId } from '../world/layoutData';
import { makeFlags, type Flags } from './flags';
import { makeTaskState, type TaskState } from './tasks';

export const SAVE_KEY = 'bin-chicken-save';
export const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  completed: string[];
  unlockedDistricts: DistrictId[];
  won: boolean;
  flags: Flags;
  position: { x: number; y: number } | null;
  playSeconds: number;
}

export interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export function localStorageAdapter(): StorageAdapter {
  return {
    read(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null; // private browsing / blocked storage
      }
    },
    write(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Best effort — the game keeps running without persistence.
      }
    },
    remove(key) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

export function makeSave(
  taskState: TaskState,
  flags: Flags,
  position: { x: number; y: number } | null,
  playSeconds: number,
): SaveData {
  return {
    version: SAVE_VERSION,
    completed: [...taskState.completed],
    unlockedDistricts: [...taskState.unlockedDistricts],
    won: taskState.won,
    flags: { ...flags },
    position: position ? { ...position } : null,
    playSeconds,
  };
}

// Migrations run in sequence: data at version N is upgraded by MIGRATIONS[N].
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 (the vanilla prototype) had a different shape entirely; treat any
  // v1 payload as a fresh start but keep nothing — documented breaking change.
  1: () => ({ version: 2, ...freshPayload() }),
};

function freshPayload(): Omit<SaveData, 'version'> {
  const ts = makeTaskState();
  return {
    completed: ts.completed,
    unlockedDistricts: ts.unlockedDistricts,
    won: ts.won,
    flags: makeFlags(),
    position: null,
    playSeconds: 0,
  };
}

export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;

  let version = typeof data.version === 'number' ? data.version : 0;
  if (version < 1 || version > SAVE_VERSION) return null;
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return null;
    data = migrate(data);
    version = typeof data.version === 'number' ? data.version : version + 1;
  }

  return sanitize(data);
}

// Never trust stored data: merge onto fresh defaults field by field.
function sanitize(data: Record<string, unknown>): SaveData {
  const fresh = freshPayload();
  const flags = makeFlags();
  const storedFlags = (data.flags ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(flags)) {
    const stored = storedFlags[key];
    if (typeof flags[key] === 'boolean' && typeof stored === 'boolean') flags[key] = stored;
    if (Array.isArray(flags[key]) && Array.isArray(stored)) {
      flags[key] = stored.filter((v): v is string => typeof v === 'string');
    }
  }

  const districts: DistrictId[] = ['park', 'cafe', 'market', 'beach', 'oval'];
  const unlocked = Array.isArray(data.unlockedDistricts)
    ? data.unlockedDistricts.filter((d): d is DistrictId => districts.includes(d as DistrictId))
    : fresh.unlockedDistricts;

  const pos = data.position as { x?: unknown; y?: unknown } | null | undefined;
  const position =
    pos && typeof pos.x === 'number' && typeof pos.y === 'number'
      ? { x: pos.x, y: pos.y }
      : null;

  return {
    version: SAVE_VERSION,
    completed: Array.isArray(data.completed)
      ? data.completed.filter((v): v is string => typeof v === 'string')
      : fresh.completed,
    unlockedDistricts: unlocked.length > 0 ? unlocked : ['park'],
    won: data.won === true,
    flags,
    position,
    playSeconds: typeof data.playSeconds === 'number' ? data.playSeconds : 0,
  };
}

export class SaveSystem {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = localStorageAdapter()) {
    this.storage = storage;
  }

  load(): SaveData | null {
    return parseSave(this.storage.read(SAVE_KEY));
  }

  save(data: SaveData): void {
    this.storage.write(SAVE_KEY, JSON.stringify(data));
  }

  clear(): void {
    this.storage.remove(SAVE_KEY);
  }

  toTaskState(data: SaveData): TaskState {
    return {
      completed: data.completed,
      unlockedDistricts: data.unlockedDistricts,
      won: data.won,
    };
  }
}
