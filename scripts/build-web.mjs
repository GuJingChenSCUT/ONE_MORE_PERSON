import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
fs.mkdirSync(path.join(output, 'evidence'), { recursive: true });
// Explicit allowlist: credentials and local research attachments cannot enter the bundle.
for (const name of ['index.html', 'relay.js', 'app.js', 'styles.css', 'evidence.js']) {
  fs.copyFileSync(path.join(root, 'web', name), path.join(output, name));
}
fs.copyFileSync(path.join(root, 'lib/replay.mjs'), path.join(output, 'replay.mjs'));
for (const name of ['network.json', 'local-demo.json']) {
  const source = path.join(root, 'research/validation', name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, 'evidence', name));
}
fs.writeFileSync(path.join(output, 'evidence', 'deployment.json'), JSON.stringify({ mode: 'prototype', chainId: 10143, contractAddress: null, deployed: false }, null, 2));
console.log('Static demo built in dist/; no credentials or raw attachments included.');
