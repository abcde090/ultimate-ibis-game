import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';
import { PreloadScene } from './scenes/Preload';
import { WorldScene } from './scenes/World';
import { TitleScene } from './scenes/Title';
import { PauseScene } from './scenes/Pause';
import { UIOverlayScene } from './scenes/UIOverlay';

export const GAME_VERSION = '2.1.2';
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: '#74a644',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: { gamepad: true, activePointers: 3 }, // joystick + two action buttons at once
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, UIOverlayScene, PauseScene],
});

// Debug/E2E hooks, dev builds only: __phaserGame for inspection and
// __step to advance the loop manually when a hidden tab throttles rAF.
if (import.meta.env.DEV) {
  (window as unknown as { __phaserGame?: Phaser.Game }).__phaserGame = game;
  let fakeClock = 0;
  (window as unknown as { __step?: (frames?: number) => void }).__step = (frames = 60) => {
    if (fakeClock === 0) fakeClock = performance.now();
    for (let i = 0; i < frames; i++) {
      fakeClock += 1000 / 60;
      game.loop.step(fakeClock);
    }
  };
}
