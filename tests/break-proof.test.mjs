import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifyBreakSnapshot, verifyBreakOnChain, verifyCancellationSnapshot } from '../lib/break-proof.mjs';
const evidence = JSON.parse(fs.readFileSync(new URL('../research/validation/monad-proof-evidence.json', import.meta.url), 'utf8'));
const changed = edit => { const record = structuredClone(evidence); edit(record); return record; };

test('judge proof checks both rejected inner calls and the 2-to-3 event replay', () => {
  const result = verifyBreakSnapshot(evidence);
  assert.equal(result.scope, 'snapshot-consistency');
  assert.equal(result.rejectedInternalCalls, 2);
  assert.equal(result.additionalPeople, 1);
  assert.equal(result.assignedPeople, 3);
});

test('judge proof rejects forged safety evidence, wrong provenance and incomplete histories', () => {
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.proofEvents[0].args.revertSelector = '0x00000000'; })), /Missing-consent/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.proofEvents[0].args.seatsHash = e.proofEvents[1].args.seatsHash; })), /original seats/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.proofEvents[1].args.seatsHash = e.proofEvents[0].args.seatsHash; })), /final seats/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.proofEvents.pop(); })), /Missing rejection/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.events[5].transactionHash = '0x' + '01'.repeat(32); })), /Incomplete|matching|provenance/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.events[6].logIndex = e.events[5].logIndex; })), /Unordered/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.proofHash = '0x' + '01'.repeat(32); })), /identity/);
  assert.throws(() => verifyBreakSnapshot(changed(e => { e.deployment.finalizedBlock = '1'; })), /range/);
});

test('fresh RPC verification fails closed on wrong network or failed receipt', async () => {
  await assert.rejects(() => verifyBreakOnChain({ getChainId: async () => 1 }, evidence), /wrong network/);
  await assert.rejects(() => verifyBreakOnChain({ getChainId: async () => 10143,
    getTransactionReceipt: async () => ({ status: 'reverted', transactionHash: evidence.proofHash }) }, evidence), /not successful/);
});

test('withdrawal proof links the preserved seat to cancellation and fresh consent', () => {
  const record = JSON.parse(fs.readFileSync(new URL('../research/validation/cancellation-proof.json', import.meta.url), 'utf8'));
  const result = verifyCancellationSnapshot(record);
  assert.equal(result.rejectedInternalCalls, 3);
  assert.equal(result.withdrawalProved, true);
  assert.equal(result.additionalPeople, 1);
  const altered = edit => { const value = structuredClone(record); edit(value); return value; };
  assert.throws(() => verifyCancellationSnapshot(altered(e => { e.proofEvents[1].args.oldNonce = '1'; })), /Withdrawal changed/);
  assert.throws(() => verifyCancellationSnapshot(altered(e => { e.proofEvents[2].args.seatsHash = e.proofEvents[3].args.seatsHash; })), /Withdrawn plan/);
  assert.throws(() => verifyCancellationSnapshot(altered(e => { e.events = e.events.filter(event => event.eventName !== 'ConsentCancelled'); })), /nonce|cancellation/);
  assert.throws(() => verifyCancellationSnapshot(altered(e => {
    const moved = e.events.find(event => event.eventName === 'SeatMoved' && event.args.participant.toLowerCase() === e.deployment.chen.toLowerCase());
    moved.args.nonce = '1';
  })), /nonce/);
  assert.throws(() => verifyCancellationSnapshot(altered(e => { e.proofEvents.splice(1, 1); })), /Missing rejection/);
});
