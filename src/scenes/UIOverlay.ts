import Phaser from 'phaser';
import type { DistrictId } from '../world/layoutData';
import { tasksFor, type TaskState } from '../systems/tasks';
import { TouchControls } from '../systems/touchControls';
import type { InputSystem } from '../systems/input';
import type { SettingsSystem } from '../systems/settings';

const DISTRICT_TITLES: Record<DistrictId, string> = {
  park: 'Park Lawn',
  cafe: 'Cafe Strip',
  market: 'Market Stalls',
  beach: 'Foreshore',
  oval: 'THE HEIST',
};

// Camera-independent UI: to-do notepad, toasts, hints, win screen.
export class UIOverlayScene extends Phaser.Scene {
  private fpsText: Phaser.GameObjects.Text | null = null;
  private notepad!: Phaser.GameObjects.Container;
  private taskTexts: Phaser.GameObjects.Text[] = [];
  private notepadTitle!: Phaser.GameObjects.Text;
  private toastY = 70;
  private district: DistrictId = 'park';
  private taskState: TaskState | null = null;
  private hint!: Phaser.GameObjects.Text;
  private touchControls!: TouchControls;
  private input2!: InputSystem;
  private settings!: SettingsSystem;
  private won = false;
  private notepadBg!: Phaser.GameObjects.Graphics;
  private notepadRule!: Phaser.GameObjects.Graphics;
  private caret!: Phaser.GameObjects.Text;
  private tasksHidden = false;

  constructor() {
    super('UIOverlay');
  }

  create(): void {
    // Phaser reuses the scene instance on restart, so reset per-run fields
    // here — otherwise a previous win leaves `won` true (hiding the touch
    // controls) and `toastY` drifts.
    this.won = false;
    this.toastY = 70;
    this.district = 'park';
    this.taskState = null;

    this.buildNotepad();
    this.buildHint();

    const world = this.scene.get('World');
    // This scene can be re-created (replay, quit-to-title); drop any listeners
    // a previous incarnation left on the World's emitter or they pile up and
    // fire into destroyed text objects.
    world.events.off('tasks-changed');
    world.events.off('district-changed');
    world.events.off('toast');
    world.events.off('won');
    world.events.on('tasks-changed', (ts: TaskState) => {
      this.taskState = ts;
      this.refreshNotepad();
    });
    world.events.on('district-changed', (d: DistrictId) => {
      this.district = d;
      this.refreshNotepad();
    });
    world.events.on('toast', (text: string) => this.toast(text));
    world.events.on('won', () => this.showWin());

    this.input2 = (world as unknown as { input2: InputSystem }).input2;
    this.settings = (world as unknown as { settings: SettingsSystem }).settings;
    this.tasksHidden = this.settings.current.tasksHidden;
    this.touchControls = new TouchControls(this, this.input2);
    this.applyTasksHidden();

    if (import.meta.env.DEV) {
      this.fpsText = this.add
        .text(1268, 8, '', { fontFamily: 'monospace', fontSize: '12px', color: '#9f9' })
        .setOrigin(1, 0)
        .setScrollFactor(0);
    }
  }

  private buildNotepad(): void {
    this.notepadBg = this.add.graphics();
    this.drawNotepadBg(268, 248);

    this.notepadTitle = this.add.text(16, 12, 'To-Do — Park Lawn', {
      fontFamily: 'Georgia, serif', fontSize: '17px', fontStyle: 'bold', color: '#2b2b2b',
    });
    // Caret toggle (▾ open / ▸ collapsed), top-right of the notepad.
    this.caret = this.add
      .text(244, 11, '▾', { fontFamily: 'Verdana, sans-serif', fontSize: '17px', color: '#2b2b2b' })
      .setOrigin(0.5, 0);

    this.notepadRule = this.add.graphics();
    this.notepadRule.lineStyle(2, 0x2b2b2b, 0.85);
    this.notepadRule.lineBetween(16, 38, 252, 38);

    this.taskTexts = [];
    for (let i = 0; i < 8; i++) {
      this.taskTexts.push(
        this.add.text(18, 48 + i * 24, '', {
          fontFamily: 'Georgia, serif', fontSize: '13.5px', color: '#2b2b2b',
          wordWrap: { width: 234 },
        }),
      );
    }

    // A transparent hit-zone over the title bar toggles the list — easy to
    // tap on a phone (and it sits clear of the joystick / right buttons).
    const toggle = this.add.rectangle(0, 0, 268, 40, 0xffffff, 0).setOrigin(0, 0);
    toggle.setInteractive({ useHandCursor: true });
    toggle.on('pointerdown', () => this.toggleTasks());

    this.notepad = this.add.container(14, 14, [
      this.notepadBg, this.notepadTitle, this.caret, this.notepadRule, ...this.taskTexts, toggle,
    ]);
    this.notepad.setScrollFactor(0).setDepth(100);
    this.notepad.setAngle(-1.2);
    this.refreshNotepad();
  }

  private drawNotepadBg(w: number, h: number): void {
    this.notepadBg.clear();
    this.notepadBg.fillStyle(0xfdf6e3, 0.96);
    this.notepadBg.fillRoundedRect(0, 0, w, h, 8);
    this.notepadBg.lineStyle(2, 0x8a8270, 0.6);
    this.notepadBg.strokeRoundedRect(0, 0, w, h, 8);
  }

