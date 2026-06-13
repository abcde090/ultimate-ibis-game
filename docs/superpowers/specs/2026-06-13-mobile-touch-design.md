# Mobile / Touch Support — Design

**Date:** 2026-06-13
**Status:** Approved (autonomous session — Dan: plan then build, no approval gate)

## Goal

Let phones and touchscreens play Bin Chicken with on-screen controls, without
changing the desktop experience or the rest of the game. Works in the web
build, the itch build, and the self-contained artifact.

## What already works (don't rebuild)

- **Rendering**: `Scale.FIT` + `#app { width:100vw; height:100vh }` already
  scales/letterboxes the 1280×720 canvas to any screen.
- **Menus**: Title buttons and Pause rows are Phaser pointer-interactive →
  already tappable. Only the in-game verbs and the win-screen "press R" need a
  touch path.
- **Input seam**: every gameplay read goes through `InputSystem`
  (`axis()`, `isDown(action)`, `justPressed(action)`). Add a touch source
  there and nothing else in the game changes.

## Approach

A **Phaser-native virtual gamepad** drawn in the top UI scene (`UIOverlay`),
feeding a `touch` state object on the existing `InputSystem`. Phaser-native
(not DOM) so it scales with `FIT`, shares the 1280×720 coordinate space, and
behaves identically across web / itch / artifact with no extra assets.

### Controls (in 1280×720 design space, `scrollFactor 0`)

- **Dynamic left-thumb joystick** (left ~45% of screen): base appears where the
  finger lands; thumb drives `axis`. Pushing past ~82% radius = **sprint**
  (parity with holding Shift). Dead zone ~18%.
- **Right-hand action buttons**: **Squawk** (tap = squawk, hold = long squawk),
  **Grab** (E), **Flap** (F).
- **Pause** button, top-right (there is no Esc on a phone).
- **Multitouch**: `activePointers: 3` so joystick + a button work together;
  pointer ownership tracked by `pointer.id`.

### InputSystem changes

Add `touch: { active, axisX, axisY, sprint, squawkDown, pressed:Set<Action> }`.
- `axis()` adds the touch vector to the keyboard vector (clamped).
- `isDown('sprint'|'squawk')` OR-s the touch equivalents.
- `justPressed(a)` OR-s `touch.pressed.has(a)`.
- `endFrame()` also clears `touch.pressed`.
- A physical `keydown` sets `touch.active = false` (hide); a touch `pointerdown`
  sets it `true` (show) — so **hybrid laptops** adapt to whichever was last used.

### Detection

`touch.active` starts true when `navigator.maxTouchPoints > 0 ||
matchMedia('(pointer: coarse)')`. Flips off on first physical key, on with first
finger. Controls hide while paused or after winning, and never appear on Title
(UIOverlay only exists in-game).

### Pure logic (unit tested)

`stickVector(dx, dy, radius)` → `{ x, y, sprint }` with dead-zone, magnitude
clamp to 1, and sprint threshold. The only math worth isolating; tested.

### Page hygiene

`touch-action: none; user-select: none` on `#app`/canvas (index.html + the
artifact wrapper) so dragging the joystick doesn't scroll/zoom the page.
Portrait phones get a small "rotate to landscape" hint (16:9 game).

## Files

- `src/systems/stickMath.ts` (+ test) — pure joystick math.
- `src/systems/input.ts` — add `touch` state, merge into axis/isDown/justPressed.
- `src/systems/touchControls.ts` — the virtual gamepad (new).
- `src/scenes/UIOverlay.ts` — create/update it; hide keyboard hint + tap-to-
  restart on win in touch mode.
- `src/main.ts` — `activePointers: 3`.
- `index.html`, `tools/artifact/assemble.ts` — `touch-action: none` CSS.

## Out of scope

Native fullscreen (inconsistent on iOS), haptics, on-screen keyboard remapping,
analog-speed movement (digital full-speed matches the keyboard feel).
