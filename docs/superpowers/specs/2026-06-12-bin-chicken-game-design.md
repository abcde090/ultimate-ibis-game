# Bin Chicken — Design Doc

**Date:** 2026-06-12
**Status:** Approved (autonomous session — decisions documented in lieu of interactive review)

## Concept

A browser game in the spirit of *Untitled Goose Game*, starring an Australian
White Ibis ("bin chicken"). The player waddles around a sunny Australian park
causing mischief, working through a to-do list. Humans react: they shoo the
ibis, reclaim stolen items, and right knocked-over bins. Completing every task
unlocks a final heist — steal the Golden Chip and carry it home to the nest.

## Goals / Non-Goals

**Goals**
- Playable in any modern browser from a static file server, zero dependencies.
- Recognisable ibis silhouette (white body, black bald head, long curved beak).
- The UGG core loop: sandbox + to-do list + reactive NPCs + honk button.
- Pure game-logic modules testable in Node (`node --test`).

**Non-Goals**
- Mobile/touch controls, save games, multiple levels, pathfinding around
  obstacles (NPCs walk straight lines; the park layout keeps lanes open).

## Controls

| Input | Action |
|---|---|
| WASD / Arrow keys | Waddle |
| Shift (hold) | Sprint |
| Space | Squawk (honk) — startles nearby humans |
| E | Grab / drop with beak (also pecks bins over) |

## World

One park scene (1600×1100 world units, 960×600 viewport, camera follows
player). Zones: picnic lawn with table, BBQ area, pond (humans refuse to
enter — the safe stash), cafe kiosk, bins, gum trees, cricket pitch strip,
and the ibis nest in a corner.

## Entities

- **Ibis (player):** velocity-based movement, facing flips left/right,
  carries one item at beak tip. Slowed in pond. 2.5D billboard sprites,
  y-sorted, drawn procedurally on canvas.
- **Items:** hot chips ×3, sausage, phone, thong (flip-flop), trash (spawns
  from knocked bins), golden chip (final). Fields: kind, pos, holder, owner,
  home, inPond.
- **NPCs:** Picnicker (owns chips, phone... no — phone belongs to Cafe
  Customer), BBQ Dad (owns sausage), Groundskeeper (patrols, rights bins,
  shoos), Cafe Customer (owns phone). State machine:
  `idle/patrol → startled → chase → retrieve → return → idle`.
  NPCs chase when the ibis holds their item within notice radius or invades
  personal space; on catch, the ibis drops the item and the NPC carries it
  back to its home spot. NPCs never enter the pond.
- **Bins ×3:** upright/knocked. Pecking knocks one over and spills trash.
  Groundskeeper walks over and rights it after a delay.

## Tasks (to-do list)

1. Squawk
2. Steal a hot chip from the picnic
3. Knock over a bin
4. Go full bin chicken — pull some trash from a bin
5. Steal the snag off the barbie
6. Drop the phone in the pond
7. Get the groundskeeper to chase you
8. Squawk at every human (each of the 4 NPCs)

Completing all 8 reveals the final task: **Steal the Golden Chip from the
cafe and bring it to your nest** → win screen.

## Architecture

```
index.html, styles.css
src/main.js              bootstrap + game loop (fixed-ish dt, rAF)
src/engine/input.js      keyboard state
src/engine/audio.js      WebAudio-synthesised SFX (squawk, splash, clang)
src/engine/camera.js     follow-cam with world clamping
src/engine/collision.js  pure: circle/circle, circle/rect resolve   [tested]
src/world/level.js       pure data: layout, obstacles, zones        [tested]
src/world/render.js      ground/props drawing
src/entities/ibis.js     player update
src/entities/npcBrain.js pure NPC state transitions                 [tested]
src/entities/npc.js      NPC update (wires brain to world)
src/entities/items.js    item logic (grab/drop/pond)                [tested]
src/entities/sprites.js  procedural character/prop drawing
src/game/tasks.js        pure task definitions + checks             [tested]
src/game/state.js        central mutable-by-design game state
src/ui/hud.js            to-do notepad, prompts, bubbles, win screen
```

Rendering/audio/input are browser-only; everything marked `[tested]` is
DOM-free and covered by `node --test` unit tests.

**Note on immutability:** per-frame entity state (positions, timers) is
mutated in place inside the game loop — standard practice for 60 fps canvas
games, where allocating new entity objects every frame causes GC stutter.
Pure logic modules (brain transitions, task checks, collision math) take
inputs and return values without side effects.

## Error handling

- Audio context creation wrapped — game runs silently if WebAudio is
  unavailable; context resumes on first user gesture (autoplay policy).
- Canvas 2D context checked at boot with a visible failure message.
- Task checks are defensive against missing entities.

## Testing

`npm test` → `node --test test/` covering collision math, NPC brain
transitions, item grab/drop/pond rules, and task completion logic.
Manual browser verification for rendering/input/audio.