  private toggleTasks(): void {
    this.tasksHidden = !this.tasksHidden;
    this.settings.current.tasksHidden = this.tasksHidden;
    this.settings.save();
    this.applyTasksHidden();
  }

  // Collapse to a small "▸ To-Do" tab, or expand to the full list.
  private applyTasksHidden(): void {
    const hidden = this.tasksHidden;
    this.caret.setText(hidden ? '▸' : '▾');
    this.notepadRule.setVisible(!hidden);
    for (const t of this.taskTexts) t.setVisible(!hidden);
    this.drawNotepadBg(hidden ? 132 : 268, hidden ? 40 : 248);
    this.caret.setX(hidden ? 110 : 244);
    this.refreshNotepad();
  }

  private refreshNotepad(): void {
    const tasks = tasksFor(this.district);
    const completed = this.taskState?.completed ?? [];
    const unlocked = this.taskState?.unlockedDistricts ?? ['park'];
    this.notepadTitle.setText(this.tasksHidden ? 'To-Do' : `To-Do — ${DISTRICT_TITLES[this.district]}`);

    if (!unlocked.includes(this.district)) {
      for (const [i, text] of this.taskTexts.entries()) {
        text.setText(i === 0 ? '(You probably shouldn’t be here.)' : '');
        text.setColor('#8a8a7a');
      }
      return;
    }

    for (let i = 0; i < this.taskTexts.length; i++) {
      const task = tasks[i];
      const textObj = this.taskTexts[i]!;
      if (!task) {
        textObj.setText('');
        continue;
      }
      const done = completed.includes(task.id);
      textObj.setText(`${done ? '✓' : '•'} ${task.text}`);
      textObj.setColor(done ? '#9a9a88' : '#2b2b2b');
      textObj.setAlpha(done ? 0.85 : 1);
    }
  }

  private buildHint(): void {
    this.hint = this.add
      .text(640, 712, 'WASD waddle   Shift sprint   Space squawk   E grab/drop/peck/drag   F flap-hop', {
        fontFamily: 'Verdana, sans-serif', fontSize: '12px', color: '#f0ead2',
        backgroundColor: 'rgba(20,30,20,0.65)', padding: { x: 12, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private restartGame(): void {
    this.scene.stop('World');
    this.scene.stop();
    this.scene.start('World', { continue: false });
  }

  private toast(text: string): void {
    const t = this.add
      .text(640, this.toastY, text, {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#fdf6e3',
        backgroundColor: 'rgba(30,42,28,0.88)', padding: { x: 16, y: 7 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setAlpha(0);
    this.toastY += 38;
    this.tweens.add({ targets: t, alpha: 1, y: t.y + 6, duration: 220 });
    this.time.delayedCall(2600, () => {
      this.tweens.add({
        targets: t, alpha: 0, duration: 350,
        onComplete: () => {
          t.destroy();
          this.toastY -= 38;
        },
      });
    });
  }

  private showWin(): void {
    const veil = this.add.rectangle(640, 360, 1280, 720, 0x0f190f, 0.82)
      .setScrollFactor(0).setDepth(300);
    const title = this.add
      .text(640, 270, 'GLORIOUS.', {
        fontFamily: 'Georgia, serif', fontSize: '64px', fontStyle: 'bold', color: '#fdf6e3',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(301);
    const sub = this.add
      .text(640, 360, 'The Golden Chip rests in your nest.\nMaggee Bay will speak of this day in hushed tones.\n\nYou are a truly magnificent bin chicken.', {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#d8c98a', align: 'center',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(301);
    const touchOn = this.input2?.touch.active === true;
    const hint = this.add
      .text(640, 470, touchOn ? 'Tap anywhere to cause more mischief' : 'Press R — or tap — to cause more mischief', {
        fontFamily: 'Verdana, sans-serif', fontSize: '14px', color: '#f0ead2',
      })
      .setOrigin(0.5).setScrollFactor(0).setDepth(301);
    void veil; void title; void sub;

    this.won = true;
    this.touchControls.forceHide(); // no live touch buttons during the win screen
    const restart = (): void => this.restartGame();
    this.input.keyboard?.once('keydown-R', restart);
    // Tap anywhere to replay (touch + mouse) — a beat later so the winning
    // tap/click doesn't immediately restart.
    this.time.delayedCall(500, () => this.input.once('pointerdown', restart));

    const reduced = (this.scene.get('World') as { settings?: { current: { reducedMotion: boolean } } })
      .settings?.current.reducedMotion;
    if (reduced) hint.setAlpha(0.7);
    else this.tweens.add({ targets: hint, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
  }

  override update(): void {
    this.fpsText?.setText(`${Math.round(this.game.loop.actualFps)} fps`);
    // Keep the notepad in sync with the pause-menu toggle.
    if (this.settings && this.settings.current.tasksHidden !== this.tasksHidden) {
      this.tasksHidden = this.settings.current.tasksHidden;
      this.applyTasksHidden();
    }
    const paused = this.scene.isActive('Pause');
    this.touchControls.update({ paused, won: this.won });
    // The keyboard hint is noise on touch; the on-screen buttons are labelled.
    this.hint.setVisible(!(this.input2?.touch.active === true));
  }
}
