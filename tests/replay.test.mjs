import test from 'node:test';
import assert from 'node:assert/strict';
import { zeroAddress } from 'viem';
import { replaySeats } from '../lib/replay.mjs';
const [alice, bob, carol] = [1, 2, 3].map(n => `0x${n.toString().padStart(40, '0')}`);
const seed = [alice, bob, zeroAddress].map((holder, i) => ({ eventName: 'SeatSeeded', args: { seat: i + 1, holder }, transactionHash: 'seed' }));
const batch = [
  ...[[alice, 1, 2], [bob, 2, 3], [carol, 0, 1]].map(([participant, fromSeat, toSeat]) => ({ eventName: 'SeatMoved', transactionHash: 'relay', args: { planHash: 'plan', participant, fromSeat, toSeat, nonce: 1 } })),
  { eventName: 'PlanExecuted', transactionHash: 'relay', args: { planHash: 'plan', moved: 3, additionalPeople: 1 } },
];
test('independent replay reconstructs a vacancy chain and rejects incomplete evidence', () => {
  assert.deepEqual(replaySeats([...seed, ...batch]).seats, [carol, alice, bob]);
  assert.throws(() => replaySeats([...seed, ...batch.slice(0, -1)]), /Incomplete/);
  assert.throws(() => replaySeats([...seed.slice(1), ...batch]), /seed/);
});
test('replay detects a tampered source, repeated event and wrong metric', () => {
  const source = structuredClone(batch); source[0].args.fromSeat = 0;
  assert.throws(() => replaySeats([...seed, ...source]), /source/);
  assert.throws(() => replaySeats([...seed, ...batch, ...batch]), /source|nonce/);
  const metric = structuredClone(batch); metric.at(-1).args.additionalPeople = 2;
  assert.throws(() => replaySeats([...seed, ...metric]), /count/);
});
