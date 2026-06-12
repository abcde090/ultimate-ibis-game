import { WORLD, POND, PATHS, PITCH, RECTS, TREES, NEST } from './level.js';
import {
  drawIbis, drawHuman, drawItem, drawBin, drawTree, drawTable, drawBBQ,
  drawCafe, drawNest,
} from '../entities/sprites.js';

// Pre-render the grass (mottled texture) once — far too slow per frame.
let groundCanvas = null;

function buildGround() {
  groundCanvas = document.createElement('canvas');
  groundCanvas.width = WORLD.w;
  groundCanvas.height = WORLD.h;
  const g = groundCanvas.getContext('2d');

  g.fillStyle = '#74a644';
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  // Deterministic mottling (cheap LCG so reloads look identical).
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 2400; i++) {
    const x = rand() * WORLD.w;
    const y = rand() * WORLD.h;
    const r = 4 + rand() * 14;
    g.fillStyle = rand() > 0.5 ? 'rgba(96, 148, 52, 0.35)' : 'rgba(130, 178, 80, 0.3)';
    g.beginPath();
    g.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Dirt paths.
  g.strokeStyle = '#d9c391';
  g.lineCap = 'round';
  for (const p of PATHS) {
    g.lineWidth = p.width;
    g.beginPath();
    g.moveTo(p.x1, p.y1);
    g.quadraticCurveTo((p.x1 + p.x2) / 2 + 60, (p.y1 + p.y2) / 2, p.x2, p.y2);
    g.stroke();
  }

  // Cricket pitch strip.
  g.fillStyle = '#c9b97a';
  g.beginPath();
  g.roundRect(PITCH.x, PITCH.y, PITCH.w, PITCH.h, 10);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 2;
  g.strokeRect(PITCH.x + 30, PITCH.y + 30, PITCH.w - 60, PITCH.h - 60);

  // Pond with bank.
  g.fillStyle = '#b8a87a';
  g.beginPath();
  g.ellipse(POND.cx, POND.cy, POND.rx + 12, POND.ry + 12, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4f93c9';
  g.beginPath();
  g.ellipse(POND.cx, POND.cy, POND.rx, POND.ry, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#65a8d9';
  g.beginPath();
  g.ellipse(POND.cx - 20, POND.cy - 14, POND.rx * 0.7, POND.ry * 0.6, 0, 0, Math.PI * 2);
  g.fill();
}

export function render(ctx, state, cam, viewW, viewH) {
  if (!groundCanvas) buildGround();

  ctx.clearRect(0, 0, viewW, viewH);
  ctx.save();
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  ctx.drawImage(groundCanvas, 0, 0);

  drawPondRipples(ctx, state.time);
  drawNest(ctx, NEST);

  // Everything with height gets y-sorted by its base line.
  const drawables = [];

  for (const rect of RECTS) {
    drawables.push({
      y: rect.y + rect.h,
      draw: () => {
        if (rect.kind === 'table') drawTable(ctx, rect);
        else if (rect.kind === 'bbq') drawBBQ(ctx, rect);
        else drawCafe(ctx, rect);
      },
    });
  }
  for (const tree of TREES) {
    drawables.push({ y: tree.y, draw: () => drawTree(ctx, tree) });
  }
  for (const bin of state.bins) {
    drawables.push({ y: bin.y, draw: () => drawBin(ctx, bin) });
  }
  for (const item of state.items) {
    if (item.holder !== null) continue; // held items ride their holder
    drawables.push({ y: item.y + (item.inPond ? -6 : 6), draw: () => drawItem(ctx, item) });
  }
  for (const npc of state.npcs) {
    drawables.push({
      y: npc.y,
      draw: () => {
        drawHuman(ctx, npc);
        const held = npc.heldItemId
          ? state.items.find((it) => it.id === npc.heldItemId)
          : null;
        if (held) drawItem(ctx, held);
      },
    });
  }
  drawables.push({
    y: state.player.y,
    draw: () => {
      drawIbis(ctx, state.player);
      const held = state.player.heldItemId
        ? state.items.find((it) => it.id === state.player.heldItemId)
        : null;
      if (held) drawItem(ctx, held);
    },
  });

  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.draw();

  ctx.restore();
}

function drawPondRipples(ctx, t) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const phase = ((t * 0.25 + i / 3) % 1);
    ctx.globalAlpha = 1 - phase;
    ctx.beginPath();
    ctx.ellipse(
      POND.cx - 30, POND.cy + 10,
      20 + phase * 60, (20 + phase * 60) * 0.45,
      0, 0, Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
