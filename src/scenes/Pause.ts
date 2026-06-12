import Phaser from 'phaser';
import { SettingsSystem } from '../systems/settings';
import { SaveSystem } from '../systems/save';

// Pause menu: resume, volumes, reduced motion, restart, quit to title.
export class PauseScene extends Phaser.Scene {
  private settings!: SettingsSystem;
  private rows: Phaser.GameObjects.Text[] = [];
  private confirmRestart = false;

  constructor() {
    super('Pause');
  }

  init(data: { settings: SettingsSystem }): void {
    this.settings = data.settings;
  }

  create(): void {
    this.confirmRestart = false;
    this.add.rectangle(640, 360, 1280, 720, 0x0f190f, 0.82);
    this.add
      .text(640, 150, 'PAUSED', {
        fontFamily: 'Georgia, serif', fontSize: '52px', fontStyle: 'bold', color: '#fdf6e3',
      })
      .setOrigin(0.5);

    this.rows = [];
    this.addRow(230, () => 'Resume', () => this.resume());
    this.addRow(290, () => `Master volume  ◂ ${pct(this.settings.current.masterVolume)} ▸`, (dir) => {
      this.settings.current.masterVolume = step(this.settings.current.masterVolume, dir);
      this.settings.save();
    });
    this.addRow(340, () => `Sound effects  ◂ ${pct(this.settings.current.sfxVolume)} ▸`, (dir) => {
      this.settings.current.sfxVolume = step(this.settings.current.sfxVolume, dir);
      this.settings.save();
    });
    this.addRow(390, () => `Ambience  ◂ ${pct(this.settings.current.ambienceVolume)} ▸`, (dir) => {
      this.settings.current.ambienceVolume = step(this.settings.current.ambienceVolume, dir);
      this.settings.save();
    });
    this.addRow(440, () => `Reduced motion: ${this.settings.current.reducedMotion ? 'ON' : 'OFF'}`, () => {
      this.settings.current.reducedMotion = !this.settings.current.reducedMotion;
      this.settings.save();
    });
    this.addRow(510, () => (this.confirmRestart ? 'Really restart? (click again)' : 'Restart game'), () => {
      if (!this.confirmRestart) {
        this.confirmRestart = true;
        this.refreshRows();
        return;
      }
      new SaveSystem().clear();
      this.scene.stop('UIOverlay');
      this.scene.stop('World');
      this.scene.stop();
      this.scene.start('World', { continue: false });
    });
    this.addRow(560, () => 'Quit to title', () => {
      this.scene.stop('UIOverlay');
      this.scene.stop('World');
      this.scene.stop();
      this.scene.start('Title');
    });

    this.add
      .text(640, 640, 'Esc to resume — volume rows: click left/right half to adjust', {
        fontFamily: 'Verdana, sans-serif', fontSize: '12px', color: '#9aa890',
      })
      .setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.resume());
    this.refreshRows();
  }

  private addRow(y: number, label: () => string, onClick: (dir: 1 | -1) => void): void {
    const text = this.add
      .text(640, y, label(), {
        fontFamily: 'Georgia, serif', fontSize: '22px', color: '#f0ead2',
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.setData('label', label);
    text.on('pointerover', () => text.setColor('#ffd98a'));
    text.on('pointerout', () => text.setColor('#f0ead2'));
    text.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dir: 1 | -1 = pointer.x >= text.x ? 1 : -1;
      onClick(dir);
      this.refreshRows();
    });
    this.rows.push(text);
  }

  private refreshRows(): void {
    for (const row of this.rows) {
      const label = row.getData('label') as () => string;
      row.setText(label());
    }
  }

  private resume(): void {
    this.scene.resume('World');
    this.scene.stop();
  }
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function step(v: number, dir: 1 | -1): number {
  return Math.min(1, Math.max(0, Math.round((v + dir * 0.1) * 10) / 10));
}
