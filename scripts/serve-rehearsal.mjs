import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import hre from 'hardhat';
import { build } from 'esbuild';
import { compile } from './compile.mjs';
import { createRehearsalRoom, roles } from '../lib/rehearsal-room.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.OMP_DEMO_PORT ?? 4180);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid rehearsal port');
const origin = `http://127.0.0.1:${port}`;
const connection = await hre.network.connect('local');
const room = await createRehearsalRoom(connection.provider, compile());
const bundle = await build({ entryPoints: [path.join(root, 'web/rehearsal.js')], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false });
const assets = new Map([
  ['/', ['text/html', fs.readFileSync(path.join(root, 'web/rehearsal.html'))]],
  ['/rehearsal.css', ['text/css', fs.readFileSync(path.join(root, 'web/rehearsal.css'))]],
  ['/rehearsal.bundle.js', ['text/javascript', bundle.outputFiles[0].contents]],
]);
const sessions = new Map();
function reply(res, status, data, type = 'application/json') {
  res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'" });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) return reply(res, 403, { error: 'Use the printed 127.0.0.1 address' });
    const url = new URL(req.url, origin);
    if (req.method === 'GET' && url.pathname === '/api/state') return reply(res, 200, room.state());
    if (req.method === 'GET' && url.pathname === '/api/evidence') return reply(res, 200, { notice: 'Fictional identities on isolated local EVM 31337. Not Monad or independent human testing.', ...room.state() });
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-content-type-options': 'nosniff' });
      const push = state => res.write(`data: ${JSON.stringify(state)}\n\n`);
      push(room.state()); const unsubscribe = room.subscribe(push);
      const heartbeat = setInterval(() => res.write(': live\n\n'), 15000);
      req.on('close', () => { clearInterval(heartbeat); unsubscribe(); }); return;
    }
    if (req.method === 'POST' && ['/api/login', '/api/action', '/api/logout'].includes(url.pathname)) {
      if (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return reply(res, 403, { error: 'Same-origin JSON only' });
      let body = ''; for await (const part of req) { body += part; if (body.length > 16000) return reply(res, 413, { error: 'Request too large' }); }
      const payload = JSON.parse(body);
      if (url.pathname === '/api/login') {
        if (!roles.includes(payload.role)) return reply(res, 400, { error: 'Choose Alice, Bob or Charlie' });
        const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, payload.role);
        return reply(res, 200, { token, role: payload.role, instanceId: room.state().instanceId });
      }
      const token = req.headers.authorization?.replace(/^Bearer /, ''); const role = sessions.get(token);
      if (!role) return reply(res, 401, { error: 'Demo session expired. Log in again in this tab.' });
      if (url.pathname === '/api/logout') { sessions.delete(token); return reply(res, 200, { ok: true }); }
      return reply(res, 200, await room.act(role, payload.type, payload));
    }
    if (req.method === 'GET' && assets.has(url.pathname)) { const [type, data] = assets.get(url.pathname); return reply(res, 200, data, type); }
    return reply(res, 404, { error: 'Not found' });
  } catch (error) { return reply(res, 400, { error: String(error.shortMessage ?? error.message).slice(0, 300) }); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
console.log(`Three-page rehearsal ready (LOCAL EVM ONLY):\n${roles.map(role => `${origin}/?role=${role}`).join('\n')}\nKeep this process running. Ctrl+C stops the room. No external network or real funds are used.`);
async function close() { server.closeAllConnections(); server.close(); await connection.close(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
