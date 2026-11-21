import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyEvidence } from '../lib/replay.mjs';
import { sourceAssets, bundles, evidenceAssets } from '../lib/web-assets.mjs';
import { compile } from './compile.mjs';
import { build } from 'esbuild';
import QRCode from 'qrcode';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
fs.mkdirSync(path.join(output, 'evidence'), { recursive: true });
await QRCode.toFile(path.join(output,'entry-qr.png'),'https://gujingchenscut.github.io/ONE_MORE_PERSON/',{width:960,margin:4,errorCorrectionLevel:'M'});
// Explicit allowlist: credentials and local research attachments cannot enter the bundle.
for (const name of sourceAssets) {
  const source=path.join(root,'web',name);
  if(fs.existsSync(source))fs.copyFileSync(source, path.join(output, name));
}
for (const role of ['alice','bob','charlie']) fs.copyFileSync(path.join(root,'web/demo.html'), path.join(output,`${role}.html`));
for(const [entry,name] of Object.entries(bundles))if(fs.existsSync(path.join(root,'web',entry))) {
  await build({entryPoints:[path.join(root,'web',entry)],outfile:path.join(output,name),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,define:{__OMP_TEST_RPC__:'undefined'}});
}
const artifact=compile();
fs.writeFileSync(path.join(output,'live-artifact.json'),JSON.stringify({abi:artifact.abi,bytecode:artifact.bytecode,runtimeBytecode:artifact.runtimeBytecode,immutableReferences:artifact.immutableReferences,compiler:artifact.compiler}));
fs.copyFileSync(path.join(root, 'lib/replay.mjs'), path.join(output, 'replay.mjs'));
for (const name of evidenceAssets) {
  const source = path.join(root, 'research/validation', name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(output, 'evidence', name));
}
const proof = JSON.parse(fs.readFileSync(path.join(root, 'research/validation/monad-proof-evidence.json')));
verifyEvidence(proof);
fs.writeFileSync(path.join(output, 'evidence', 'deployment.json'), JSON.stringify({ mode: 'fictional-testnet-proof', chainId: 10143, contractAddress: proof.contractAddress, proofTransaction: proof.proofHash, deployed: true, walletInterfaceAvailable: fs.existsSync(path.join(root,'web/live.js')), visitorConnectionRequired: true, fixtureType: proof.fixtureType }, null, 2));
console.log('Static demo built in dist/; no credentials or raw attachments included.');
