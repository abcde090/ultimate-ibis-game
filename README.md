# Bin Chicken 🦩🗑️

**An Ibis Mischief Game** — in the spirit of *Untitled Goose Game*, starring
Australia's most majestic menace: the Australian White Ibis.

It is a lovely morning in the park, and you are a horrible ibis. Waddle around
a sunny Australian park, squawk at the locals, raid the bins, steal a snag off
the barbie, and work your way through the to-do list. Finish every job to
unlock the final heist: the **Golden Chip**.

## Play

Any static file server works — no build step, no dependencies:

```bash
npm start            # serves on http://localhost:8123
# or: python3 -m http.server 8123
```

### Controls

| Key | Action |
|---|---|
| WASD / Arrow keys | Waddle |
| Shift (hold) | Sprint |
| Space | Squawk |
| E | Grab / drop / peck bins over |

### Tips from one bin chicken to another

- Humans chase you when you nick their stuff — sprint, or wade into the pond.
  **Humans never enter the pond.** Anything you stash in there is yours.
- Squawking startles people mid-chase. Use it irresponsibly.
- The groundskeeper rights knocked-over bins. Knock them over again.

## Development

Vanilla JS ES modules + canvas, procedurally drawn art, WebAudio-synthesised
squawks. Pure game logic (collision math, NPC state machine, item rules,
task progression) is DOM-free and unit tested:

```bash
npm test             # node --test, 59 tests
```

Design doc: [docs/superpowers/specs/2026-06-12-bin-chicken-game-design.md](docs/superpowers/specs/2026-06-12-bin-chicken-game-design.md)

```
src/
├── main.js            bootstrap + game loop
├── engine/            input, audio, camera, collision (pure), polyfills
├── world/             level data (pure), ground/prop rendering
├── entities/          ibis, npc runtime, npcBrain (pure), items (pure), sprites
├── game/              state factory, tasks (pure)
└── ui/                to-do notepad HUD, win screen
```
