# Bin Chicken v2 — Commercial Release Design

**Date:** 2026-06-12
**Status:** Approved (design Q&A 2026-06-12: web-first / Phaser 3 + TS + Vite / flat-vector art / one seamless gated map)
**Supersedes:** [2026-06-12-bin-chicken-game-design.md](./2026-06-12-bin-chicken-game-design.md) (v1 vanilla prototype, tagged `v1-vanilla`)

## 1. Vision

A commercial web-first mischief sandbox in the spirit of *Untitled Goose Game*,
starring an Australian White Ibis in **Maggee Bay Reserve**, a beachside park
precinct. Five connected districts, each with a to-do list of mischief;
finishing a district's gate tasks opens the next, ending in the Golden Chip
heist. 30–60 minutes of polished content.

**Ship targets:** itch.io and CrazyGames-class web portals first; architecture
keeps a Tauri/Electron Steam wrap open (no browser-only APIs in game logic,
input/save/audio behind adapters).

**Pillars**
1. *Mischief loop* — to-do lists, reactive humans, sandbox solutions.
2. *The bin chicken fantasy* — bins, theft, squawking, Australian humour.
3. *A living place* — NPC schedules and ambient life make theft windows.

**Quality bar:** 60 fps on a mid-range laptop; no asset we don't own;
settings/save/pause/menus at parity with small commercial indie releases.

## 2. Tech stack

- **Engine:** Phaser 3 (Arcade physics, tilemaps, atlases, particles, camera,
  scale manager, gamepad).
- **Language/build:** TypeScript strict, Vite, ESLint + Prettier.
- **Tests:** vitest (pure logic), Playwright (smoke E2E vs the built game).
- **Asset pipeline (owned, original):** sprites authored as SVG source files,
  baked to PNG texture atlases + JSON by a build script (`tools/atlas/`);
  the world map generated as standard **Tiled JSON** by a deterministic
  script (`tools/map/`) so it stays hand-tunable data and remains openable
  in the Tiled editor.
- **Audio:** original synthesized SFX rendered to files at build time +
  per-district ambient loops. Stretch: reactive piano layer whose intensity
  follows chase state; fallback is static loops. All audio original.

## 3. World

One seamless map, **4800×3200 px** (150×100 tiles @ 32 px), camera-follow
with district-based culling. Tiled layers: `ground`, `paths`, `water`,
`props`, `collision`, `zones` (districts, gates, spawn points, task triggers).

| District | Theme | Gate to next (diegetic) |
|---|---|---|
| Park Lawn (start) | v1 content rebuilt: picnic, BBQ, pond, bins, shed, nest | Groundskeeper's gate — lure him away so it's left open |
| Cafe Strip | cafe, bakery, fish & chips, busker, brunch tables | Delivery driver chases you; truck moves off the laneway |
| Market Stalls | fruit, fishmonger, balloons, samples, scarves | Boardwalk latch — steal it mid-vendor-chase |
| Foreshore & Beach | sand, sea, lifeguard, sunbathers, sandcastles, dogs | Finale unlocks when all gate tasks are done |
| Cricket Oval | clubhouse, sausage sizzle, match in progress | Golden Chip → nest → credits |

The pond/sea rule carries over: **humans never enter water** (dogs do).
The nest is the home base and final delivery point.

## 4. Player verbs

| Verb | Input (default) | Notes |
|---|---|---|
| Waddle / sprint | WASD/arrows + Shift | Sprint outruns humans, not dogs |
| Squawk / long squawk | Space tap / hold | Startles, breaks NPC actions; long blast scatters seagulls |
| Grab / drop / peck | E | Carry one item; peck knocks bins, pops balloons |
| Flap-hop | F | Crosses fences/gaps; **drops your item** (risk/reward) |
| Swim | automatic in water | Slower; humans give up, dogs follow |
| Drag | hold E on heavy item | Eskies, towels, signs — slow, can't sprint |
| Hide | walk into bush | Breaks line-of-sight; chases end after a beat |

Gamepad equivalents mapped from day one; all bindings remappable.

## 5. Actors

**Humans (12–16 archetypes)** run the v1 pure brain (ported to TS) extended
with: `schedule` (time-slot waypoints — barista works, surfer naps, vendor
restocks), `slip` (comedy fall on dropped slippery items), and per-archetype
chase/notice tuning. Theft windows emerge from schedules.

**New animals**
- **Dog** (per-district, some off-leash): faster than the ibis, swims, can't
  grab items — it chases *you*, forcing route changes. Leashed dogs activate
  when their leash is untied (a task).
- **Kids**: chase the ibis for fun (inverse fear), pick up loose items.
- **Magpie** (rival): swoops and steals your carried item, perches on a known
  roost; recover it by squawking the magpie off its perch.
- **Seagulls**: ambient flock; scatters on long squawk; mobs dropped chips.

