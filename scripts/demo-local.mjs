import fs from 'node:fs';
import hre from 'hardhat';
import { createPublicClient, createWalletClient, custom, defineChain, zeroAddress, keccak256, toBytes, decodeEventLog } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { compile } from './compile.mjs';
import { consentMessage } from '../lib/consent.mjs';
import { verifyEvidence } from '../lib/replay.mjs';

const connection = await hre.network.connect('local');
try {
  const chain = defineChain({ id: 31337, name: 'Local EVM only', nativeCurrency: { name: 'Test', symbol: 'TEST', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1'] } } });
  // Public Hardhat fixture accounts, for this isolated in-process network only.
  const accounts = Array.from({ length: 6 }, (_, addressIndex) => mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }));
  const wallets = accounts.map(account => createWalletClient({ account, chain, transport: custom(connection.provider) }));
  const client = createPublicClient({ chain, transport: custom(connection.provider), cacheTime: 0, pollingInterval: 10 });
  const artifact = compile();
  const closesAt = (await client.getBlock()).timestamp + 3600n;
  const deploymentHash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode,
    args: [accounts[0].address, accounts[1].address, closesAt, keccak256(toBytes('FICTITIOUS LOCAL DEMO: no real institutional seats')),
      [accounts[2].address, accounts[3].address, zeroAddress], accounts.slice(2, 5).map(a => a.address), [7n, 7n, 1n]], gas: 6_000_000n });
  const deployment = await client.waitForTransactionReceipt({ hash: deploymentHash });
  if (deployment.status !== 'success') throw new Error('Local deployment failed');
  const contractAddress = deployment.contractAddress;
  const read = (functionName, args = []) => client.readContract({ address: contractAddress, abi: artifact.abi, functionName, args });
  const send = async (wallet, functionName, args = []) => client.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: contractAddress, abi: artifact.abi, functionName, args, gas: 2_000_000n }) });
  const configHash = await read('configHash');
  for (const wallet of wallets.slice(0, 2)) if ((await send(wallet, 'approvePool', [configHash])).status !== 'success') throw new Error('Host approval failed');
  const moves = [
    { participant: accounts[2].address, fromSeat: 1n, toSeat: 2n, nonce: 0n },
    { participant: accounts[3].address, fromSeat: 2n, toSeat: 3n, nonce: 0n },
    { participant: accounts[4].address, fromSeat: 0n, toSeat: 1n, nonce: 0n },
  ];
  const validUntil = closesAt - 60n;
  const signatures = await Promise.all(accounts.slice(2, 5).map(account => account.signTypedData(consentMessage({ chainId: 31337, contractAddress, moves, participant: account.address, validUntil }))));
  const initialSeats = await read('getSeats');
  const rejected = await send(wallets[5], 'execute', [moves, validUntil, [signatures[0], '0x', signatures[2]]]);
  const afterRejected = await read('getSeats');
  if (rejected.status !== 'reverted' || JSON.stringify(initialSeats) !== JSON.stringify(afterRejected)) throw new Error('Failure path changed a seat');
  const executed = await send(wallets[5], 'execute', [moves, validUntil, signatures]);
  if (executed.status !== 'success') throw new Error('Complete plan failed');
  const block = await client.getBlock({ blockNumber: executed.blockNumber });
  const logs = await client.getLogs({ address: contractAddress, fromBlock: deployment.blockNumber, toBlock: block.number });
  const events = logs.map(log => ({ ...decodeEventLog({ abi: artifact.abi, data: log.data, topics: log.topics }), transactionHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.logIndex }));
  const evidence = { schemaVersion: 1, generatedAt: new Date().toISOString(), mode: 'local-evm', chainId: 31337,
    notice: 'In-process EVM with fictitious participants. Not a Monad transaction or performance benchmark.',
    contractAddress, deploymentTransaction: deploymentHash, fromBlock: deployment.blockNumber, toBlock: block.number, blockHash: block.hash,
    failure: { transactionHash: rejected.transactionHash, status: rejected.status, originalSeatsPreserved: true },
    success: { transactionHash: executed.transactionHash, status: executed.status },
    initialSeats, finalSeats: await read('getSeats'), events };
  const serializable = JSON.parse(JSON.stringify(evidence, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  const verification = verifyEvidence(serializable);
  fs.mkdirSync(new URL('../research/validation/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../research/validation/local-demo.json', import.meta.url), JSON.stringify(serializable, null, 2) + '\n');
  console.log(JSON.stringify({ ...verification, failurePreservedSeats: true, file: 'research/validation/local-demo.json' }));
} finally { await connection.close(); }
