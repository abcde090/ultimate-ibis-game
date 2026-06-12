import Phaser from 'phaser';
import { ANIM_FPS, ANIM_ONESHOT } from '../world/spriteMeta';

// Loads the baked assets and registers every animation by scanning atlas
// frame names of the form `<actor>/<anim>/<index>`.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const bar = this.add.rectangle(640, 380, 10, 10, 0xfdf6e3);
    this.load.on('progress', (p: number) => bar.setSize(400 * p, 10));

    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    this.load.image('tiles', 'assets/tiles.png');
    this.load.tilemapTiledJSON('map', 'assets/map.json');
  }

  create(): void {
    this.registerAnims();
    this.scene.start('World');
  }

  private registerAnims(): void {
    const frameNames = this.textures.get('atlas').getFrameNames();
    const groups = new Map<string, string[]>();
    for (const name of frameNames) {
      const parts = name.split('/');
      if (parts.length !== 3) continue; // props/items are single frames
      const key = `${parts[0]}/${parts[1]}`;
      const list = groups.get(key) ?? [];
      list.push(name);
      groups.set(key, list);
    }
    for (const [key, frames] of groups) {
      frames.sort((a, b) => Number(a.split('/')[2]) - Number(b.split('/')[2]));
      const animName = key.split('/')[1] ?? '';
      const oneShot = ANIM_ONESHOT.has(animName);
      this.anims.create({
        key,
        frames: frames.map((f) => ({ key: 'atlas', frame: f })),
        frameRate: ANIM_FPS[animName] ?? 8,
        repeat: oneShot ? 0 : -1,
        yoyo: !oneShot && frames.length === 2,
      });
    }
  }
}
