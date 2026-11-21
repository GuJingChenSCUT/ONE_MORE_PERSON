import {
  decodeEventLog, encodeAbiParameters, keccak256, parseAbi, toFunctionSelector, toHex,
} from 'viem';
import { verifyEvidence } from './replay.mjs';
import { getLogsBounded } from './log-ranges.mjs';

// Public provenance pins for this release's independently verified fictional fixture.
// These are transaction/contract identities, not credentials or claims about real users.
export const PROOF = Object.freeze({
  chainId: 10143,
  hash: '0x20b562b401290c76d9d3070d79d8e6ac02cc80be5f504afc469cb5abc52907de',
  deploymentHash: '0x00635026bd8c5b2291043c660616ad5386ed568794892d1036ff8efce72aa70c',
  relay: '0x7D7DAB361AB5cBA009541491886b4dC9B16c450b',
  fixture: '0x6Ac08dceC963e381D12355C05a016F5229b1F2e3',
  controller: '0x59bf32CF785cC9Cc515080d0C6fe890C65d741a0',
  relayRuntimeHash: '0xc5b5c13e3777fd2588bdd64a58d67c1500fc632bbde8b54d787b791eb339b77e',
  fixtureRuntimeHash: '0xfd981c9bb16fd18e9aaec99272f028fafc8879142ffc3d279a6c69d7db5c65d5',
});

// Public identities from the separately deployed withdrawal challenge.
// A card still requires snapshot validation; fresh RPC verification is a separate step.
export const CHALLENGE_PROOF = Object.freeze({
  chainId: 10143,
  hash: '0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7',
  deploymentHash: '0x6372b72935ce6ba2b75f5ce6e8ccb9938dad5baa22ae4c618100c66e1bf5ef1c',
  relay: '0xeAC3414f47aD5Fd2F12B8A88575eBc04c4EaF378',
  fixture: '0xBBBdddD59037f1656478b7f8F9A805a887ff26Eb',
  controller: '0x59bf32CF785cC9Cc515080d0C6fe890C65d741a0',
  relayRuntimeHash: '0xbb9a0f4a5e9b3a8f316e90b34e24bde65fcdcbbbdd98b3eb930ff316b9f39aed',
  fixtureRuntimeHash: '0x35143d60c532878327052330ef3773a60057c4e86bddfb8208a273ae5c486db8',
});

const relayAbi = parseAbi([
  'function getSeats() view returns (address[])',
  'event SeatSeeded(uint256 indexed seat,address indexed holder)',
  'event PoolApproved(address indexed host,bytes32 indexed configHash)',
  'event ConsentCancelled(address indexed participant,uint256 nonce)',
  'event SeatMoved(bytes32 indexed planHash,address indexed participant,uint256 fromSeat,uint256 toSeat,uint256 nonce)',
  'event PlanExecuted(bytes32 indexed planHash,uint256 moved,uint256 additionalPeople)',
]);
const fixtureAbi = parseAbi([
  'event RejectionProved(bytes32 indexed reason,bytes4 revertSelector,bytes32 seatsHash)',
  'event WithdrawalProved(address indexed participant,uint256 oldNonce,uint256 newNonce,bytes32 seatsHash)',
  'event ProofCompleted(uint256 assignedBefore,uint256 assignedAfter)',
]);
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const demand = (condition, message) => { if (!condition) throw new Error(message); };
const plain = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
const seatsHash = seats => keccak256(encodeAbiParameters([{ type: 'address[]' }], [seats]));

