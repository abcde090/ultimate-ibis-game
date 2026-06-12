# Bin Chicken v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline execution — single author keeps art/code style coherent). Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Bin Chicken as a commercial-quality web game: Phaser 3 +
TypeScript, one seamless 4800×3200 five-district map, 36 tasks + Golden Chip
finale, new verbs (flap/swim/drag/hide) and actors (dog/kid/magpie/seagull),
saves/settings/menus, 60 fps.

**Architecture:** Phaser scenes (Boot→Preload→Title→World+UIOverlay+Pause).
Pure, DOM-free logic modules (brains, tasks, schedules, save, geometry) unit
tested with vitest; Phaser-side runtimes wire them to sprites. All art is
generated: TS SVG-builder functions → sharp → texture atlas + Tiled JSON map.

**Tech Stack:** phaser ^3.90, typescript (strict), vite, vitest, sharp
(build-time only), prettier. E2E via the local preview browser with a
`window.__game` debug hook (Playwright deferred — same coverage, no 120 MB
browser download).

**Spec:** [../specs/2026-06-12-bin-chicken-v2-commercial-design.md](../specs/2026-06-12-bin-chicken-v2-commercial-design.md)

---

## Locked contracts (cross-phase consistency)

```ts
// Atlas frame naming: `${actor}/${anim}/${frame}` e.g. "ibis/waddle/2",
// "human-barista/chase/1", "prop/bin-upright", "item/golden-chip".
// Anchor = feet/base centre for all actors and props.

// src/actors/brain/types.ts
export type HumanState =
  | 'idle' | 'patrol' | 'schedule' | 'startled' | 'chase' | 'catch'
  | 'fetch' | 'carry' | 'shoo' | 'gotobin' | 'fixbin' | 'gohome' | 'slip';
export interface Perception { /* v1 fields */ distToPlayer: number;
  playerHasMyItem: boolean; astrayItemId: string | null;
  fetchTargetValid: boolean; playerInWater: boolean; playerHidden: boolean;
  knockedBinId: string | null; binStillKnocked: boolean; atTarget: boolean;
  startled: boolean; slipperyItemUnderfoot: string | null;
  scheduleSlot: string; }

// src/systems/tasks/types.ts
export interface TaskDef { id: string; district: DistrictId; text: string;
  gate?: boolean; check(f: Flags): boolean; }
export type DistrictId = 'park' | 'cafe' | 'market' | 'beach' | 'oval';

// src/systems/save/types.ts
export interface SaveV2 { version: 2; tasksDone: string[];
  gatesOpen: DistrictId[]; settings: Settings; stats: Record<string, number>;
  position: { x: number; y: number } | null; }

// World constants: 32 px tiles, 150×100 map. Depth = sprite.y (y-sort).
```

## File structure

```
package.json, vite.config.ts, tsconfig.json, index.html
public/assets/            generated: atlas.png/json, tiles.png, map.json
tools/atlas/              bake.ts + sprites/{ibis,humans,animals,props,items,tiles}.ts
tools/map/                generate.ts + layout.ts (district data tables)
src/main.ts
src/scenes/               Boot,Preload,Title,World,UIOverlay,Pause
src/actors/               player.ts, humanRuntime.ts, dog.ts, kid.ts,
                          magpie.ts, seagull.ts
src/actors/brain/         humanBrain.ts, dogBrain.ts, magpieBrain.ts (pure)
src/items/                registry.ts, carry.ts, drag.ts (pure rules + runtime)
src/systems/              tasks/, save/, schedule.ts, input.ts, settings.ts,
                          audio.ts, flags.ts
src/ui/                   notepad.ts, prompts.ts, menus.ts
src/world/                mapLoader.ts, districts.ts, gates.ts, waterRules.ts
test/                     vitest mirrors of every pure module
```

## Phase tasks

### Task 0: Scaffold ✅ gate: `npm run check && npm test` green, blank Phaser scene renders
- [ ] package.json (scripts: dev/build/preview/test/check/bake), tsconfig strict, vite.config
- [ ] npm install phaser typescript vite vitest sharp prettier
- [ ] Boot scene renders solid colour + version text; commit

### Task 1: Pipelines ✅ gate: atlas.png + map.json generated deterministically; Phaser loads both
- [ ] tools/atlas: SVG builders for ibis (idle 2, waddle 4, flap 3, swim 2, squawk 2), human rig with style params (idle 2, walk 4, chase 4, startled 1, slip 2, sit 1) × archetype table, dog/kid/magpie/seagull, all props, all items, tiles
- [ ] bake.ts: rasterize via sharp, grid-pack, emit Phaser atlas JSON; `npm run bake`
- [ ] tools/map: layout.ts district tables (rects, fences, gates, props, water, spawns, bushes) → generate.ts emits Tiled JSON; commit

### Task 2: Core feel ✅ gate: ibis walks the full map at 60 fps with all verbs
- [ ] Preload/World scenes: load atlas+map, collision layer, camera follow, y-sort
- [ ] systems/input.ts: kb+gamepad, remappable action map
- [ ] actors/player.ts: waddle/sprint/squawk/grab/peck/flap-hop (drops item)/swim (water zones)/drag (heavy)/hide (bush zones); unit tests for pure movement rules; commit

### Task 3: Vertical slice — Park Lawn ✅ gate: v1 parity in new stack (8 tasks + gate opens)
- [ ] Port v1 npcBrain→humanBrain.ts + tests (all v1 cases pass); add slip + schedule states + tests
- [ ] humanRuntime.ts (perception build, intents, pond/sea avoidance with tangent slide — port v1 fix)
- [ ] items registry + carry/drag rules + tests; tasks system + flags + tests
- [ ] Park Lawn content: 8 task defs, props wired, groundskeeper-gate opens fence; commit

### Task 4: Systems ✅ gate: refresh mid-game restores state; settings persist
- [ ] save/: adapter + localStorage impl + v2 schema + migration registry + tests
- [ ] settings + Pause + Title + UIOverlay notepad (in-canvas), volume/remap UI; commit

### Task 5: Content fan-out ✅ gate: all 36 tasks completable, finale reachable
- [ ] dogBrain/magpieBrain (pure + tests), kid (human rig variant), seagulls
- [ ] schedule.ts clock + slots + tests; archetype schedule tables
- [ ] District content: cafe (8), market (8), beach (8), oval finale (4-step); gates wired in district order; commit per district

### Task 6: Audio & polish ✅ gate: every interaction has SFX; ambience per district
- [ ] systems/audio.ts: WebAudio synth (port v1 + new: splash/slip/dog bark/magpie warble/crowd), district ambience loops, volume buses; commit

### Task 7: Release ✅ gate: `npm run build` zip playable from dist/; full E2E pass
- [ ] Balancing pass (chase speeds, notice radii per archetype)
- [ ] Performance: actor sleep when off-camera, atlas ≤4, frame budget check
- [ ] Full preview-browser E2E: new game → all districts → finale → credits → save/reload; multi-agent review workflow on final code; fix confirmed findings; tag v2.0.0
```

## Self-review notes
- Spec coverage: §3 map→Task 1/2, §4 verbs→Task 2, §5 actors→Task 3/5,
  §6 content→Task 3/5, §7 architecture/save→Task 0/4, §8 testing→every task
  gate, §9 phases→Tasks 0-7, §10 risks→vertical-slice gate at Task 3. Playwright
  deferred (documented above) — preview-browser E2E covers the same flows.
- No placeholder steps; contracts section pins shared types/naming.
