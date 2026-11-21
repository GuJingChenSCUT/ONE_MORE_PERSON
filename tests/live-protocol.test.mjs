import test from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import { createPublicClient, createWalletClient, custom, defineChain, hashTypedData, zeroAddress } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { compile } from '../scripts/compile.mjs';
import { CHAIN_ID, SESSION_KIND, TERMS_HASH, buildPlan, checkSnapshot, consentTypedData, executionReadiness, hashPlan, mergeSessions,
  movesForContract, normalizeSession, parseSession, poolConfigHash, poolConstructorArgs, sessionText, validateParticipants, verifySessionSignatures } from '../lib/live-protocol.mjs';

// Public Hardhat fixture phrase. These accounts are used ONLY on an in-process chain.
const accounts = Array.from({ length: 4 }, (_, addressIndex) => mnemonicToAccount('test test test test test test test test test test test junk', { addressIndex }));
const people = accounts.slice(0, 3).map(x => x.address);
const mockPool = { chainId: CHAIN_ID, contractAddress: accounts[3].address, deployerAddress: accounts[0].address,
  deploymentTransaction: `0x${'12'.repeat(32)}`, deploymentBlock: '1', participants: people, closesAt: '2000000000', termsHash: TERMS_HASH };
const session = (pool = mockPool, plan = buildPlan(pool, [0, 0, 0], '1999999000'), signatures = {}) => ({ schemaVersion: 1, kind: SESSION_KIND, pool, plan, signatures });

test('Live session import refuses altered network, repeated identities, terms, route, hash and oversized data', () => {
  const valid = session();
  assert.equal(parseSession(sessionText(valid)).plan.planHash, valid.plan.planHash);
  assert.throws(() => normalizeSession({ ...valid, pool: { ...mockPool, chainId: 1 } }), /Monad Testnet/);
  assert.throws(() => validateParticipants([people[0], people[0], people[2]]), /different/);
  assert.throws(() => validateParticipants([people[0], people[1], zeroAddress]), /participant/);
  assert.throws(() => normalizeSession({ ...valid, pool: { ...mockPool, termsHash: `0x${'00'.repeat(32)}` } }), /Unknown terms/);
  const changed = structuredClone(valid); changed.plan.moves[0].toSeat = '3'; changed.plan.planHash = hashPlan(changed.plan.moves);
  assert.throws(() => normalizeSession(changed), /displayed three-seat/);
  assert.throws(() => normalizeSession({ ...valid, plan: { ...valid.plan, planHash: `0x${'ab'.repeat(32)}` } }), /hash mismatch/);
  assert.throws(() => parseSession(' '.repeat(24001)), /too large/);
});

test('Three actual EOA signatures merge only for the exact plan, contract, deadline and network', async () => {
  const base = session(); let merged = session(mockPool, base.plan, {});
  for (const account of accounts.slice(0, 3)) {
    const signature = await account.signTypedData(consentTypedData(mockPool, base.plan, account.address));
    const incoming = normalizeSession(session(mockPool, base.plan, { [account.address.toLowerCase()]: signature }));
    await verifySessionSignatures(incoming); merged = mergeSessions(merged, incoming);
  }
  assert.equal(Object.keys(merged.signatures).length, 3); await verifySessionSignatures(merged);
  const changedDeadline = structuredClone(merged); changedDeadline.plan.validUntil = '1999998000';
  await assert.rejects(verifySessionSignatures(changedDeadline), /exact plan/);
  assert.throws(() => mergeSessions(merged, changedDeadline), /Different plan or deadline/);
  const otherPool = structuredClone(merged); otherPool.pool.contractAddress = people[2];
  await assert.rejects(verifySessionSignatures(otherPool), /exact plan/);
  assert.throws(() => mergeSessions(merged, otherPool), /Different pool/);
  await assert.rejects(verifySessionSignatures(merged, 1), /exact plan/);
});

