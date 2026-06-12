import { clamp } from './collision.js';

// Smooth follow-camera clamped to the world bounds.
export function createCamera(viewW, viewH, worldW, worldH) {
  const cam = {
    x: 0,
    y: 0,
    follow(targetX, targetY, dt) {
      const goalX = clamp(targetX - viewW / 2, 0, worldW - viewW);
      const goalY = clamp(targetY - viewH / 2, 0, worldH - viewH);
      // Exponential smoothing, frame-rate independent.
      const t = 1 - Math.exp(-6 * dt);
      cam.x += (goalX - cam.x) * t;
      cam.y += (goalY - cam.y) * t;
    },
    snap(targetX, targetY) {
      cam.x = clamp(targetX - viewW / 2, 0, worldW - viewW);
      cam.y = clamp(targetY - viewH / 2, 0, worldH - viewH);
    },
  };
  return cam;
}
