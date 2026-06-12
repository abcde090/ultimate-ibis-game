// Tiny SVG-authoring helpers for the sprite builders. Every sprite is an
// SVG document rasterized by sharp at bake time. Sprites are authored
// facing LEFT; the game flips horizontally for right-facing.

export interface SpriteFrame {
  name: string; // atlas key, e.g. "ibis/waddle/2"
  w: number;
  h: number;
  svg: string; // complete <svg> document
}

export function doc(w: number, h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

export function ellipse(
  cx: number, cy: number, rx: number, ry: number, fill: string,
  opts: { stroke?: string; sw?: number; rot?: number; opacity?: number } = {},
): string {
  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1.5}"` : '';
  const rot = opts.rot ? ` transform="rotate(${opts.rot} ${cx} ${cy})"` : '';
  const op = opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : '';
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke}${rot}${op}/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}

export function rect(
  x: number, y: number, w: number, h: number, fill: string,
  opts: { rx?: number; stroke?: string; sw?: number; rot?: number; opacity?: number } = {},
): string {
  const rx = opts.rx !== undefined ? ` rx="${opts.rx}"` : '';
  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1.5}"` : '';
  const rot = opts.rot ? ` transform="rotate(${opts.rot} ${x + w / 2} ${y + h / 2})"` : '';
  const op = opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rx}${stroke}${rot}${op}/>`;
}

export function path(
  d: string, fill: string,
  opts: { stroke?: string; sw?: number; linecap?: string; opacity?: number } = {},
): string {
  const stroke = opts.stroke
    ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 2}" stroke-linecap="${opts.linecap ?? 'round'}"`
    : '';
  const op = opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : '';
  return `<path d="${d}" fill="${fill}"${stroke}${op}/>`;
}

export function line(
  x1: number, y1: number, x2: number, y2: number, stroke: string, sw: number,
  linecap = 'round',
): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${linecap}"/>`;
}

export function group(transform: string, body: string): string {
  return `<g transform="${transform}">${body}</g>`;
}

export function poly(points: Array<[number, number]>, fill: string, opts: { stroke?: string; sw?: number } = {}): string {
  const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
  const stroke = opts.stroke ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1.5}"` : '';
  return `<polygon points="${pts}" fill="${fill}"${stroke}/>`;
}

// Soft contact shadow drawn under actors/props at the anchor line.
export function shadow(cx: number, cy: number, rx: number): string {
  return ellipse(cx, cy, rx, rx * 0.36, 'rgba(20,40,20,0.22)');
}

export const PAL = {
  ink: '#1f1f1f',
  ibisBody: '#f4f1e8',
  ibisShade: '#d8d3c2',
  outline: '#c9c4b4',
} as const;