## 6. Task content (~40 + finale)

Representative lists (final wording tuned during content phase; counts fixed):

- **Park Lawn (8):** squawk; steal a hot chip; knock over a bin; pull trash
  out; steal the snag off the barbie; drop the phone in the pond; get the
  groundskeeper to chase you; sneak into the shed. *Gate:* leave the gate
  unguarded.
- **Cafe Strip (8):** steal a croissant; spill a flat white; drag the OPEN
  sign away; sneak into the storeroom; steal the busker's coin; make the
  waiter slip on a chip; untie a dog's leash; photobomb the influencer's
  brunch shot. *Gate:* move the delivery truck.
- **Market Stalls (8):** steal a mango; swap two price signs; steal the
  fishmonger's fish; pop a balloon; wear a stolen scarf; raid the sample
  tray; get chased through three stalls; drop a fish in the guitar case.
  *Gate:* steal the boardwalk latch.
- **Foreshore & Beach (8):** steal a chip in front of the seagulls; trample
  a sandcastle; steal the lifeguard's whistle; drag a towel into the sea;
  steal the sunbather's sunscreen; steal the kid's bucket; escape a dog by
  swimming; squawk at everyone on the beach.
- **Cricket Oval finale (4-step heist):** infiltrate the sausage sizzle;
  steal the trophy-case key off the club president; carry the Golden Chip
  across the oval mid-match while everyone gives chase; deliver it to the
  nest → credits.

## 7. Architecture

```
src/
├── main.ts                 Phaser boot config
├── scenes/                 Boot, Preload, Title, World, UIOverlay,
│                           Pause, Settings, Credits
├── world/                  tilemap load, districts, gates, props registry
├── actors/                 player state machine; npc runtime; brain/ (pure,
│                           ported from v1); dog, kid, magpie, seagull
├── items/                  carryables, draggables, containers
├── systems/                tasks, save, audio, input (kb/gamepad/remap),
│                           settings, schedule clock, locale
└── ui/                     notepad, prompts, bubbles, menus
tools/
├── atlas/                  SVG → atlas baker
├── map/                    Tiled JSON generator
└── sfx/                    audio render scripts
test/                       vitest unit + Playwright smoke
```

Pure logic (brain, tasks, schedules, save migration, geometry) stays
DOM/Phaser-free for unit testing — the proven v1 pattern.

**Save system:** versioned JSON (`{version, tasksDone, gatesOpen, settings,
stats, position}`) in localStorage behind a storage adapter (Steam wrap
swaps to file). Autosave on task completion + 30 s interval; migration
registry from version N→N+1.

**Settings/accessibility:** master/music/SFX volume, remappable keys,
gamepad, reduced-motion (no screen shake/flash), UI scale, locale-ready
string table (en-AU shipped).

## 8. Testing & performance

- vitest: brain transitions, schedule resolution, task graph/gating, save
  migrations, geometry, magpie/dog steal-chase rules. 80%+ on pure modules.
- Playwright smoke: boot → title → start → complete first task via debug
  hook → save → reload → state restored.
- Performance budget in CI smoke: median frame < 16 ms over a scripted
  60 s run; atlas count ≤ 4; off-screen actors culled/sleeping.

## 9. Delivery phases (each lands playable)

0. **Scaffold** — Vite/Phaser/TS/vitest/Playwright/ESLint, CI scripts.
1. **Pipelines** — atlas baker + map generator + SFX renderer, style-lock
   sheet (ibis cycles, 3 humans, core props).
2. **Core feel** — map loads, camera, player controller (all verbs), debug
   district.
3. **Vertical slice gate** — Park Lawn fully playable in new stack: NPC
   port, items, chase loop, 8 tasks, gate opens. *Go/no-go checkpoint.*
4. **Systems** — save/load, settings, pause, title, input remap.
5. **Content fan-out** — districts 2–5, new actors (dog/kid/magpie),
   schedules.
6. **Audio & polish** — SFX set, ambience, (stretch) reactive piano, juice.
7. **Release** — balancing, performance pass, E2E green, itch.io zip + CI,
   portal-SDK adapter seam documented.

## 10. Risks & mitigations

- **Art volume** (biggest): mitigated by pipeline-first (Phase 1) and the
  Phase 3 vertical-slice checkpoint before content fan-out.
- **Reactive music** is a stretch goal; static loops are the committed
  fallback.
- **Phaser physics fit**: Arcade (AABB/circle) suffices — v1 logic already
  circle-based; no Matter.js unless drag interactions demand it.
- **Scope**: task list counts are fixed at 36+finale; new ideas go to a
  post-launch backlog, not v1.

## 11. Out of scope (v1.0)

Mobile/touch, Steam packaging (kept unblocked, not built), portal SDK
integration (seam only), localization beyond en-AU, analytics, achievements.
