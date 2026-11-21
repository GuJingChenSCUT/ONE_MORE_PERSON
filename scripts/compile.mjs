import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function compile() {
  const name = 'contracts/src/SafeSeatRelay.sol';
  const input = { language: 'Solidity', sources: { [name]: { content: fs.readFileSync(path.join(root, name), 'utf8') } },
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'evm.deployedBytecode.immutableReferences', 'metadata'] } } } };
  const result = JSON.parse(solc.compile(JSON.stringify(input), { import: name => {
    try { return { contents: fs.readFileSync(path.join(root, 'node_modules', name), 'utf8') }; }
    catch { return { error: `Cannot resolve ${name}` }; }
  } }));
  const errors = (result.errors ?? []).filter(e => e.severity === 'error');
  if (errors.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  const c = result.contracts[name].SafeSeatRelay;
  return { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}`, runtimeBytes: c.evm.deployedBytecode.object.length / 2,
    runtimeBytecode: `0x${c.evm.deployedBytecode.object}`, immutableReferences: c.evm.deployedBytecode.immutableReferences,
    compiler: solc.version(), standardJsonInput: input, metadata: JSON.parse(c.metadata) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const artifact = compile();
  fs.mkdirSync(path.join(root, 'contracts/artifacts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'contracts/artifacts/SafeSeatRelay.json'), JSON.stringify(artifact, null, 2));
  console.log(JSON.stringify({ compiler: artifact.compiler, runtimeBytes: artifact.runtimeBytes, deployed: false }));
}
