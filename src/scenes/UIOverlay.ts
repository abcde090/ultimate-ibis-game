import Phaser from 'phaser';

// Camera-independent UI layer. Phase 2: controls hint + dev FPS readout.
// The to-do notepad and menus arrive with the systems phase.
export class UIOverlayScene extends Phaser.Scene {
  private fpsText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('UIOverlay');
  }

  create(): void {
    const hint = this.add
      .text(
        640, 700,
        'WASD waddle    Shift sprint    Space squawk    E grab    F flap-hop',
        {
          fontFamily: 'Verdana, sans-serif',
          fontSize: '13px',
          color: '#f0ead2',
          backgroundColor: 'rgba(20,30,20,0.65)',
          padding: { x: 12, y: 6 },
        },
      )
      .setOrigin(0.5, 1);
    hint.setScrollFactor(0);

    if (import.meta.env.DEV) {
      this.fpsText = this.add
        .text(1268, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9f9' })
        .setOrigin(1, 0)
        .setScrollFactor(0);
    }
  }

  override update(): void {
    this.fpsText?.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
