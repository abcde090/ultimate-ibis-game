// Player settings, persisted alongside the save. Consumed by audio (volumes),
// input (bindings), and UI (reduced motion).

import { DEFAULT_BINDINGS, type KeyBindings } from './input';
import { localStorageAdapter, type StorageAdapter } from './save';

export const SETTINGS_KEY = 'bin-chicken-settings';

export interface Settings {
  masterVolume: number;   // 0..1
  sfxVolume: number;
  ambienceVolume: number;
  reducedMotion: boolean;
  bindings: KeyBindings;
}

export function makeSettings(): Settings {
  return {
    masterVolume: 0.9,
    sfxVolume: 1,
    ambienceVolume: 0.8,
    reducedMotion: false,
    bindings: structuredClone(DEFAULT_BINDINGS),
  };
}

export class SettingsSystem {
  current: Settings;
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = localStorageAdapter()) {
    this.storage = storage;
    this.current = this.load();
  }

  private load(): Settings {
    const fresh = makeSettings();
    const raw = this.storage.read(SETTINGS_KEY);
    if (!raw) return fresh;
    try {
      const data = JSON.parse(raw) as Partial<Settings>;
      return {
        masterVolume: clamp01(data.masterVolume, fresh.masterVolume),
        sfxVolume: clamp01(data.sfxVolume, fresh.sfxVolume),
        ambienceVolume: clamp01(data.ambienceVolume, fresh.ambienceVolume),
        reducedMotion: data.reducedMotion === true,
        bindings: sanitizeBindings(data.bindings, fresh.bindings),
      };
    } catch {
      return fresh;
    }
  }

  save(): void {
    this.storage.write(SETTINGS_KEY, JSON.stringify(this.current));
  }
}

function clamp01(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function sanitizeBindings(stored: unknown, fallback: KeyBindings): KeyBindings {
  if (typeof stored !== 'object' || stored === null) return fallback;
  const out = structuredClone(fallback);
  for (const action of Object.keys(out) as (keyof KeyBindings)[]) {
    const codes = (stored as Record<string, unknown>)[action];
    if (Array.isArray(codes) && codes.length > 0 && codes.every((c) => typeof c === 'string')) {
      out[action] = codes as string[];
    }
  }
  return out;
}
