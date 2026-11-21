import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import hre from 'hardhat';
import { build } from 'esbuild';
import { compile } from './compile.mjs';

// This process has no public RPC transport, keys or credentials. Its chain dies when it exits.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.OMP_HARNESS_PORT ?? 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local harness port');
const origin = `http://127.0.0.1:${port}`;
const connection = await hre.network.connect({ network: 'local', override: { chainId: 10143 } });
const provider = connection.provider;
if (Number(await provider.request({ method: 'eth_chainId' })) !== 10143) throw new Error('Isolated chain configuration failed');
const accounts = (await provider.request({ method: 'eth_accounts' })).slice(0, 3);
const artifact = compile();
const bundle = await build({ entryPoints: [path.join(root, 'web/live.js')], bundle: true, format: 'esm', platform: 'browser', target: 'es2022', write: false,
  define: { __OMP_TEST_RPC__: JSON.stringify(`${origin}/rpc`) } });
const html = fs.readFileSync(path.join(root, 'web/live.html'), 'utf8')
  .replace('<title>One More Person · Live seat relay</title>', '<title>LOCAL EVM TEST ONLY · One More Person wallet flow</title>')
  .replace('<script type="module" src="live.bundle.js"></script>', '<script type="module" src="harness-provider.js"></script>');
const assets = new Map([
  ['/', ['text/html', html]], ['/live.html', ['text/html', html]],
  ['/live.bundle.js', ['text/javascript', bundle.outputFiles[0].contents]],
  ['/live-artifact.json', ['application/json', JSON.stringify(artifact)]],
  ['/harness-provider.js', ['text/javascript', fs.readFileSync(path.join(root, 'tests/fixtures/live-harness-provider.js'))]],
  ['/styles.css', ['text/css', fs.readFileSync(path.join(root, 'web/styles.css'))]],
  ['/live.css', ['text/css', fs.readFileSync(path.join(root, 'web/live.css'))]],
]);
const methods = new Set(['eth_accounts', 'eth_chainId', 'eth_blockNumber', 'eth_getCode', 'eth_getBlockByNumber', 'eth_getBlockByHash',
  'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getBalance', 'eth_getTransactionCount', 'eth_gasPrice', 'eth_maxPriorityFeePerGas',
  'eth_feeHistory', 'eth_estimateGas', 'eth_call', 'eth_getLogs', 'eth_sendTransaction', 'eth_signTypedData_v4']);
const requests = [];
function send(res, status, body, type = 'application/json') { res.writeHead(status, { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(body); }
async function handleRpc(message) {
  if (!message || message.jsonrpc !== '2.0' || !methods.has(message.method) || !Array.isArray(message.params ?? [])) throw Object.assign(new Error('RPC method not allowed by the isolated harness'), { code: -32601 });
  const params = message.params ?? [];
  if (message.method === 'eth_sendTransaction' && !accounts.some(a => a.toLowerCase() === params[0]?.from?.toLowerCase())) throw new Error('Only the three isolated test accounts may send');
  if (message.method === 'eth_signTypedData_v4' && !accounts.some(a => a.toLowerCase() === params[0]?.toLowerCase())) throw new Error('Only isolated test accounts may sign');
  const result = await provider.request({ method: message.method, params });
  if (message.method === 'eth_sendTransaction') requests.push({ type: 'transaction', hash: result, from: params[0].from, to: params[0].to ?? null, at: new Date().toISOString() });
  if (message.method === 'eth_signTypedData_v4') requests.push({ type: 'typed-signature', account: params[0], at: new Date().toISOString() });
  return result;
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) return send(res, 403, JSON.stringify({ error: 'Loopback host required' }));
    const pathname = new URL(req.url, origin).pathname;
    if (pathname === '/rpc') {
      if (req.method !== 'POST' || req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) return send(res, 403, JSON.stringify({ error: 'Same-origin JSON requests only; CORS disabled' }));
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 150000) return send(res, 413, JSON.stringify({ error: 'Request too large' })); }
      const message = JSON.parse(body);
      if (Array.isArray(message)) throw new Error('RPC batching is disabled in this harness');
      try { return send(res, 200, JSON.stringify({ jsonrpc: '2.0', id: message.id ?? null, result: await handleRpc(message) })); }
      catch (error) { return send(res, 200, JSON.stringify({ jsonrpc: '2.0', id: message.id ?? null, error: { code: Number(error.code ?? -32603), message: error.message, data: error.data } })); }
    }
    if (pathname === '/harness-log.json' && req.method === 'GET') return send(res, 200, JSON.stringify({ mode: 'local-browser-harness', chainId: 10143,
      warning: 'Isolated Hardhat chain uses testnet chainId only to exercise the exact signature domain. NOT Monad; no measured network finality.', accounts, requests }, null, 2));
    if (req.method !== 'GET' || !assets.has(pathname)) return send(res, 404, 'Local harness asset not found', 'text/plain');
    const [type, contents] = assets.get(pathname); send(res, 200, contents, type);
  } catch (error) { send(res, 400, JSON.stringify({ error: String(error.message).slice(0, 200) })); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
console.log(JSON.stringify({ url: `${origin}/live.html`, mode: 'LOCAL EVM SIMULATION ONLY', chainId: 10143, accounts, networkAccess: 'loopback only', logUrl: `${origin}/harness-log.json` }, null, 2));
let closing = false;
async function close() { if (closing) return; closing = true; server.close(); await connection.close(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
