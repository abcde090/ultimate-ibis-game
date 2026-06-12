# Bin Chicken 🦩🗑️

**An Ibis Mischief Game.** It is a lovely morning in Maggee Bay Reserve, and
you are a horrible ibis.

In the spirit of *Untitled Goose Game*: waddle through a seaside Australian
park causing finely-curated chaos. Five districts — the Park Lawn, the Cafe
Strip, the Market Stalls, the Foreshore, and the Cricket Oval — each with a
to-do list of mischief. Finish a district's list and the next gate opens.
Finish them all and one prize remains: **the Golden Chip**.

## Play

```bash
npm install
npm run bake     # generate atlas + map (committed output, only needed after art/layout changes)
npm run dev      # http://localhost:8124
```

Production build (itch.io-ready zip):

```bash
npm run build    # → dist/ (relative paths, drop onto any static host)
```

### Controls (remappable in-game)

| Input | Action |
|---|---|
| WASD / Arrows / left stick | Waddle |
| Shift / RT | Sprint — outruns humans, **not dogs** |
| Space / A | Squawk (hold for a long blast — scatters seagulls) |
| E / B | Grab · drop · peck bins · drag heavy things |
| F / Y | Flap-hop fences — **drops whatever you're carrying** |
| Esc / Start | Pause, settings, volumes |

### Field notes from one bin chicken to another

- **Humans never enter water.** The pond and the sea are your stash.
- Dogs are faster than you and swim — but won't follow into the deep.
- Bushes break line of sight. Stand still and you vanish.
- The market magpie steals whatever you're carrying. It happens to everyone.
- Humans reclaim stolen goods and put them back. Steal smarter.
- Something dropped in a hurrying human's path is a banana peel by another name.

## Development

Phaser 3 + TypeScript + Vite. Every sprite is generated from TS SVG-builders
and baked into a texture atlas; the world map is generated Tiled JSON; every
sound is synthesised WebAudio — zero licensed assets.

```bash
npm test         # vitest — pure logic: brains, tasks, items, save, layout
npm run check    # tsc strict
npm run bake     # tools/atlas + tools/map → public/assets
npx tsx tools/atlas/sheet.ts ibis/ 3 /tmp/sheet.png   # art contact sheets
```

```
src/
├── scenes/        Boot → Preload → Title → World (+UIOverlay, Pause)
├── actors/        player, humans, dogs, magpie, seagulls
│   └── brain/     pure decision logic (unit tested)
├── items/         pure item rules + Phaser item manager
├── systems/       tasks, flags, mischief glue, save (versioned), settings,
│                  input (kb+gamepad, remap), synthesised audio
└── world/         layout data (pure), water rules, sprite metadata
tools/             atlas baker, map generator, contact-sheet review tool
test/              68 vitest tests
docs/superpowers/  design specs and implementation plan
```

Save data is versioned and sanitised on load; settings persist separately.
A debug hook (`window.__game`, `window.__step`) drives headless E2E.

The v1 vanilla-JS prototype lives at git tag `v1-vanilla`.
