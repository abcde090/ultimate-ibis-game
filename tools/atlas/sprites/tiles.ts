// Ground tiles, 32×32. TILE_ORDER defines tile ids: index + 1 = Tiled gid
// (gid 0 = empty). The map generator imports TILE to stay in sync.

import { doc, rect, ellipse, line } from '../svg';

const T = 32;

function grass(base: string, fleck: string, seed: number): string {
  const parts = [rect(0, 0, T, T, base)];
  let s = seed * 7919 + 13;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 5; i++) {
    parts.push(ellipse(rnd() * T, rnd() * T, 2.5 + rnd() * 3, 1.2 + rnd() * 1.5, fleck));
  }
  return parts.join('');
}

function sand(base: string, seed: number): string {
  const parts = [rect(0, 0, T, T, base)];
  let s = seed * 104729 + 7;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 7; i++) {
    parts.push(ellipse(rnd() * T, rnd() * T, 1 + rnd(), 0.8, 'rgba(150,120,70,0.25)'));
  }
  return parts.join('');
}

const TILE_SVGS: Record<string, string> = {
  'grass-a': grass('#74a644', 'rgba(96,148,52,0.5)', 1),
  'grass-b': grass('#79ab49', 'rgba(130,178,80,0.55)', 2),
  'grass-c': grass('#6fa040', 'rgba(90,140,48,0.5)', 3),
  path: [rect(0, 0, T, T, '#d9c391'), ellipse(8, 10, 3, 2, 'rgba(160,130,80,0.3)'), ellipse(22, 24, 4, 2.5, 'rgba(160,130,80,0.25)')].join(''),
  pavement: [rect(0, 0, T, T, '#c9c4b8'), line(0, 16, 32, 16, 'rgba(120,115,105,0.35)', 1.2), line(16, 0, 16, 32, 'rgba(120,115,105,0.35)', 1.2)].join(''),
  'sand-a': sand('#e8d4a0', 4),
  'sand-b': sand('#e2cd96', 5),
  water: [rect(0, 0, T, T, '#4f93c9'), line(4, 9, 14, 9, 'rgba(255,255,255,0.18)', 1.6), line(18, 23, 28, 23, 'rgba(255,255,255,0.14)', 1.6)].join(''),
  'water-deep': [rect(0, 0, T, T, '#3f7eb3'), line(8, 14, 18, 14, 'rgba(255,255,255,0.1)', 1.6)].join(''),
  foam: [rect(0, 0, T, T, '#e8d4a0'), rect(0, 0, T, 14, '#4f93c9'), line(0, 14, 32, 14, 'rgba(255,255,255,0.8)', 3), line(0, 18, 32, 18, 'rgba(255,255,255,0.35)', 2)].join(''),
  'oval-grass': grass('#7fb050', 'rgba(110,160,65,0.5)', 6),
  garden: [rect(0, 0, T, T, '#6a5438'), ellipse(8, 8, 4, 3, '#7a6444'), ellipse(24, 18, 5, 3.5, '#5a4430'), ellipse(12, 26, 4, 3, '#7a6444')].join(''),
};

export const TILE_ORDER = Object.keys(TILE_SVGS);

export const TILE: Record<string, number> = Object.fromEntries(
  TILE_ORDER.map((name, i) => [name, i + 1]),
);

export const TILE_SIZE = T;
export const TILESET_COLUMNS = 8;

export function tileDocs(): Array<{ name: string; svg: string }> {
  return TILE_ORDER.map((name) => ({ name, svg: doc(T, T, TILE_SVGS[name] ?? '') }));
}
