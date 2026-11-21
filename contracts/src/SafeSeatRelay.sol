// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @notice One fixed, jointly acknowledged pool of non-tradable activity seats.
/// @dev Experimental prototype. No payment, NFT transfer, identity oracle or admin seizure.
///      A seat number is 1-based; 0 means that a participant is waiting.
contract SafeSeatRelay is EIP712 {
    struct Move {
        address participant;
        uint256 fromSeat;
        uint256 toSeat;
        uint256 nonce;
    }

    bytes32 public constant MOVE_TYPEHASH = keccak256(
        "Move(address participant,uint256 fromSeat,uint256 toSeat,uint256 nonce)"
    );
    bytes32 public constant CONSENT_TYPEHASH = keccak256(
        "Consent(bytes32 planHash,address participant,uint256 fromSeat,uint256 toSeat,uint256 nonce,uint256 validUntil)"
    );
    uint256 public constant MAX_SEATS = 12;
    address public immutable hostA;
    address public immutable hostB;
    uint256 public immutable closesAt;
    bytes32 public immutable configHash;
    bytes32 public immutable termsHash;
    uint8 public approvals;

    // address[] uses a separate slot for each holder; do not pack many holders' mutable state.
    address[] private holders;
    mapping(address => uint256) public seatOf;
    mapping(address => uint256) public eligibleMask;
    mapping(address => uint256) public nonces;

    event SeatSeeded(uint256 indexed seat, address indexed holder);
    event PoolApproved(address indexed host, bytes32 indexed configHash);
    event ConsentCancelled(address indexed participant, uint256 nonce);
    event SeatMoved(bytes32 indexed planHash, address indexed participant, uint256 fromSeat, uint256 toSeat, uint256 nonce);
    event PlanExecuted(bytes32 indexed planHash, uint256 moved, uint256 additionalPeople);

    error InvalidConfiguration();
    error NotHost();
    error ConfigurationMismatch();
    error PoolNotOpen();
    error InvalidPlan();
    error Expired();
    error StaleConsent();
    error InvalidSignature();
    error OccupantNotMoving();
    error Ineligible();

    constructor(
        address firstHost,
        address secondHost,
        uint256 closeTime,
        bytes32 lockedTerms,
        address[] memory initialHolders,
        address[] memory participants,
        uint256[] memory eligibility
    ) EIP712("OneMorePerson", "0.2") {
        uint256 seats = initialHolders.length;
        if (firstHost == address(0) || secondHost == address(0) || firstHost == secondHost
            || closeTime <= block.timestamp || lockedTerms == bytes32(0)
            || seats == 0 || seats > MAX_SEATS || participants.length == 0
            || participants.length > MAX_SEATS || participants.length != eligibility.length) {
            revert InvalidConfiguration();
        }
        hostA = firstHost;
        hostB = secondHost;
        closesAt = closeTime;
        termsHash = lockedTerms;
        configHash = keccak256(abi.encode(firstHost, secondHost, closeTime, lockedTerms,
            initialHolders, participants, eligibility));
        for (uint256 i; i < participants.length; ++i) {
            address participant = participants[i];
            uint256 mask = eligibility[i];
            if (participant == address(0) || eligibleMask[participant] != 0
                || mask == 0 || mask >> seats != 0) revert InvalidConfiguration();
            eligibleMask[participant] = mask;
        }
        for (uint256 i; i < seats; ++i) {
            address holder = initialHolders[i];
            if (holder != address(0)) {
                if (seatOf[holder] != 0 || eligibleMask[holder] & (1 << i) == 0) {
                    revert InvalidConfiguration();
                }
                seatOf[holder] = i + 1;
            }
            holders.push(holder);
            emit SeatSeeded(i + 1, holder);
        }
    }

    function approvePool(bytes32 expectedConfigHash) external {
        if (msg.sender != hostA && msg.sender != hostB) revert NotHost();
        if (expectedConfigHash != configHash) revert ConfigurationMismatch();
        if (block.timestamp >= closesAt) revert Expired();
        approvals |= msg.sender == hostA ? 1 : 2;
        emit PoolApproved(msg.sender, configHash);
    }

    function getSeats() external view returns (address[] memory) { return holders; }

    function cancelConsent() external {
        if (eligibleMask[msg.sender] == 0) revert Ineligible();
        emit ConsentCancelled(msg.sender, ++nonces[msg.sender]);
    }

    function hashPlan(Move[] calldata moves) public pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](moves.length);
        for (uint256 i; i < moves.length; ++i) {
            Move calldata m = moves[i];
            hashes[i] = keccak256(abi.encode(MOVE_TYPEHASH, m.participant, m.fromSeat, m.toSeat, m.nonce));
        }
        return keccak256(abi.encodePacked(hashes));
    }

    function consentDigest(bytes32 planHash, Move calldata m, uint256 validUntil) public view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(CONSENT_TYPEHASH, planHash,
            m.participant, m.fromSeat, m.toSeat, m.nonce, validUntil)));
    }

    /// @notice Any relayer may submit a plan; every moving participant must sign that exact plan.
    /// @dev Cancellation is effective when its nonce change is included before this transaction.
    function execute(Move[] calldata moves, uint256 validUntil, bytes[] calldata signatures) external {
        if (approvals != 3) revert PoolNotOpen();
        if (block.timestamp >= closesAt || block.timestamp >= validUntil || validUntil > closesAt) revert Expired();
        uint256 n = moves.length;
        if (n == 0 || n > MAX_SEATS || n != signatures.length) revert InvalidPlan();
        bytes32 planHash = hashPlan(moves);
        uint256 additional;

        // Validate the whole batch before changing any seat or nonce.
        for (uint256 i; i < n; ++i) {
            Move calldata m = moves[i];
            if (m.participant == address(0) || m.toSeat == 0 || m.toSeat > holders.length
                || m.fromSeat == m.toSeat) revert InvalidPlan();
            if (eligibleMask[m.participant] & (1 << (m.toSeat - 1)) == 0) revert Ineligible();
            if (seatOf[m.participant] != m.fromSeat || nonces[m.participant] != m.nonce) revert StaleConsent();
            for (uint256 j; j < i; ++j) {
                if (moves[j].participant == m.participant || moves[j].toSeat == m.toSeat) revert InvalidPlan();
            }
            if (!SignatureChecker.isValidSignatureNow(m.participant, consentDigest(planHash, m, validUntil), signatures[i])) {
                revert InvalidSignature();
            }
            address occupant = holders[m.toSeat - 1];
            if (occupant != address(0)) {
                bool leaving;
                for (uint256 j; j < n; ++j) {
                    if (moves[j].participant == occupant && moves[j].fromSeat == m.toSeat) leaving = true;
                }
                if (!leaving) revert OccupantNotMoving();
            }
            if (m.fromSeat == 0) ++additional;
        }
        // Clear all old locations first so cycles and chains have identical atomic semantics.
        for (uint256 i; i < n; ++i) {
            if (moves[i].fromSeat != 0) holders[moves[i].fromSeat - 1] = address(0);
        }
        for (uint256 i; i < n; ++i) {
            Move calldata m = moves[i];
            holders[m.toSeat - 1] = m.participant;
            seatOf[m.participant] = m.toSeat;
            ++nonces[m.participant];
            emit SeatMoved(planHash, m.participant, m.fromSeat, m.toSeat, nonces[m.participant]);
        }
        emit PlanExecuted(planHash, n, additional);
    }
}
