import { concat, encodeAbiParameters, keccak256, toBytes } from 'viem';

export const consentTypes = { Consent: [
  { name: 'planHash', type: 'bytes32' }, { name: 'participant', type: 'address' },
  { name: 'fromSeat', type: 'uint256' }, { name: 'toSeat', type: 'uint256' },
  { name: 'nonce', type: 'uint256' }, { name: 'validUntil', type: 'uint256' },
] };
const moveTypeHash = keccak256(toBytes('Move(address participant,uint256 fromSeat,uint256 toSeat,uint256 nonce)'));

export function hashPlan(moves) {
  return keccak256(concat(moves.map(move => keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }],
    [moveTypeHash, move.participant, move.fromSeat, move.toSeat, move.nonce],
  )))));
}

// Wallet adapters sign this complete message. A consent is never a transferable seat token.
export function consentMessage({ chainId, contractAddress, moves, participant, validUntil }) {
  const move = moves.find(move => move.participant.toLowerCase() === participant.toLowerCase());
  if (!move) throw new Error('The signer is not a participant in this plan');
  return {
    domain: { name: 'OneMorePerson', version: '0.2', chainId, verifyingContract: contractAddress },
    types: consentTypes,
    primaryType: 'Consent',
    message: { planHash: hashPlan(moves), ...move, validUntil },
  };
}
