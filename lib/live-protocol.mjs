import { concat, encodeAbiParameters, getAddress, isAddress, keccak256, recoverTypedDataAddress, toHex, zeroAddress } from 'viem';

export const CHAIN_ID = 10143;
export const SESSION_KIND = 'one-more-person-live-relay';
export const TERMS = 'One More Person judge-led testnet demo v1. Three fictional workshop seats in Guangzhou local time: Saturday at 10:00 AM, Saturday at 2:00 PM, Sunday at 2:00 PM. No ticket, money, identity or real-world attendance is represented. Participant A may occupy seats 1 or 2; B seats 2 or 3; C seat 1. Hosts A and B approve this fixed configuration. A signed move executes only with every signature for the exact same plan; cancellation becomes effective when its nonce transaction is included before execution.';
export const TERMS_HASH = keccak256(toHex(TERMS));
export const CONSENT_TYPES = { Consent: [
  { name: 'planHash', type: 'bytes32' }, { name: 'participant', type: 'address' },
  { name: 'fromSeat', type: 'uint256' }, { name: 'toSeat', type: 'uint256' },
  { name: 'nonce', type: 'uint256' }, { name: 'validUntil', type: 'uint256' },
] };
const MOVE_TYPEHASH = keccak256(toHex('Move(address participant,uint256 fromSeat,uint256 toSeat,uint256 nonce)'));
const hashRE = /^0x[0-9a-f]{64}$/i;
const sigRE = /^0x(?:[0-9a-f]{128}|[0-9a-f]{130})$/i;
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export function uint(value, label = 'number') {
  const text = String(value);
  if (!/^(0|[1-9][0-9]{0,77})$/.test(text)) throw new Error(`Invalid ${label}`);
  const n = BigInt(text);
  if (n >= 2n ** 256n) throw new Error(`Invalid ${label}`);
  return n;
}

export function address(value, label = 'address') {
  if (typeof value !== 'string' || !isAddress(value) || same(value, zeroAddress)) throw new Error(`Invalid ${label}`);
  return getAddress(value);
}

export function validateParticipants(values) {
  if (!Array.isArray(values) || values.length !== 3) throw new Error('Exactly three participant wallets are required');
  const participants = values.map((value, index) => address(value, `participant ${index + 1}`));
  if (new Set(participants.map(x => x.toLowerCase())).size !== 3) throw new Error('Use three different participant wallets');
  return participants;
}

export function poolConstructorArgs({ participants, closesAt }) {
  const people = validateParticipants(participants);
  return [people[0], people[1], uint(closesAt, 'pool deadline'), TERMS_HASH,
    [people[0], people[1], zeroAddress], people, [3n, 6n, 1n]];
}

export function poolConfigHash(pool) {
  return keccak256(encodeAbiParameters([
    { type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'bytes32' },
    { type: 'address[]' }, { type: 'address[]' }, { type: 'uint256[]' },
  ], poolConstructorArgs(pool)));
}

export function normalizePool(raw) {
  if (!raw || typeof raw !== 'object' || raw.chainId !== CHAIN_ID) throw new Error('This app accepts Monad Testnet (10143) only');
  const participants = validateParticipants(raw.participants);
  if (!hashRE.test(raw.deploymentTransaction ?? '')) throw new Error('A deployment transaction hash is required');
  const pool = { chainId: CHAIN_ID, contractAddress: address(raw.contractAddress, 'pool contract'),
    deployerAddress: address(raw.deployerAddress, 'deployer'), deploymentTransaction: raw.deploymentTransaction.toLowerCase(),
    deploymentBlock: uint(raw.deploymentBlock, 'deployment block').toString(), participants,
    closesAt: uint(raw.closesAt, 'pool deadline').toString(), termsHash: TERMS_HASH };
  if (!same(raw.termsHash, TERMS_HASH)) throw new Error('Unknown terms: this page accepts only the published judge-demo rules');
  return pool;
}

export function hashPlan(moves) {
  return keccak256(concat(moves.map(m => keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
    [MOVE_TYPEHASH, m.participant, uint(m.fromSeat), uint(m.toSeat), uint(m.nonce)],
  )))));
}

export function buildPlan(pool, nonces, validUntil) {
  if (!Array.isArray(nonces) || nonces.length !== 3) throw new Error('Three live nonces are required');
  const moves = pool.participants.map((participant, index) => ({ participant,
    fromSeat: ['1', '2', '0'][index], toSeat: ['2', '3', '1'][index], nonce: uint(nonces[index], 'consent nonce').toString() }));
  const deadline = uint(validUntil, 'plan deadline');
  if (deadline > uint(pool.closesAt) || deadline === 0n) throw new Error('Plan deadline must be inside the pool deadline');
  return { moves, validUntil: deadline.toString(), planHash: hashPlan(moves) };
}

export function normalizePlan(raw, pool) {
  if (!raw || !Array.isArray(raw.moves) || raw.moves.length !== 3) throw new Error('The demo requires exactly three moves');
  const expected = buildPlan(pool, raw.moves.map(x => x?.nonce), raw.validUntil);
  for (let i = 0; i < 3; i++) {
    const move = raw.moves[i];
    if (!same(move?.participant, expected.moves[i].participant)
      || uint(move.fromSeat) !== uint(expected.moves[i].fromSeat)
      || uint(move.toSeat) !== uint(expected.moves[i].toSeat)) throw new Error('Imported moves do not match the displayed three-seat relay');
  }
  if (!same(raw.planHash, expected.planHash)) throw new Error('Plan hash mismatch: the imported plan was changed');
  return expected;
}

