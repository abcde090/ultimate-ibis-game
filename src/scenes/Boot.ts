import Phaser from 'phaser';
import { GAME_VERSION } from '../main';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.add
      .text(640, 360, `BIN CHICKEN\nv${GAME_VERSION}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '48px',
        color: '#fdf6e3',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
