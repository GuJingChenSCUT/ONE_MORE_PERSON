import fs from 'node:fs';
import { createPublicClient, http } from 'viem';
import { monadTestnet } from 'viem/chains';
import { compile } from './compile.mjs';
import { verifyDeployment } from '../lib/deployment.mjs';

const config = JSON.parse(fs.readFileSync(new URL('../config/monad.testnet.json', import.meta.url)));
const client = createPublicClient({ chain: monadTestnet, transport: http(process.env.MONAD_RPC_URL || config.rpcUrl, { timeout: 15000, retryCount: 1 }) });
try {
  const [chainId, latest, finalized] = await Promise.all([client.getChainId(), client.getBlock(), client.getBlock({ blockTag: 'finalized' })]);
  if (chainId !== 10143 || config.chainId !== 10143) throw new Error('Unexpected network');
  const result = { checkedAt: new Date().toISOString(), chainId, latestBlock: Number(latest.number), finalizedBlock: Number(finalized.number),
    finalizedBlockHash: finalized.hash, latestGasLimit: Number(latest.gasLimit), contractConfigured: !!config.contractAddress, deploymentVerified: false };
  if (config.contractAddress) Object.assign(result, await verifyDeployment(client, config, compile()), { deploymentVerified: true });
  fs.mkdirSync(new URL('../research/validation/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../research/validation/network.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} catch (error) { console.error(error.shortMessage ?? error.message); process.exitCode = 1; }
