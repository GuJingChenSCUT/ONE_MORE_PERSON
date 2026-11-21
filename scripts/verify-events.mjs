import fs from 'node:fs';
import { verifyEvidence } from '../lib/replay.mjs';

const file = process.argv[2] ?? new URL('../research/validation/local-demo.json', import.meta.url);
try {
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(JSON.stringify({ ...verifyEvidence(evidence), scope: 'File consistency only. Live chain provenance requires a finalized RPC snapshot.' }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
