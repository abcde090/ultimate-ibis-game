// Ambient seagull flock: loiters on the beach, scatters from a long squawk,
// drifts back a while later.

import Phaser from 'phaser';
import { SEAGULLS } from '../world/layoutData';

const SCATTER_RADIUS = 320;
const RETURN_AFTER = 24;

export class SeagullFlock {
  private birds: Array<{
    sprite: Phaser.GameObjects.Sprite;
    homeX: number;
    homeY: number;
    flying: boolean;
  }> = [];
  private returnIn = 0;
  scatteredEvent = false;

  constructor(scene: Phaser.Scene) {
    for (const spot of SEAGULLS) {
      const sprite = scene.add
        .sprite(spot.x, spot.y, 'atlas', 'seagull/stand/0')
        .setOrigin(0.5, 1)
        .setDepth(spot.y);
      sprite.play({ key: 'seagull/stand', delay: (spot.x % 7) * 100 });
      this.birds.push({ sprite, homeX: spot.x, homeY: spot.y, flying: false });
    }
  }

  // Long squawk nearby sends them all up.
  tryScatter(fromX: number, fromY: number): boolean {
    const near = this.birds.some(
      (b) => !b.flying && Phaser.Math.Distance.Between(fromX, fromY, b.sprite.x, b.sprite.y) < SCATTER_RADIUS,
    );
    if (!near) return false;
    this.scatteredEvent = true;
    this.returnIn = RETURN_AFTER;
    for (const [i, bird] of this.birds.entries()) {
      if (bird.flying) continue;
      bird.flying = true;
      bird.sprite.play('seagull/fly');
      const scene = bird.sprite.scene;
      scene.tweens.add({
        targets: bird.sprite,
        x: bird.homeX + (i % 2 ? 700 : -700) + i * 60,
        y: bird.homeY - 500 - i * 40,
        alpha: 0,
        duration: 2200 + i * 150,
        ease: 'Sine.easeIn',
      });
    }
    return true;
  }

  update(dt: number): void {
    if (this.returnIn > 0) {
      this.returnIn -= dt;
      if (this.returnIn <= 0) {
        for (const bird of this.birds) {
          bird.flying = false;
          bird.sprite.setPosition(bird.homeX, bird.homeY).setAlpha(1);
          bird.sprite.play('seagull/stand');
        }
      }
    }
  }
}
