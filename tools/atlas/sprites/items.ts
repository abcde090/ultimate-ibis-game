// Carryable items. 32×32 frames, anchor centre-ish low; drawn loose-on-ground.

import { SpriteFrame, doc, ellipse, line, rect, path, poly, circle } from '../svg';

type Builder = () => string;
const S = 32;
const C = 16;

function item(name: string, build: Builder): SpriteFrame {
  return { name: `item/${name}`, w: S, h: S, svg: doc(S, S, build()) };
}

const builders: Record<string, Builder> = {
  chip: () => rect(7, 13, 18, 6, '#f2c14e', { rx: 2, rot: -20, stroke: '#c79a30', sw: 1 }),
  'golden-chip': () => [
    ellipse(C, C, 14, 14, 'rgba(255,215,0,0.25)'),
    rect(5, 12, 22, 8, '#ffd700', { rx: 3, rot: -20, stroke: '#b8860b', sw: 1.2 }),
    circle(22, 9, 1.8, '#fff8d0'),
    circle(8, 22, 1.2, '#fff8d0'),
  ].join(''),
  sausage: () => rect(6, 12, 20, 7, '#a05a32', { rx: 4, rot: -8, stroke: '#7a4022', sw: 1 }),
  phone: () => [
    rect(10, 6, 12, 20, '#1a1a1a', { rx: 2.5 }),
    rect(12, 8, 8, 15, '#6cf'),
  ].join(''),
  croissant: () => [
    path('M 6 20 Q 8 10 16 9 Q 24 10 26 20 Q 20 16 16 16 Q 12 16 6 20 Z', '#d8a857', { stroke: '#a87838', sw: 1.2 }),
    line(11, 14, 12, 18, '#a87838', 1.2),
    line(20, 13, 19, 17, '#a87838', 1.2),
  ].join(''),
  coffee: () => [
    rect(9, 10, 14, 16, '#f0ece0', { rx: 2, stroke: '#b8a888', sw: 1.2 }),
    rect(8, 8, 16, 4, '#7a5430', { rx: 2 }),
    rect(11, 4, 10, 4, '#e8e0d0', { rx: 2 }),
  ].join(''),
  coin: () => [
    circle(C, C, 9, '#e8c93d'),
    circle(C, C, 6.5, '#d4b22a'),
    `<text x="16" y="20" font-family="Georgia" font-size="9" font-weight="bold" fill="#a3852a" text-anchor="middle">$2</text>`,
  ].join(''),
  mango: () => [
    ellipse(C, C + 2, 10, 8, '#e0a33d', { rot: -18 }),
    ellipse(C - 3, C - 1, 5, 3.5, '#d97a3d', { rot: -18 }),
    line(C + 7, C - 6, C + 9, C - 9, '#5a7340', 2),
  ].join(''),
  fish: () => [
    ellipse(13, C, 9, 5, '#7aa3b8', { rot: -5 }),
    poly([[21, 15], [28, 11], [28, 20]], '#7aa3b8'),
    circle(8, 14.5, 1.2, '#1f1f1f'),
  ].join(''),
  scarf: () => [
    path('M 6 24 Q 10 8 18 10 Q 26 12 26 22', 'none', { stroke: '#d96aa0', sw: 5 }),
    line(6, 24, 5, 28, '#d96aa0', 5),
    line(26, 22, 28, 27, '#d96aa0', 5),
  ].join(''),
  sunscreen: () => [
    rect(11, 9, 10, 18, '#f5d33d', { rx: 3, stroke: '#c9a92a', sw: 1 }),
    rect(13, 5, 6, 5, '#e8e0d0', { rx: 1.5 }),
    rect(12.5, 14, 7, 8, '#fdf6e3', { rx: 1 }),
  ].join(''),
  bucket: () => [
    poly([[9, 11], [23, 11], [21, 26], [11, 26]], '#d94f4f'),
    ellipse(16, 11, 7, 2.5, '#b83a3a'),
    path('M 9 11 Q 16 2 23 11', 'none', { stroke: '#8a8a8a', sw: 1.6 }),
  ].join(''),
  whistle: () => [
    circle(13, 18, 6, '#d8d3c2'),
    rect(13, 10, 12, 6, '#d8d3c2', { rx: 2 }),
    circle(13, 18, 2, '#7a7a72'),
    path('M 25 13 Q 29 11 28 8', 'none', { stroke: '#8a8a8a', sw: 1.4 }),
  ].join(''),
  key: () => [
    `<circle cx="11" cy="12" r="4.5" fill="none" stroke="#c9b370" stroke-width="2.5"/>`,
    line(14, 15, 23, 24, '#c9b370', 2.5),
    line(20, 21, 23, 18, '#c9b370', 2.5),
    line(23, 24, 26, 21, '#c9b370', 2.5),
  ].join(''),
  latch: () => [
    rect(6, 13, 14, 7, '#8a8a8a', { rx: 2 }),
    rect(17, 11, 9, 11, '#6a6a6a', { rx: 2 }),
    circle(10, 16.5, 1.6, '#4a4a4a'),
  ].join(''),
  'trash-can': () => [
    rect(11, 8, 10, 17, '#c0392b', { rx: 2, rot: 10 }),
    rect(11, 8, 10, 4, '#dddddd', { rot: 10 }),
  ].join(''),
  'trash-peel': () => path('M 7 22 Q 16 4 25 20 M 16 9 L 16 16', 'none', { stroke: '#e8d44e', sw: 3.5 }),
  'trash-wrapper': () => poly([[7, 16], [12, 9], [17, 14], [23, 8], [25, 18], [14, 22]], '#cfd8e0'),
  sandwich: () => [
    poly([[6, 22], [26, 22], [16, 9]], '#e8d8a8', { stroke: '#b89858', sw: 1.2 }),
    line(9, 20, 23, 20, '#7a9460', 2),
  ].join(''),
  thong: () => [
    ellipse(C, C, 7, 11, '#e87a30', { rot: 12 }),
    path(`M ${C} ${C - 7} L ${C - 4} ${C + 2} M ${C} ${C - 7} L ${C + 5} ${C + 2}`, 'none', { stroke: '#fdf6e3', sw: 1.6 }),
  ].join(''),
  'balloon-loose': () => [
    ellipse(C, 12, 9, 11, '#d94f4f'),
    path(`M ${C} 23 Q ${C - 3} 27 ${C} 30`, 'none', { stroke: 'rgba(60,60,60,0.6)', sw: 1.2 }),
    ellipse(C - 3, 8, 2.5, 4, 'rgba(255,255,255,0.35)', { rot: -20 }),
  ].join(''),
};

export function itemFrames(): SpriteFrame[] {
  return Object.entries(builders).map(([name, build]) => item(name, build));
}
