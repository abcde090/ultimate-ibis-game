// One-off: place named atlas frames side by side at a big scale so the
// silhouettes can be compared. Usage:
//   npx tsx tools/atlas/compare.ts ibis/idle/0 human-picnicker/idle/0 [scale] [out]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const scale = Number(args.find((a) => /^\d+$/.test(a)) ?? 5);
const out = args.find((a) => a.endsWith('.png')) ?? '/tmp/compare.png';
const names = args.filter((a) => !/^\d+$/.test(a) && !a.endsWith('.png'));

const assets = path.resolve(import.meta.dirname, '../../public/assets');
const json = JSON.parse(await readFile(path.join(assets, 'atlas.json'), 'utf8')) as {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
};

const PAD = 20;
let maxH = 0;
let totalW = PAD;
const metas = names.map((n) => {
  const f = json.frames[n]?.frame;
  if (!f) throw new Error(`no frame ${n}`);
  maxH = Math.max(maxH, f.h * scale);
  const left = totalW;
  totalW += f.w * scale + PAD;
  return { n, f, left };
});

// Align all frames on a common BASELINE (bottom), since anchors are feet.
const cells = await Promise.all(
  metas.map(async (m) => ({
    input: await sharp(path.join(assets, 'atlas.png'))
      .extract({ left: m.f.x, top: m.f.y, width: m.f.w, height: m.f.h })
      .resize(m.f.w * scale, m.f.h * scale, { kernel: 'nearest' })
      .png()
      .toBuffer(),
    left: m.left,
    top: PAD + (maxH - m.f.h * scale), // bottom-align
  })),
);

await sharp({
  create: { width: totalW, height: maxH + PAD * 2, channels: 4, background: { r: 116, g: 166, b: 68, alpha: 255 } },
})
  .composite(cells)
  .png()
  .toFile(out);
console.log(`${names.join(' vs ')} -> ${out}`);
