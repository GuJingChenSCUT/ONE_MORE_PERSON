import fs from 'node:fs';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { monadTestnet } from 'viem/chains';
import { compile } from './compile.mjs';
import { verifyDeployment } from '../lib/deployment.mjs';
import { verifyEvidence } from '../lib/replay.mjs';

try {
  const config = JSON.parse(fs.readFileSync(new URL('../config/monad.testnet.json', import.meta.url)));
  const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || config.rpcUrl, { timeout: 15000, retryCount: 1 }) });
  const artifact = compile();
  const deployment = await verifyDeployment(client, config, artifact);
  const toBlock = BigInt(deployment.finalizedBlock), events = [];
  for (let fromBlock = BigInt(config.deploymentBlock); fromBlock <= toBlock; fromBlock += 1000n) {
    const end = fromBlock + 999n < toBlock ? fromBlock + 999n : toBlock;
    const logs = await client.getLogs({ address: config.contractAddress, fromBlock, toBlock: end });
    events.push(...logs.map(log => ({ ...decodeEventLog({ abi: artifact.abi, data: log.data, topics: log.topics }), transactionHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.logIndex })));
  }
  const finalSeats = await client.readContract({ address: config.contractAddress, abi: artifact.abi, functionName: 'getSeats', blockNumber: toBlock });
  const evidence = JSON.parse(JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), mode: 'monad-testnet', chainId: 10143,
    ...deployment, fromBlock: config.deploymentBlock, toBlock, blockHash: deployment.finalizedBlockHash, finalSeats, events }, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  const result = verifyEvidence(evidence);
  fs.writeFileSync(new URL('../research/validation/monad-evidence.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ ...result, ...deployment }));
} catch (error) { console.error(error.shortMessage ?? error.message); process.exitCode = 1; }