/** Checks the downloaded record's internal consistency. This is not a fresh RPC check. */
function verifyFixtureSnapshot(evidence, pins, withdrawal = false) {
  demand(pins, 'Cancellation provenance has not been published');
  demand(evidence?.mode === 'monad-testnet' && evidence.chainId === pins.chainId, 'Expected Monad Testnet evidence');
  demand(evidence.fixtureType === 'single-controller-fictional-actors', 'Unexpected proof scope');
  demand(same(evidence.proofHash, pins.hash) && same(evidence.contractAddress, pins.relay), 'Unexpected proof identity');
  const deployment = evidence.deployment;
  demand(same(deployment?.fixture, pins.fixture) && same(deployment?.controller, pins.controller)
    && same(deployment?.relay, pins.relay) && same(deployment?.deploymentHash, pins.deploymentHash), 'Unexpected deployment identity');
  demand(BigInt(evidence.fromBlock) === BigInt(deployment.deploymentBlock)
    && BigInt(evidence.toBlock) === BigInt(evidence.proofBlock)
    && BigInt(evidence.fromBlock) <= BigInt(evidence.toBlock)
    && BigInt(deployment.finalizedBlock) >= BigInt(evidence.proofBlock), 'Invalid proof block range');
  const result = verifyEvidence(evidence);
  demand(result.executedPlans === 1 && result.seatCount === 3 && result.assignedPeople === 3 && result.additionalPeople === 1, 'Unexpected proof result');
  const seeded = evidence.events.filter(event => event.eventName === 'SeatSeeded');
  demand(seeded.length === 3 && seeded.every(event => same(event.transactionHash, pins.deploymentHash)), 'Unexpected seed provenance');
  const before = seeded.map(event => event.args.holder);
  demand(before.filter(holder => !same(holder, '0x0000000000000000000000000000000000000000')).length === 2, 'Unexpected initial occupancy');
  let previous = null;
  for (const event of evidence.events) {
    const block = BigInt(event.blockNumber), index = Number(event.logIndex);
    demand(block >= BigInt(evidence.fromBlock) && block <= BigInt(evidence.toBlock)
      && Number.isSafeInteger(index) && index >= 0, 'Event outside proof range');
    demand(!previous || block > previous.block || (block === previous.block && index > previous.index), 'Unordered or duplicate proof event');
    previous = { block, index };
    if (event.eventName === 'SeatMoved' || event.eventName === 'PlanExecuted') {
      demand(same(event.transactionHash, pins.hash) && block === BigInt(evidence.proofBlock), 'Unexpected execution provenance');
    }
  }
  const events = evidence.proofEvents;
  demand(Array.isArray(events) && events.length === (withdrawal ? 5 : 3), 'Missing rejection or completion proof');
  const missing = events[0], replay = events.at(-2), completed = events.at(-1);
  demand(missing.eventName === 'RejectionProved'
    && same(missing.args.reason, keccak256(toHex('missing consent')))
    && same(missing.args.revertSelector, toFunctionSelector('InvalidSignature()'))
    && same(missing.args.seatsHash, seatsHash(before)), 'Missing-consent rejection does not preserve original seats');
  const cancellations = evidence.events.filter(event => event.eventName === 'ConsentCancelled');
  demand(cancellations.length === (withdrawal ? 1 : 0), 'Unexpected consent cancellation count');
  if (withdrawal) {
    const cancelled = events[1], rejected = events[2], counter = cancellations[0];
    demand(cancelled.eventName === 'WithdrawalProved' && same(cancelled.args.participant, before[1])
      && Number(cancelled.args.oldNonce) === 0 && Number(cancelled.args.newNonce) === 1
      && same(cancelled.args.seatsHash, seatsHash(before)), 'Withdrawal changed the original seats or counter incorrectly');
    demand(same(counter.args.participant, cancelled.args.participant) && Number(counter.args.nonce) === 1
      && same(counter.transactionHash, pins.hash) && BigInt(counter.blockNumber) === BigInt(evidence.proofBlock), 'Withdrawal event does not match the consent counter');
    demand(rejected.eventName === 'RejectionProved' && same(rejected.args.reason, keccak256(toHex('withdrawn consent')))
      && same(rejected.args.revertSelector, toFunctionSelector('StaleConsent()'))
      && same(rejected.args.seatsHash, seatsHash(before)), 'Withdrawn plan rejection does not preserve original seats');
  }
  demand(replay.eventName === 'RejectionProved'
    && same(replay.args.reason, keccak256(toHex('replay')))
    && same(replay.args.revertSelector, toFunctionSelector('StaleConsent()'))
    && same(replay.args.seatsHash, seatsHash(evidence.finalSeats)), 'Replay rejection does not preserve final seats');
  demand(completed.eventName === 'ProofCompleted' && Number(completed.args.assignedBefore) === 2
    && Number(completed.args.assignedAfter) === 3, 'Invalid completion count');
  demand(BigInt(evidence.proofGasLimit) > 0n && BigInt(evidence.proofGasUsed) > 0n
    && BigInt(evidence.proofGasUsed) <= BigInt(evidence.proofGasLimit), 'Invalid receipt gas values');
  return { ...result, scope: 'snapshot-consistency', rejectedInternalCalls: withdrawal ? 3 : 2, withdrawalProved: withdrawal, before, after: evidence.finalSeats };
}

