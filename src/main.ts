import Phaser from 'phaser';
import { BootScene } from './scenes/Boot';

export const GAME_VERSION = '2.0.0-dev';
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

new Phaser.Game({
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
  scene: [BootScene],
});
