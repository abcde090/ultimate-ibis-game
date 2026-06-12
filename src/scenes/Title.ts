import Phaser from 'phaser';
import { GAME_VERSION } from '../main';
import { SaveSystem } from '../systems/save';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    this.add.rectangle(640, 360, 1280, 720, 0x10180f);
    this.add.rectangle(640, 360, 1240, 680, 0x74a644).setStrokeStyle(4, 0x3d5a2a);

    // A parade of ibises.
    for (let i = 0; i < 5; i++) {
      const ibis = this.add.sprite(280 + i * 180, 560, 'atlas', 'ibis/waddle/0');
      ibis.setOrigin(0.5, 1).setScale(1.15);
      ibis.play({ key: 'ibis/waddle', frameRate: 8 + i });
      ibis.setFlipX(i % 2 === 1);
    }

    this.add
      .text(640, 200, 'BIN CHICKEN', {
        fontFamily: 'Georgia, serif', fontSize: '96px', fontStyle: 'bold',
        color: '#fdf6e3', stroke: '#2b2b2b', strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(640, 272, '— An Ibis Mischief Game —', {
        fontFamily: 'Georgia, serif', fontSize: '24px', fontStyle: 'italic', color: '#2e3d20',
      })
      .setOrigin(0.5);
    this.add
      .text(640, 330, 'It is a lovely morning in Maggee Bay Reserve,\nand you are a horrible ibis.', {
        fontFamily: 'Georgia, serif', fontSize: '19px', color: '#fdf6e3', align: 'center',
      })
      .setOrigin(0.5);

    const saves = new SaveSystem();
    const hasSave = saves.load() !== null;

    this.makeButton(640, hasSave ? 415 : 440, 'Begin the Mischief', () => {
      saves.clear();
      this.startGame(false);
    });
    if (hasSave) {
      this.makeButton(640, 470, 'Continue', () => this.startGame(true));
    }

    this.add
      .text(640, 690, `v${GAME_VERSION} — made with feathers and spite`, {
        fontFamily: 'Verdana, sans-serif', fontSize: '11px', color: '#2e3d20',
      })
      .setOrigin(0.5);

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame(hasSave));
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame(hasSave));
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff',
        backgroundColor: '#e0533d', padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setScale(1.06));
    text.on('pointerout', () => text.setScale(1));
    text.on('pointerdown', onClick);
  }

  private startGame(continueGame: boolean): void {
    this.scene.start('World', { continue: continueGame });
  }
}
