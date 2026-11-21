// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {SafeSeatRelay} from "../src/SafeSeatRelay.sol";

/// @dev Test-only contract wallet. All fictional actors belong to one fixture.
///      Digest approval exercises ERC-1271; this is NOT independent human consent.
contract ProofActor {
    address public immutable controller;
    mapping(bytes32 => bool) public approved;
    constructor() { controller = msg.sender; }
    modifier onlyController() { require(msg.sender == controller, "fixture only"); _; }
    function approve(bytes32 digest) external onlyController { approved[digest] = true; }
    function approvePool(SafeSeatRelay relay, bytes32 digest) external onlyController {
        relay.approvePool(digest);
    }
    function isValidSignature(bytes32 digest, bytes calldata) external view returns (bytes4) {
        return approved[digest] ? bytes4(0x1626ba7e) : bytes4(0xffffffff);
    }
}

/// @notice A single-controller, fictitious testnet fixture, not the product contract.
/// @dev Deploying this creates an UNMODIFIED SafeSeatRelay and four test actors.
///      No deposits, prices, transfer functions or real institutional seats exist here.
contract RelayProofFixture {
    address public immutable controller;
    SafeSeatRelay public immutable relay;
    ProofActor public immutable secondHost;
    ProofActor public immutable lin;
    ProofActor public immutable chen;
    ProofActor public immutable yu;
    uint256 public immutable deadline;
    bool public completed;

    event FictionalFixture(address indexed relay, address indexed controller);
    event RejectionProved(bytes32 indexed reason, bytes4 revertSelector, bytes32 seatsHash);
    event ProofCompleted(uint256 assignedBefore, uint256 assignedAfter);

    constructor(address approvedController) {
        require(block.chainid == 10143 || block.chainid == 31337, "test networks only");
        require(approvedController != address(0), "empty controller");
        controller = approvedController;
        secondHost = new ProofActor();
        lin = new ProofActor(); chen = new ProofActor(); yu = new ProofActor();
        address[] memory holders = new address[](3);
        holders[0] = address(lin); holders[1] = address(chen);
        address[] memory people = new address[](3);
        people[0] = address(lin); people[1] = address(chen); people[2] = address(yu);
        uint256[] memory masks = new uint256[](3);
        masks[0] = 3; masks[1] = 6; masks[2] = 1;
        deadline = block.timestamp + 1 days;
        relay = new SafeSeatRelay(address(this), address(secondHost), deadline,
            keccak256("FICTIONAL TEST FIXTURE; ONE CONTROLLER; NO REAL SEATS"), holders, people, masks);
        bytes32 configuration = relay.configHash();
        relay.approvePool(configuration);
        secondHost.approvePool(relay, configuration);
        emit FictionalFixture(address(relay), approvedController);
    }

    /// @notice Prove an inner call rolls back, then complete the same three-person plan.
    /// @dev The outer proof transaction succeeds; rejected inner calls are NOT failed outer transactions.
    function runProof() external {
        require(msg.sender == controller && !completed, "controller or completed");
        require(block.timestamp < deadline, "expired fixture");
        SafeSeatRelay.Move[] memory moves = new SafeSeatRelay.Move[](3);
        moves[0] = SafeSeatRelay.Move(address(lin), 1, 2, 0);
        moves[1] = SafeSeatRelay.Move(address(chen), 2, 3, 0);
        moves[2] = SafeSeatRelay.Move(address(yu), 0, 1, 0);
        bytes[] memory signatures = new bytes[](3);
        bytes32 planHash = relay.hashPlan(moves);
        lin.approve(relay.consentDigest(planHash, moves[0], deadline));
        chen.approve(relay.consentDigest(planHash, moves[1], deadline));
        bytes32 beforeSeats = keccak256(abi.encode(relay.getSeats()));
        (bool ok, bytes memory reason) = address(relay).call(
            abi.encodeCall(relay.execute, (moves, deadline, signatures)));
        require(!ok && bytes4(reason) == SafeSeatRelay.InvalidSignature.selector, "expected missing consent");
        require(keccak256(abi.encode(relay.getSeats())) == beforeSeats, "seat changed after rejection");
        require(relay.nonces(address(lin)) == 0 && relay.nonces(address(chen)) == 0
            && relay.nonces(address(yu)) == 0, "nonce changed after rejection");
        emit RejectionProved(keccak256("missing consent"), bytes4(reason), beforeSeats);
        yu.approve(relay.consentDigest(planHash, moves[2], deadline));
        relay.execute(moves, deadline, signatures);
        address[] memory afterSeats = relay.getSeats();
        require(afterSeats[0] == address(yu) && afterSeats[1] == address(lin)
            && afterSeats[2] == address(chen), "unexpected final seats");
        bytes32 afterHash = keccak256(abi.encode(afterSeats));
        (ok, reason) = address(relay).call(abi.encodeCall(relay.execute, (moves, deadline, signatures)));
        require(!ok && bytes4(reason) == SafeSeatRelay.StaleConsent.selector, "expected stale consent");
        require(keccak256(abi.encode(relay.getSeats())) == afterHash, "replay changed seats");
        emit RejectionProved(keccak256("replay"), bytes4(reason), afterHash);
        completed = true;
        emit ProofCompleted(2, 3);
    }
}
