import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built zip runs from any path (itch.io, portals).
  base: './',
  server: { port: 8124, strictPort: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600, // phaser is one big vendor chunk
  },
});
