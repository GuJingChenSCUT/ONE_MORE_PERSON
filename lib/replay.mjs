// No RPC or signing dependency: this verifier also runs directly in the browser.
const zeroAddress = '0x0000000000000000000000000000000000000000';

const address = value => {
  if (!/^0x[0-9a-f]{40}$/i.test(value ?? '')) throw new Error('Invalid event address');
  return value.toLowerCase();
};
const integer = value => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error('Invalid event integer');
  return number;
};
const demand = (condition, message) => { if (!condition) throw new Error(message); };

/** Independent event reconstruction. Input must contain the full ordered log range.
 * It verifies state transitions, not participant identities or institutional fulfilment.
 */
export function replaySeats(events) {
  const seats = [], nonces = new Map(), batches = [], pending = [];
  let pendingTx = null, initialized = false;
  for (const event of events) {
    const a = event.args;
    if (pendingTx && event.transactionHash !== pendingTx) throw new Error('Incomplete execution event batch');
    if (event.eventName === 'SeatSeeded') {
      demand(!initialized && !batches.length, 'Seed event after pool initialization');
      demand(integer(a.seat) === seats.length + 1 && seats.length < 12, 'Missing or duplicate seed event');
      const holder = address(a.holder);
      demand(holder === zeroAddress || !seats.includes(holder), 'Participant seeded twice');
      seats.push(holder);
    } else if (event.eventName === 'ConsentCancelled') {
      initialized = true;
      const person = address(a.participant), next = BigInt(a.nonce);
      demand(next === (nonces.get(person) ?? 0n) + 1n, 'Cancellation nonce discontinuity');
      nonces.set(person, next);
    } else if (event.eventName === 'PoolApproved') {
      initialized = true;
    } else if (event.eventName === 'SeatMoved') {
      initialized = true;
      demand(typeof event.transactionHash === 'string', 'Missing transaction hash');
      pendingTx = event.transactionHash;
      pending.push(a);
    } else if (event.eventName === 'PlanExecuted') {
      demand(pending.length > 0 && pendingTx === event.transactionHash, 'Execution has no matching moves');
      demand(integer(a.moved) === pending.length, 'Move count mismatch');
      const people = new Set(), targets = new Set();
      let additional = 0;
      for (const move of pending) {
        const person = address(move.participant), from = integer(move.fromSeat), to = integer(move.toSeat);
        demand(move.planHash === a.planHash, 'Mixed plan hashes');
        demand(person !== zeroAddress && !people.has(person), 'Duplicate or empty participant');
        demand(from <= seats.length && to > 0 && to <= seats.length && from !== to && !targets.has(to), 'Invalid or duplicate target');
        demand(seats.indexOf(person) + 1 === from, 'Event source does not match reconstructed holder');
        demand(BigInt(move.nonce) === (nonces.get(person) ?? 0n) + 1n, 'Move nonce discontinuity');
        people.add(person); targets.add(to);
        if (!from) additional++;
      }
      for (const move of pending) {
        const occupant = seats[integer(move.toSeat) - 1];
        demand(occupant === zeroAddress || people.has(occupant), 'Unconsenting occupant overwritten');
      }
      demand(integer(a.additionalPeople) === additional, 'Additional attendee count mismatch');
      // Clear before setting: sequential assignment would corrupt cycles.
      for (const move of pending) if (integer(move.fromSeat)) seats[integer(move.fromSeat) - 1] = zeroAddress;
      for (const move of pending) {
        seats[integer(move.toSeat) - 1] = address(move.participant);
        nonces.set(address(move.participant), BigInt(move.nonce));
      }
      batches.push({ planHash: a.planHash, moved: pending.length, additionalPeople: additional, transactionHash: pendingTx });
      pending.length = 0; pendingTx = null;
    }
  }
  demand(!pending.length && seats.length > 0, 'Incomplete event history');
  return { seats, nonces: Object.fromEntries([...nonces].map(([key, value]) => [key, value.toString()])), batches };
}

export function verifyEvidence(evidence) {
  demand(evidence.schemaVersion === 1, 'Unsupported evidence schema');
  demand(evidence.mode === 'local-evm' ? evidence.chainId === 31337 : evidence.mode === 'monad-testnet' && evidence.chainId === 10143, 'Evidence network mismatch');
  const result = replaySeats(evidence.events);
  demand(JSON.stringify(result.seats) === JSON.stringify(evidence.finalSeats.map(address)), 'Reconstructed seats differ from the recorded snapshot');
  return { verified: true, mode: evidence.mode, chainId: evidence.chainId, seatCount: result.seats.length,
    assignedPeople: result.seats.filter(holder => holder !== zeroAddress).length,
    executedPlans: result.batches.length, additionalPeople: result.batches.reduce((sum, batch) => sum + batch.additionalPeople, 0) };
}