test('Live wallet protocol on local EVM: two hosts, real signatures, cancellation, fresh consent and atomic execution', async t => {
  const connection = await hre.network.connect('local'); const provider = connection.provider;
  const chain = defineChain({ id: 31337, name: 'Local EVM only', nativeCurrency: { name: 'Test', symbol: 'TEST', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1'] } } });
  const client = createPublicClient({ chain, transport: custom(provider), cacheTime: 0, pollingInterval: 10 });
  const wallets = accounts.map(account => createWalletClient({ account, chain, transport: custom(provider) }));
  const artifact = compile(); let pool, active;
  const read = (name, args = []) => client.readContract({ address: pool.contractAddress, abi: artifact.abi, functionName: name, args });
  async function send(wallet, name, args = []) {
    const hash = await wallet.writeContract({ address: pool.contractAddress, abi: artifact.abi, functionName: name, args, gas: 2000000n });
    return client.waitForTransactionReceipt({ hash });
  }
  async function snapshot() {
    const block = await client.getBlock(); const nonces = [], seatOf = [];
    for (const person of people) { nonces.push((await read('nonces', [person])).toString()); seatOf.push((await read('seatOf', [person])).toString()); }
    return { timestamp: block.timestamp.toString(), approvals: Number(await read('approvals')), seats: await read('getSeats'), nonces, seatOf };
  }
  async function signAll(plan) {
    const signatures = {};
    for (const account of accounts.slice(0, 3)) signatures[account.address.toLowerCase()] = await account.signTypedData(consentTypedData(pool, plan, account.address, 31337));
    return signatures;
  }
  try {
    await t.test('Direct deployment and the two hosts lock the displayed constructor rules', async () => {
      const closesAt = ((await client.getBlock()).timestamp + 3600n).toString();
      const hash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: poolConstructorArgs({ participants: people, closesAt }), gas: 6000000n });
      const receipt = await client.waitForTransactionReceipt({ hash }); assert.equal(receipt.status, 'success');
      // Session format is testnet-specific. Only the test signing domain is overridden for local EVM.
      pool = { ...mockPool, contractAddress: receipt.contractAddress, deploymentTransaction: hash, deploymentBlock: receipt.blockNumber.toString(), closesAt };
      assert.equal(await read('configHash'), poolConfigHash(pool));
      assert.equal((await send(wallets[0], 'approvePool', [poolConfigHash(pool)])).status, 'success');
      assert.equal(Number(await read('approvals')), 1);
      assert.equal((await send(wallets[1], 'approvePool', [poolConfigHash(pool)])).status, 'success');
      assert.equal(Number(await read('approvals')), 3);
      const plan = buildPlan(pool, [0, 0, 0], (BigInt(closesAt) - 60n).toString());
      active = session(pool, plan, await signAll(plan));
      await verifySessionSignatures(active, 31337);
      assert.equal(await read('hashPlan', [movesForContract(plan)]), plan.planHash);
      assert.equal(await read('consentDigest', [plan.planHash, movesForContract(plan)[0], BigInt(plan.validUntil)]), hashTypedData(consentTypedData(pool, plan, people[0], 31337)));
    });
    await t.test('A cancelled nonce invalidates the old shared session and the actual contract keeps every seat', async () => {
      const before = await read('getSeats');
      assert.equal((await send(wallets[1], 'cancelConsent')).status, 'success');
      const current = await snapshot();
      assert.deepEqual(current.seats, before);
      assert.throws(() => checkSnapshot(active, current, { requireSignatures: true }), /cancelled or already used/);
      assert.deepEqual(executionReadiness(active, current), { stage: 'stale', canExecute: false });
      const receipt = await send(wallets[3], 'execute', [movesForContract(active.plan), BigInt(active.plan.validUntil), active.plan.moves.map(m => active.signatures[m.participant.toLowerCase()])]);
      assert.equal(receipt.status, 'reverted'); assert.deepEqual(await read('getSeats'), before);
    });
    await t.test('Rebuilding with live nonces and three fresh signatures executes 2 to 3 with any relayer', async () => {
      const current = await snapshot();
      const plan = buildPlan(pool, current.nonces, active.plan.validUntil);
      active = session(pool, plan, await signAll(plan));
      assert.equal(checkSnapshot(active, current, { requireSignatures: true }), true);
      assert.deepEqual(executionReadiness(active, current), { stage: 'active', canExecute: true });
      await verifySessionSignatures(active, 31337);
      const receipt = await send(wallets[3], 'execute', [movesForContract(plan), BigInt(plan.validUntil), plan.moves.map(m => active.signatures[m.participant.toLowerCase()])]);
      assert.equal(receipt.status, 'success');
      assert.deepEqual((await read('getSeats')).map(x => x.toLowerCase()), [people[2], people[0], people[1]].map(x => x.toLowerCase()));
      const after = await snapshot(); assert.throws(() => checkSnapshot(active, after, { requireSignatures: true }), /already used/);
      assert.deepEqual(executionReadiness(active, after), { stage: 'completed', canExecute: false });
      assert.equal(after.seats.filter(x => x !== zeroAddress).length, 3);
    });
  } finally { await connection.close(); }
});
