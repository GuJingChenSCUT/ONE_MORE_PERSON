import { isAddress, keccak256 } from 'viem';

export function matchesRuntime(actual, artifact) {
  if (!actual || actual === '0x' || actual.length !== artifact.runtimeBytecode.length) return false;
  const mask = code => {
    const bytes = code.slice(2).toLowerCase().split('');
    for (const refs of Object.values(artifact.immutableReferences ?? {})) {
      for (const { start, length } of refs) bytes.fill('0', start * 2, (start + length) * 2);
    }
    return bytes.join('');
  };
  return mask(actual) === mask(artifact.runtimeBytecode);
}

// Fail closed: a reachable RPC alone is not a verified deployment.
export async function verifyDeployment(client, config, artifact) {
  if (config.chainId !== 10143 || await client.getChainId() !== 10143) throw new Error('Expected Monad Testnet chainId 10143');
  if (!isAddress(config.contractAddress ?? '') || !isAddress(config.deployerAddress ?? '') || !/^0x[\da-f]{64}$/i.test(config.deploymentTransaction ?? '')) {
    throw new Error('A contract, expected deployment identity and deployment transaction are required');
  }
  const block = await client.getBlock({ blockTag: 'finalized' });
  const [code, receipt, transaction] = await Promise.all([
    client.getBytecode({ address: config.contractAddress, blockNumber: block.number }),
    client.getTransactionReceipt({ hash: config.deploymentTransaction }),
    client.getTransaction({ hash: config.deploymentTransaction }),
  ]);
  if (!matchesRuntime(code, artifact)) throw new Error('Runtime bytecode does not match the compiled contract');
  if (receipt.status !== 'success' || receipt.blockNumber > block.number || receipt.contractAddress?.toLowerCase() !== config.contractAddress.toLowerCase()) throw new Error('No matching finalized direct deployment');
  if (transaction.to !== null || transaction.from.toLowerCase() !== config.deployerAddress.toLowerCase()) throw new Error('Unexpected deployment identity or deployment method');
  if (BigInt(config.deploymentBlock ?? -1) !== receipt.blockNumber) throw new Error('Deployment block mismatch');
  const runtimeCodeHash = keccak256(code);
  if (config.runtimeCodeHash && runtimeCodeHash !== config.runtimeCodeHash) throw new Error('Runtime code hash mismatch');
  return { contractAddress: config.contractAddress, deployerAddress: transaction.from, deploymentBlock: Number(receipt.blockNumber), runtimeCodeHash,
    finalizedBlock: Number(block.number), finalizedBlockHash: block.hash, runtimeCodeBytes: (code.length - 2) / 2 };
}