export function consentTypedData(pool, plan, participant, chainId = CHAIN_ID) {
  const move = plan.moves.find(m => same(m.participant, participant));
  if (!move) throw new Error('This wallet is not a participant in the plan');
  return { domain: { name: 'OneMorePerson', version: '0.2', chainId, verifyingContract: pool.contractAddress },
    types: CONSENT_TYPES, primaryType: 'Consent', message: {
      planHash: plan.planHash, participant: move.participant, fromSeat: uint(move.fromSeat),
      toSeat: uint(move.toSeat), nonce: uint(move.nonce), validUntil: uint(plan.validUntil),
    } };
}

export function movesForContract(plan) {
  return plan.moves.map(m => ({ participant: m.participant, fromSeat: uint(m.fromSeat), toSeat: uint(m.toSeat), nonce: uint(m.nonce) }));
}

export function normalizeSession(raw) {
  if (!raw || raw.kind !== SESSION_KIND || raw.schemaVersion !== 1) throw new Error('Not a One More Person live session');
  const pool = normalizePool(raw.pool);
  const plan = raw.plan ? normalizePlan(raw.plan, pool) : null;
  const signatures = {};
  const source = raw.signatures ?? {};
  if (typeof source !== 'object' || Array.isArray(source) || Object.keys(source).length > 3) throw new Error('Invalid signature collection');
  for (const [signer, signature] of Object.entries(source)) {
    const who = address(signer, 'signature owner').toLowerCase();
    if (!plan || !pool.participants.some(p => same(p, who)) || !sigRE.test(signature)) throw new Error('Invalid participant signature');
    signatures[who] = signature;
  }
  return { schemaVersion: 1, kind: SESSION_KIND, pool, plan, signatures };
}

export function sessionText(session) { return JSON.stringify(normalizeSession(session), null, 2); }
export function parseSession(text) {
  if (typeof text !== 'string' || text.length > 24000) throw new Error('Session is too large');
  return normalizeSession(JSON.parse(text));
}

export async function verifySessionSignatures(session, chainId = CHAIN_ID) {
  if (!session.plan && Object.keys(session.signatures).length) throw new Error('Signatures require a plan');
  for (const [signer, signature] of Object.entries(session.signatures)) {
    const recovered = await recoverTypedDataAddress({ ...consentTypedData(session.pool, session.plan, signer, chainId), signature });
    if (!same(signer, recovered)) throw new Error('Signature does not approve this exact plan, contract and network');
  }
  return true;
}

export function mergeSessions(current, incoming) {
  if (!current) return incoming;
  const a = current.pool, b = incoming.pool;
  if (!same(a.contractAddress, b.contractAddress) || a.chainId !== b.chainId
    || poolConfigHash(a) !== poolConfigHash(b) || !same(a.deploymentTransaction, b.deploymentTransaction)) {
    throw new Error('Different pool. Clear this session before importing another pool');
  }
  if (current.plan && incoming.plan && (current.plan.planHash !== incoming.plan.planHash || current.plan.validUntil !== incoming.plan.validUntil)) {
    throw new Error('Different plan or deadline. Clear the current plan before replacing it');
  }
  return { ...current, plan: current.plan ?? incoming.plan, signatures: { ...current.signatures, ...incoming.signatures } };
}

export function checkSnapshot(session, snapshot, { requireSignatures = false } = {}) {
  if (!session.plan) throw new Error('Build or import a shared plan first');
  if (snapshot.approvals !== 3) throw new Error('Both hosts must approve the pool first');
  if (uint(snapshot.timestamp) >= uint(session.plan.validUntil) || uint(snapshot.timestamp) >= uint(session.pool.closesAt)) throw new Error('The plan has expired; your existing seats remain unchanged');
  for (let i = 0; i < 3; i++) {
    const move = session.plan.moves[i];
    if (uint(snapshot.nonces[i]) !== uint(move.nonce)) throw new Error('Consent was cancelled or already used. The old plan cannot execute');
    if (uint(snapshot.seatOf[i]) !== uint(move.fromSeat)) throw new Error('Seat ownership changed. Build a fresh plan');
  }
  if (requireSignatures && Object.keys(session.signatures).length !== 3) throw new Error('All three real wallet signatures are required');
  return true;
}

// UI state comes from the finalized snapshot, not from the number of collected signatures.
export function executionReadiness(session, snapshot) {
  if (!session?.plan || !snapshot) return { stage: 'none', canExecute: false };
  const plan = session.plan;
  const completed = plan.moves.every((move, index) => uint(snapshot.seatOf[index]) === uint(move.toSeat)
    && uint(snapshot.nonces[index]) > uint(move.nonce));
  if (completed) return { stage: 'completed', canExecute: false };
  if (uint(snapshot.timestamp) >= uint(plan.validUntil) || uint(snapshot.timestamp) >= uint(session.pool.closesAt)) return { stage: 'expired', canExecute: false };
  if (plan.moves.some((move, index) => uint(snapshot.nonces[index]) !== uint(move.nonce)
    || uint(snapshot.seatOf[index]) !== uint(move.fromSeat))) return { stage: 'stale', canExecute: false };
  if (snapshot.approvals !== 3) return { stage: 'waiting', canExecute: false };
  return { stage: 'active', canExecute: Object.keys(session.signatures).length === 3 };
}
