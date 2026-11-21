import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicAssets } from '../lib/web-assets.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/site.json'), 'utf8'));
const checkout = path.resolve(root, config.sourceCheckout);
if (!checkout.startsWith(root + path.sep)) throw new Error('Site checkout must stay inside this workspace');
const manifestPath = path.join(checkout, '.openai/hosting.json');
const existing = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
if (existing.project_id && existing.project_id !== config.projectId) throw new Error('Refusing to overwrite another Site identity');
fs.mkdirSync(path.join(checkout, 'web/evidence'), { recursive: true });
fs.mkdirSync(path.join(checkout, '.openai'), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify({ ...existing, project_id: config.projectId, static: { directory: 'dist' } }, null, 2) + '\n');
for (const name of publicAssets) {
  const source=path.join(root,'dist',name);
  if(fs.existsSync(source))fs.copyFileSync(source, path.join(checkout, 'web', name));
}
fs.writeFileSync(path.join(checkout, 'build.mjs'), "import fs from 'node:fs';\nfs.mkdirSync('dist', { recursive: true });\nfs.cpSync('web', 'dist', { recursive: true });\nconsole.log('Prepared static demo assets');\n");
fs.writeFileSync(path.join(checkout, '.gitignore'), 'node_modules/\ndist/\n.env\n.env.*\n.mojo/\n');
console.log(JSON.stringify({ projectId: config.projectId, checkout, staged: true, published: false }));
