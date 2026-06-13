import Phaser from 'phaser';
import { ANIM_FPS, ANIM_ONESHOT } from '../world/spriteMeta';

// Assets baked into a single HTML artifact: data-URI PNGs + JSON objects,
// stamped onto `window` by the artifact wrapper. When present, Preload
// builds textures from them directly (no network, no XHR — works from
// file:// and inside a sandboxed artifact iframe).
export interface InlineAssets {
  atlasPng: string;   // data:image/png;base64,...
  tilesPng: string;
  atlasJson: object;  // Phaser atlas-hash JSON
  mapJson: object;    // Tiled map JSON
}

function inlineAssets(): InlineAssets | undefined {
  return (window as unknown as { __BIN_CHICKEN_ASSETS__?: InlineAssets })
    .__BIN_CHICKEN_ASSETS__;
}

// Loads the baked assets and registers every animation by scanning atlas
// frame names of the form `<actor>/<anim>/<index>`.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    if (inlineAssets()) return; // textures are built from inlined data in create()

    const bar = this.add.rectangle(640, 380, 10, 10, 0xfdf6e3);
    this.load.on('progress', (p: number) => bar.setSize(400 * p, 10));

    this.load.atlas('atlas', 'assets/atlas.png', 'assets/atlas.json');
    this.load.image('tiles', 'assets/tiles.png');
    this.load.tilemapTiledJSON('map', 'assets/map.json');
  }

  create(): void {
    const inlined = inlineAssets();
    if (inlined) {
      void this.buildInlineTextures(inlined)
        .then(() => {
          this.registerAnims();
          this.scene.start('Title');
        })
        .catch((err: unknown) => {
          // A corrupt inlined data-URI would otherwise hang on a black
          // screen — surface it instead.
          console.error('Bin Chicken: inline assets failed to decode', err);
          this.add
            .text(640, 360, 'Could not decode the game’s built-in art.\nThe file may be corrupted.', {
              fontFamily: 'Georgia, serif', fontSize: '22px', color: '#fdf6e3', align: 'center',
            })
            .setOrigin(0.5);
        });
      return;
    }
    this.registerAnims();
    this.scene.start('Title');
  }

  private async buildInlineTextures(assets: InlineAssets): Promise<void> {
    const [atlasImg, tilesImg] = await Promise.all([
      loadImage(assets.atlasPng),
      loadImage(assets.tilesPng),
    ]);
    this.textures.addAtlas('atlas', atlasImg, assets.atlasJson as Record<string, unknown>);
    this.textures.addImage('tiles', tilesImg);
    this.cache.tilemap.add('map', {
      format: Phaser.Tilemaps.Formats.TILED_JSON,
      data: assets.mapJson,
    });
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = (): void => resolve(img);
    img.onerror = (): void => reject(new Error('inline image failed to decode'));
    img.src = src;
  });
}