export const verifyBreakSnapshot = evidence => verifyFixtureSnapshot(evidence, PROOF);
export const verifyCancellationSnapshot = (evidence, pins = CHALLENGE_PROOF) => verifyFixtureSnapshot(evidence, pins, true);

/** Read-only recheck against a public RPC. Never signs or sends a transaction. */
async function verifyFixtureOnChain(client, evidence, pins, withdrawal, progress = () => {}) {
  verifyFixtureSnapshot(evidence, pins, withdrawal);
  progress('network');
  demand(await client.getChainId() === pins.chainId, 'RPC returned the wrong network');
  const receipt = await client.getTransactionReceipt({ hash: pins.hash });
  demand(receipt.status === 'success' && same(receipt.transactionHash, pins.hash), 'Proof transaction is not successful');
  demand(same(receipt.blockHash, evidence.proofBlockHash) && receipt.blockNumber === BigInt(evidence.proofBlock), 'Proof receipt block mismatch');
  const finalized = await client.getBlock({ blockTag: 'finalized' });
  demand(finalized.number >= receipt.blockNumber, 'Proof transaction is not finalized');
  const canonical = await client.getBlock({ blockNumber: receipt.blockNumber });
  demand(same(canonical.hash, receipt.blockHash), 'Proof block is no longer canonical');
  const transaction = await client.getTransaction({ hash: pins.hash });
  demand(same(transaction.to, pins.fixture) && same(transaction.from, pins.controller)
    && same(transaction.input, toFunctionSelector('runProof()')), 'Unexpected proof transaction call');
  progress('code');
  for (const [address, expected] of [[pins.fixture, pins.fixtureRuntimeHash], [pins.relay, pins.relayRuntimeHash]]) {
    const code = await client.getBytecode({ address, blockNumber: receipt.blockNumber });
    demand(code && same(keccak256(code), expected), 'Historical contract bytecode mismatch');
  }
  progress('events');
  const logs = await getLogsBounded(client, { address: pins.relay, fromBlock: BigInt(evidence.fromBlock), toBlock: receipt.blockNumber });
  const events = logs.map(log => ({ ...decodeEventLog({ abi: relayAbi, data: log.data, topics: log.topics }),
    transactionHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.logIndex }));
  const proofEvents = receipt.logs.filter(log => same(log.address, pins.fixture))
    .map(log => decodeEventLog({ abi: fixtureAbi, data: log.data, topics: log.topics }));
  progress('seats');
  const finalSeats = await client.readContract({ address: pins.relay, abi: relayAbi, functionName: 'getSeats', blockNumber: receipt.blockNumber });
  const checked = verifyFixtureSnapshot(plain({ ...evidence, events, proofEvents, finalSeats,
    proofGasLimit: transaction.gas, proofGasUsed: receipt.gasUsed,
    deployment: { ...evidence.deployment, finalizedBlock: finalized.number } }), pins, withdrawal);
  return { ...checked, scope: 'rpc-rechecked', proofBlock: receipt.blockNumber.toString(),
    finalizedBlock: finalized.number.toString(), gasLimit: transaction.gas.toString(), gasUsed: receipt.gasUsed.toString() };
}

export const verifyBreakOnChain = (client, evidence, progress) => verifyFixtureOnChain(client, evidence, PROOF, false, progress);
export const verifyCancellationOnChain = (client, evidence, progress) => verifyFixtureOnChain(client, evidence, CHALLENGE_PROOF, true, progress);
