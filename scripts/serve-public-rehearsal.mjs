import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createShareGateway } from '../lib/share-gateway.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicOrigin = process.env.OMP_PUBLIC_ORIGIN;
const upstreamOrigin = process.env.OMP_DEMO_UPSTREAM ?? 'http://127.0.0.1:4180';
const port = Number(process.env.OMP_SHARE_PORT ?? 4182);
const bind = process.env.OMP_SHARE_BIND ?? '127.0.0.1';
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid gateway port');
if (!['127.0.0.1', '0.0.0.0'].includes(bind)) throw new Error('Unsupported gateway bind address');
const state = await fetch(`${upstreamOrigin}/api/state`).then(r => r.json());
if (state.chainId !== 31337 || state.mode !== 'local-evm-rehearsal') throw new Error('Only a local rehearsal may be shared');
const bundle = await build({ entryPoints: [path.join(root, 'web/rehearsal.js')], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false });
const assets = new Map([
  ['/', ['text/html; charset=utf-8', fs.readFileSync(path.join(root, 'web/rehearsal.html'), 'utf8').replace('<html ', '<html data-transport="poll" ')]],
  ['/rehearsal.css', ['text/css; charset=utf-8', fs.readFileSync(path.join(root, 'web/rehearsal.css'))]],
  ['/rehearsal.bundle.js', ['text/javascript; charset=utf-8', bundle.outputFiles[0].contents]],
  ['/demo-guide.pdf', ['application/pdf', fs.readFileSync(path.join(root, 'output/pdf/One_More_Person_Demo_Guide.pdf'))]],
]);
const server = createShareGateway({ publicOrigin, upstreamOrigin, assets });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, bind, resolve); });
console.log(`Demo gateway ready on ${bind}:${port}. Only these demo routes are shared:\n${['alice','bob','charlie'].map(role => `${publicOrigin}/?role=${role}`).join('\n')}\n${publicOrigin}/demo-guide.pdf\nThe host process must stay online. Chain 31337; no public funds.`);
