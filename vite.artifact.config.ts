import { defineConfig } from 'vite';

// Builds the game as a single IIFE that references a global `Phaser`
// (loaded from CDN by the artifact wrapper). Assets are NOT bundled here —
// the assemble tool injects them as a `window.__BIN_CHICKEN_ASSETS__` global.
export default defineConfig({
  build: {
    outDir: 'dist-artifact',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    lib: {
      entry: 'src/main.ts',
      formats: ['iife'],
      name: 'BinChicken',
      fileName: () => 'bin-chicken.iife.js',
    },
    rollupOptions: {
      external: ['phaser'],
      output: {
        globals: { phaser: 'Phaser' },
        // Phaser's UMD assigns the namespace to window.Phaser; treat the
        // default import as that namespace (no `.default` indirection).
        interop: 'default',
      },
    },
  },
});
