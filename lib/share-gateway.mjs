import http from 'node:http';

// An explicit, opt-in gateway for a fictional rehearsal. Never proxies arbitrary paths.
export function createShareGateway({ publicOrigin, upstreamOrigin, assets = new Map() }) {
  const external = new URL(publicOrigin), upstream = new URL(upstreamOrigin);
  if (external.protocol !== 'https:' || external.origin !== publicOrigin || external.username || external.password) throw new Error('An exact HTTPS public origin is required');
  if (upstream.protocol !== 'http:' || upstream.hostname !== '127.0.0.1' || upstream.origin !== upstreamOrigin) throw new Error('Upstream must be a loopback HTTP origin');
  const reads = new Set(['/api/state', '/api/evidence']);
  const writes = new Set(['/api/login', '/api/action', '/api/logout']);
  function reply(res, status, body, type = 'application/json') {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'" });
    res.end(typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body));
  }
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/healthz') return reply(res, 200, { ok: true });
      if (req.headers.host !== external.host) return reply(res, 403, { error: 'Invalid demo host' });
      const url = new URL(req.url, publicOrigin);
      if (url.origin !== publicOrigin) return reply(res, 403, { error: 'Invalid demo target' });
      if (req.method === 'GET' && assets.has(url.pathname)) {
        const [type, body] = assets.get(url.pathname); return reply(res, 200, body, type);
      }
      const write = req.method === 'POST' && writes.has(url.pathname);
      if (!write && !(req.method === 'GET' && reads.has(url.pathname))) return reply(res, 404, { error: 'Not found' });
      if (write && (req.headers.origin !== publicOrigin || !req.headers['content-type']?.startsWith('application/json'))) return reply(res, 403, { error: 'Same-origin JSON only' });
      let body, size = 0;
      if (write) {
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 16000) return reply(res, 413, { error: 'Request too large' });
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const headers = write ? { origin: upstreamOrigin, 'content-type': 'application/json' } : {};
      if (write && req.headers.authorization) headers.authorization = req.headers.authorization;
      const response = await fetch(`${upstreamOrigin}${url.pathname}`, { method: write ? 'POST' : 'GET', headers, body, redirect: 'error', signal: AbortSignal.timeout(12000) });
      reply(res, response.status, Buffer.from(await response.arrayBuffer()), response.headers.get('content-type') ?? 'application/json');
    } catch { reply(res, 503, { error: 'Demo room unavailable. Check the room before retrying.' }); }
  });
}
