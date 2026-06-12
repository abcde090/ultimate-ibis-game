import { writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// Dev-only: lets the page POST WebGL snapshots to disk so agent tooling
// (and humans) can review exact frames. No effect on production builds.
function snapshotSink(): Plugin {
  return {
    name: 'snapshot-sink',
    configureServer(server) {
      server.middlewares.use('/__snapshot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }
        let body = '';
        req.on('data', (chunk: Buffer) => (body += chunk.toString()));
        req.on('end', () => {
          try {
            const base64 = body.replace(/^data:image\/\w+;base64,/, '');
            writeFileSync('/tmp/game-snap.jpg', Buffer.from(base64, 'base64'));
            res.end('ok');
          } catch (err) {
            res.statusCode = 500;
            res.end(String(err));
          }
        });
      });
    },
  };
}

export default defineConfig({
  // Relative base so the built zip runs from any path (itch.io, portals).
  base: './',
  server: { port: 8124, strictPort: true },
  plugins: [snapshotSink()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1600, // phaser is one big vendor chunk
  },
});
