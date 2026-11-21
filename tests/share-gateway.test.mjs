import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createShareGateway } from '../lib/share-gateway.mjs';

test('Public rehearsal gateway allows only demo routes and validates host, origin and payload', async () => {
  const received = [];
  const upstream = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received.push({ url: req.url, headers: req.headers, body });
    res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamOrigin = `http://127.0.0.1:${upstream.address().port}`;
  const publicOrigin = 'https://demo.example';
  const gateway = createShareGateway({ publicOrigin, upstreamOrigin, assets: new Map([['/', ['text/html', '<h1>Demo</h1>']], ['/bundle.js', ['text/javascript', new TextEncoder().encode('window.demo=true;')]]]) });
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  function request(path, { method = 'GET', headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: gateway.address().port, path, method, headers: { host: 'demo.example', ...headers } }, res => {
        let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, body: text }));
      }); req.on('error', reject); req.end(body);
    });
  }
  try {
    assert.equal((await request('/?role=alice')).status, 200);
    assert.equal((await request('/bundle.js')).body, 'window.demo=true;');
    assert.equal((await request('/healthz', { headers: { host: '127.0.0.1' } })).status, 200);
    assert.equal((await request('/api/state')).status, 200);
    assert.equal((await request('/.mojo/agent.json')).status, 404);
    assert.equal((await request('/api/events')).status, 404);
    assert.equal((await request('/api/state', { headers: { host: 'evil.example' } })).status, 403);
    const write = { method: 'POST', headers: { origin: publicOrigin, 'content-type': 'application/json', authorization: 'Bearer fixture-session' }, body: '{"role":"alice"}' };
    assert.equal((await request('/api/login', { ...write, headers: { ...write.headers, origin: 'https://other.example' } })).status, 403);
    assert.equal((await request('/api/login', { ...write, body: 'x'.repeat(16001) })).status, 413);
    assert.equal((await request('/api/login', write)).status, 200);
    assert.equal(received.at(-1).headers.origin, upstreamOrigin);
    assert.equal(received.at(-1).headers.authorization, 'Bearer fixture-session');
    assert.equal(received.at(-1).body, write.body);
    assert.equal(received.length, 2);
  } finally {
    gateway.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
});
