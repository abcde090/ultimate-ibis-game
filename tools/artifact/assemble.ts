// Bakes the IIFE game bundle + base64 assets into a single self-contained
// HTML file. The result loads Phaser from cdnjs (allowed inside Claude
// artifacts), inlines every asset as a data URI / JSON object, and runs the
// whole game from one file — no server, no build step, opens from file://.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ASSETS = path.join(ROOT, 'public/assets');
const PHASER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js';
// SRI hash of the exact cdnjs file above — a tampered/compromised CDN
// response is rejected by the browser rather than executed.
const PHASER_SRI = 'sha384-AvQiDMZAVLda3VtAoU5MCfBz8pzXhteb2CiUJeKBmPlWzpXj1uJ96Km11+YuFNu/';

async function dataUri(file: string, mime: string): Promise<string> {
  const buf = await readFile(path.join(ASSETS, file));
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function json(file: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(ASSETS, file), 'utf8'));
}

// Prevent a stray "</script>" in any embedded blob from closing the tag early.
function safe(s: string): string {
  return s.replace(/<\/script/gi, '<\\/script');
}

const [atlasPng, tilesPng, atlasJson, mapJson, iife] = await Promise.all([
  dataUri('atlas.png', 'image/png'),
  dataUri('tiles.png', 'image/png'),
  json('atlas.json'),
  json('map.json'),
  readFile(path.join(ROOT, 'dist-artifact/bin-chicken.iife.js'), 'utf8'),
]);

const assetsBlob = JSON.stringify({ atlasPng, tilesPng, atlasJson, mapJson });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
<title>Bin Chicken — An Ibis Mischief Game</title>
<style>
  html, body { margin: 0; padding: 0; background: #10180f; height: 100%; overflow: hidden; }
  #app { width: 100vw; height: 100vh; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
  #app canvas { display: block; margin: 0 auto; touch-action: none; }
  #fallback { color: #f0ead2; font-family: Georgia, serif; text-align: center; padding: 80px 20px; }
  #fallback a { color: #e0533d; }
</style>
</head>
<body>
<div id="app"><div id="fallback">Loading Bin Chicken…<br/><small>If this never finishes, the Phaser CDN may be blocked.</small></div></div>
<script src="${PHASER_CDN}" integrity="${PHASER_SRI}" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script>window.__BIN_CHICKEN_ASSETS__ = ${safe(assetsBlob)};</script>
<script>
if (!window.Phaser) {
  document.getElementById('fallback').innerHTML =
    'Could not load the Phaser engine from the CDN.<br/>This game needs network access to <code>cdnjs.cloudflare.com</code>.';
} else {
  // Phaser took over #app; drop the loading placeholder.
  var fb = document.getElementById('fallback'); if (fb) fb.remove();
${safe(iife)}
}
</script>
</body>
</html>
`;

const out = path.join(ROOT, 'bin-chicken.html');
await writeFile(out, html);
const kb = (html.length / 1024).toFixed(0);
console.log(`artifact: ${out} (${kb} KB, Phaser from CDN)`);
