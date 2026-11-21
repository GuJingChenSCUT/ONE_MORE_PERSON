// Entry point for a dedicated cloud Node container, not a serverless function.
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

if (!process.env.OMP_PUBLIC_ORIGIN) throw new Error('Set OMP_PUBLIC_ORIGIN to the exact allocated HTTPS URL');
const publicUrl = new URL(process.env.OMP_PUBLIC_ORIGIN);
if (publicUrl.protocol !== 'https:' || publicUrl.origin !== process.env.OMP_PUBLIC_ORIGIN) throw new Error('Use an exact HTTPS origin without a trailing slash');
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 4180) throw new Error('Invalid cloud HTTP port');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
function launch(script, env) {
  const child = spawn(process.execPath, [script], { stdio: 'inherit', windowsHide: true, env: { ...process.env, ...env } });
  children.push(child);
  child.on('error', () => stop(1));
  child.on('exit', code => { if (!stopping) stop(code || 1); });
  return child;
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
launch('scripts/serve-rehearsal.mjs', { OMP_DEMO_PORT: '4180' });
let ready = false;
for (let attempt = 0; attempt < 90 && !stopping; attempt++) {
  try {
    const state = await fetch('http://127.0.0.1:4180/api/state', { signal: AbortSignal.timeout(1000) }).then(r => r.json());
    if (state.mode === 'local-evm-rehearsal' && state.chainId === 31337) { ready = true; break; }
  } catch {}
  await wait(500);
}
if (!ready) { stop(1); throw new Error('Isolated rehearsal did not start'); }
if (!stopping) launch('scripts/serve-public-rehearsal.mjs', { OMP_SHARE_BIND: '0.0.0.0', OMP_SHARE_PORT: String(port), OMP_DEMO_UPSTREAM: 'http://127.0.0.1:4180' });
