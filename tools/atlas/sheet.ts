// Contact-sheet generator for art review:
//   npx tsx tools/atlas/sheet.ts <frame-prefix> [scale] [out.png]
// e.g. npx tsx tools/atlas/sheet.ts ibis/ 3 /tmp/ibis.png

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const prefix = process.argv[2] ?? '';
const scale = Number(process.argv[3] ?? 3);
const out = process.argv[4] ?? `/tmp/sheet-${prefix.replace(/[^a-z0-9-]/gi, '_')}.png`;

const assets = path.resolve(import.meta.dirname, '../../public/assets');
const json = JSON.parse(await readFile(path.join(assets, 'atlas.json'), 'utf8')) as {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
};

const names = Object.keys(json.frames).filter((n) => n.startsWith(prefix));
if (names.length === 0) {
  console.error(`no frames match prefix "${prefix}"`);
  process.exit(1);
}

const PAD = 12;
let maxH = 0;
let totalW = PAD;
const metas = names.map((n) => {
  const f = json.frames[n]!.frame;
  maxH = Math.max(maxH, f.h * scale);
  const left = totalW;
  totalW += f.w * scale + PAD;
  return { n, f, left };
});

const cells = await Promise.all(
  metas.map(async (m) => ({
    input: await sharp(path.join(assets, 'atlas.png'))
      .extract({ left: m.f.x, top: m.f.y, width: m.f.w, height: m.f.h })
      .resize(m.f.w * scale, m.f.h * scale, { kernel: 'nearest' })
      .png()
      .toBuffer(),
    left: m.left,
    top: PAD,
  })),
);

await sharp({
  create: {
    width: totalW,
    height: maxH + PAD * 2,
    channels: 4,
    background: { r: 116, g: 166, b: 68, alpha: 255 },
  },
})
  .composite(cells)
  .png()
  .toFile(out);

console.log(`${names.length} frames → ${out}`);
console.log(names.join('  '));
