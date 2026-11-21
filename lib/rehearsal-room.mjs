import { createPublicClient, createWalletClient, custom, defineChain, decodeEventLog, encodeDeployData, recoverTypedDataAddress, zeroAddress } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { buildPlan, consentTypedData, executionReadiness, movesForContract, poolConfigHash, poolConstructorArgs, TERMS_HASH } from './live-protocol.mjs';
import { matchesRuntime } from './deployment.mjs';
import { randomUUID } from 'node:crypto';

export const roles = ['alice', 'bob', 'charlie'];
export const names = ['Alice', 'Bob', 'Charlie'];
const serial = x => JSON.parse(JSON.stringify(x, (_, v) => typeof v === 'bigint' ? v.toString() : v));
export async function createRehearsalRoom(provider, artifact) {
  const instanceId = randomUUID();
  if (Number(await provider.request({ method: 'eth_chainId' })) !== 31337) throw new Error('Rehearsal requires the isolated local chain 31337');
  const chain = defineChain({ id: 31337, name: 'Local rehearsal', nativeCurrency: { name: 'Test only', symbol: 'TEST', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1'] } } });
  // Public Hardhat fixture identities, exclusively on the in-process local EVM.
  const accounts = roles.map((_, addressIndex) => mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }));
  const wallets = accounts.map(account => createWalletClient({ account, chain, transport: custom(provider) }));
  const client = createPublicClient({ chain, transport: custom(provider), cacheTime: 0, pollingInterval: 10 });
  let room, version = 0, round = 0, queue = Promise.resolve();
  const subscribers = new Set();
  const read = (functionName, args = [], blockNumber) => client.readContract({ address: room.pool.contractAddress, abi: artifact.abi, functionName, args, blockNumber });
  async function snapshot() {
    const block = await client.getBlock();
    const [seats, approvals, nonces, seatOf] = await Promise.all([
      read('getSeats', [], block.number), read('approvals', [], block.number),
      Promise.all(accounts.map(a => read('nonces', [a.address], block.number))),
      Promise.all(accounts.map(a => read('seatOf', [a.address], block.number))),
    ]);
    return serial({ blockNumber: block.number, blockHash: block.hash, timestamp: block.timestamp, seats, approvals, nonces, seatOf });
  }
  function record(action, receipt) {
    const events = receipt.logs.flatMap(log => { try { return [decodeEventLog({ abi: artifact.abi, data: log.data, topics: log.topics })]; } catch { return []; } });
    room.transactions.push(serial({ action, hash: receipt.transactionHash, status: receipt.status, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed, events }));
    return receipt;
  }
  async function send(index, action, functionName, args = []) {
    const hash = await wallets[index].writeContract({ address: room.pool.contractAddress, abi: artifact.abi, functionName, args, gas: 2_000_000n });
    return record(action, await client.waitForTransactionReceipt({ hash }));
  }
  function state() { return serial({ ...room, instanceId, version, mode: 'local-evm-rehearsal', chainId: 31337, actors: roles.map((role, i) => ({ role, name: names[i], address: accounts[i].address })), readiness: executionReadiness(room, room.snapshot) }); }
  async function publish() {
    room.snapshot = await snapshot(); version++;
    const value = state(); subscribers.forEach(fn => fn(value)); return value;
  }
  async function reset() {
    const closesAt = ((await client.getBlock()).timestamp + 86400n).toString();
    const participants = accounts.map(a => a.address);
    const args = poolConstructorArgs({ participants, closesAt });
    const hash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args, gas: 6_000_000n });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') throw new Error('Local deployment failed');
    const tx = await client.getTransaction({ hash });
    const code = await client.getBytecode({ address: receipt.contractAddress });
    if (!matchesRuntime(code, artifact) || tx.from.toLowerCase() !== participants[0].toLowerCase() || tx.input !== encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args })) throw new Error('Deployment identity or bytecode verification failed');
    room = { round: ++round, pool: { chainId: 31337, contractAddress: receipt.contractAddress, deployerAddress: participants[0], deploymentTransaction: hash, deploymentBlock: receipt.blockNumber.toString(), participants, closesAt, termsHash: TERMS_HASH }, plan: null, signatures: {}, transactions: [], activity: ['New rehearsal. Alice holds morning; Bob holds afternoon; Sunday is empty.'], lastResult: null, verifiedDeployment: true };
    record('Deploy verified product contract', receipt);
    return publish();
  }
  async function action(role, type, payload = {}) {
    const index = roles.indexOf(role);
    if (index < 0) throw new Error('Choose a demo identity first');
    if (type === 'reset') { if (role !== 'alice') throw new Error('Alice controls the rehearsal restart'); return reset(); }
    if (type === 'approve') {
      if (index > 1) throw new Error('Only Alice and Bob represent hosts');
      const receipt = await send(index, `${names[index]} approved the pool`, 'approvePool', [poolConfigHash(room.pool)]);
      if (receipt.status !== 'success') throw new Error('Host approval reverted');
      room.activity.push(`${names[index]} approved the fixed pool as host ${index === 0 ? 'A' : 'B'}.`);
    } else if (type === 'plan') {
      if (role !== 'alice') throw new Error('Alice coordinates the shared plan');
      const current = await snapshot();
      if (Number(current.approvals) !== 3) throw new Error('Alice and Bob must approve the pool first');
      if (current.seatOf.join(',') !== '1,2,0') throw new Error('Relay already completed. Restart for a new rehearsal');
      if (room.plan && executionReadiness(room, current).stage === 'active') throw new Error('An active plan already exists; withdraw before replacing it');
      room.plan = buildPlan(room.pool, current.nonces, (BigInt(room.pool.closesAt) - 60n).toString());
      room.signatures = {}; room.lastResult = null;
      room.activity.push('A fresh shared plan is ready. All three participants must sign this exact version.');
    } else if (type === 'signature') {
      if (!room.plan || payload.planHash !== room.plan.planHash || payload.contractAddress !== room.pool.contractAddress) throw new Error('Plan changed. Review the current plan and sign again');
      const current = await snapshot();
      if (executionReadiness(room, current).stage !== 'active') throw new Error('This plan is no longer active. Ask Alice to create a fresh plan');
      const recovered = await recoverTypedDataAddress({ ...consentTypedData(room.pool, room.plan, accounts[index].address, 31337), signature: payload.signature });
      if (recovered.toLowerCase() !== accounts[index].address.toLowerCase()) throw new Error('Signature does not belong to this participant');
      room.signatures[accounts[index].address.toLowerCase()] = payload.signature;
      room.activity.push(`${names[index]} signed the complete plan in their own browser page.`);
    } else if (type === 'cancel') {
      if (!room.plan || executionReadiness(room, await snapshot()).stage !== 'active') throw new Error('No active plan to withdraw from');
      const before = await read('getSeats');
      const receipt = await send(index, `${names[index]} withdrew consent`, 'cancelConsent');
      if (receipt.status !== 'success' || JSON.stringify(before) !== JSON.stringify(await read('getSeats'))) throw new Error('Cancellation invariant failed');
      room.activity.push(`${names[index]} withdrew consent on the local chain. Every original seat is still held.`);
      room.lastResult = { kind: 'withdrawal', message: `${names[index]} withdrew. The old plan is invalid; seats are unchanged.`, hash: receipt.transactionHash };
    } else if (type === 'execute') {
      if (!room.plan) throw new Error('Create a shared plan first');
      const before = await snapshot();
      const stage = executionReadiness(room, before).stage;
      const signatures = room.plan.moves.map(m => room.signatures[m.participant.toLowerCase()] ?? '0x');
      const receipt = await send(index, 'Attempt full relay', 'execute', [movesForContract(room.plan), BigInt(room.plan.validUntil), signatures]);
      const after = await snapshot();
      const unchanged = JSON.stringify(before.seats) === JSON.stringify(after.seats);
      if (receipt.status === 'reverted' && !unchanged) throw new Error('Rejected plan changed seats');
      const reason = stage === 'completed' ? 'Already-used plan rejected' : stage === 'stale' ? 'Withdrawn plan rejected' : Object.keys(room.signatures).length < 3 ? 'Missing consent rejected' : 'Plan rejected';
      room.lastResult = { kind: receipt.status === 'success' ? 'success' : 'rejected', message: receipt.status === 'success' ? 'All three moves succeeded together. Same 3 seats, now 3 people attending.' : `${reason} by the contract. Every seat is unchanged.`, hash: receipt.transactionHash, originalSeatsPreserved: unchanged };
      room.activity.push(room.lastResult.message);
    } else throw new Error('Unknown action');
    return publish();
  }
  await reset();
  return { state, subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }, act(role, type, payload) {
    const task = queue.then(() => action(role, type, payload)); queue = task.catch(() => {}); return task;
  } };
}
