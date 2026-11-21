// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeSeatRelay} from "../src/SafeSeatRelay.sol";

/// @dev Fictional contract-wallet actor, controlled by a single test fixture.
contract ChallengeActor {
    address public immutable controller = msg.sender;
    mapping(bytes32 => bool) public approved;
    modifier onlyController() { require(msg.sender == controller, "fixture only"); _; }
    function approve(bytes32 digest) external onlyController { approved[digest] = true; }
    function approvePool(SafeSeatRelay relay, bytes32 digest) external onlyController { relay.approvePool(digest); }
    function cancel(SafeSeatRelay relay) external onlyController { relay.cancelConsent(); }
    function isValidSignature(bytes32 digest, bytes calldata) external view returns (bytes4) {
        return approved[digest] ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

/// @notice Reproducible testnet withdrawal challenge. No real participants or institutional seats.
/// @dev The unmodified product contract enforces every invariant. This fixture asserts outcomes.
contract RelayChallengeFixture {
    address public immutable controller;
    SafeSeatRelay public immutable relay;
    ChallengeActor public immutable secondHost;
    ChallengeActor public immutable lin;
    ChallengeActor public immutable chen;
    ChallengeActor public immutable yu;
    uint256 public immutable deadline;
    bool public completed;
    event FictionalFixture(address indexed relay, address indexed controller);
    event RejectionProved(bytes32 indexed reason, bytes4 revertSelector, bytes32 seatsHash);
    event WithdrawalProved(address indexed participant, uint256 oldNonce, uint256 newNonce, bytes32 seatsHash);
    event ProofCompleted(uint256 assignedBefore, uint256 assignedAfter);

    constructor(address approvedController) {
        require(block.chainid == 10143 || block.chainid == 31337, "test networks only");
        require(approvedController != address(0), "empty controller");
        controller = approvedController;
        secondHost = new ChallengeActor();
        lin = new ChallengeActor(); chen = new ChallengeActor(); yu = new ChallengeActor();
        address[] memory holders = new address[](3);
        holders[0] = address(lin); holders[1] = address(chen);
        address[] memory people = new address[](3);
        people[0] = address(lin); people[1] = address(chen); people[2] = address(yu);
        uint256[] memory masks = new uint256[](3);
        masks[0] = 3; masks[1] = 6; masks[2] = 1;
        deadline = block.timestamp + 1 days;
        relay = new SafeSeatRelay(address(this), address(secondHost), deadline,
            keccak256("FICTIONAL WITHDRAWAL CHALLENGE; ONE CONTROLLER; NO REAL SEATS"), holders, people, masks);
        relay.approvePool(relay.configHash());
        secondHost.approvePool(relay, relay.configHash());
        emit FictionalFixture(address(relay), approvedController);
    }

    function runProof() external {
        require(msg.sender == controller && !completed, "controller or completed");
        require(block.timestamp < deadline, "expired fixture");
        SafeSeatRelay.Move[] memory moves = new SafeSeatRelay.Move[](3);
        moves[0] = SafeSeatRelay.Move(address(lin), 1, 2, 0);
        moves[1] = SafeSeatRelay.Move(address(chen), 2, 3, 0);
        moves[2] = SafeSeatRelay.Move(address(yu), 0, 1, 0);
        bytes[] memory signatures = new bytes[](3);
        bytes32 beforeSeats = keccak256(abi.encode(relay.getSeats()));
        bytes32 planHash = relay.hashPlan(moves);
        lin.approve(relay.consentDigest(planHash, moves[0], deadline));
        chen.approve(relay.consentDigest(planHash, moves[1], deadline));
        _reject(moves, signatures, SafeSeatRelay.InvalidSignature.selector, "missing consent", beforeSeats);
        yu.approve(relay.consentDigest(planHash, moves[2], deadline));

        // Withdrawal changes the nonce, never the held seat. Every signature covers this old nonce.
        chen.cancel(relay);
        require(relay.nonces(address(chen)) == 1 && _seatsHash() == beforeSeats, "withdrawal lost seat");
        emit WithdrawalProved(address(chen), 0, 1, beforeSeats);
        _reject(moves, signatures, SafeSeatRelay.StaleConsent.selector, "withdrawn consent", beforeSeats);
        require(relay.nonces(address(lin)) == 0 && relay.nonces(address(chen)) == 1
            && relay.nonces(address(yu)) == 0, "rejected plan changed nonce");

        // A different plan hash requires fresh approvals from all three actors.
        moves[1].nonce = 1;
        planHash = relay.hashPlan(moves);
        lin.approve(relay.consentDigest(planHash, moves[0], deadline));
        chen.approve(relay.consentDigest(planHash, moves[1], deadline));
        yu.approve(relay.consentDigest(planHash, moves[2], deadline));
        relay.execute(moves, deadline, signatures);
        address[] memory seats = relay.getSeats();
        require(seats[0] == address(yu) && seats[1] == address(lin) && seats[2] == address(chen), "wrong seats");
        _reject(moves, signatures, SafeSeatRelay.StaleConsent.selector, "replay", _seatsHash());
        completed = true;
        emit ProofCompleted(2, 3);
    }

    function _seatsHash() private view returns (bytes32) { return keccak256(abi.encode(relay.getSeats())); }
    function _reject(SafeSeatRelay.Move[] memory moves, bytes[] memory signatures,
        bytes4 expected, string memory reasonName, bytes32 expectedSeats) private {
        (bool ok, bytes memory reason) = address(relay).call(abi.encodeCall(relay.execute, (moves, deadline, signatures)));
        require(!ok && bytes4(reason) == expected, "unexpected rejection");
        require(_seatsHash() == expectedSeats, "rejection changed seats");
        emit RejectionProved(keccak256(bytes(reasonName)), bytes4(reason), expectedSeats);
    }
}
