# QC review: One More Person

**What it does:** helps people swap workshop times without giving up the seat they already have. Everyone must accept the same plan. All swaps happen together, or none happen.

Think of three chairs: Alice holds the morning chair, Bob holds the afternoon chair, and Sunday is empty. Alice moves to afternoon, Bob moves to Sunday, and Charlie comes off the waitlist into morning. The example seats one more person without adding another chair.

## What has been built

1. A public, responsive demonstration website with three scenarios, individual simulated consent controls, a progress indicator, and success/failure messages.
2. A Solidity contract that checks organizer approval, the complete signed plan, current seat ownership, eligibility, withdrawal nonces, and expiration before changing seats.
3. Automated local EVM tests and an independent event-reconstruction tool. The final automated suite reported 32 passing tests.
4. Real Monad Testnet proofs using fictional contract-wallet actors managed by one controller. The latest includes actual nonce cancellation, rejection of the old plan, fresh consent, a successful relay, and replay rejection. Events reconstruct to the same result as the contract snapshot. Both deployments are checked against compiled code; exact explorer source-match results, including a partial match for the new relay on MonadVision, are recorded in [testnet-proof.md](testnet-proof.md).
5. A separate wallet lab for creating a pool, collecting two host approvals and three EIP-712 signatures, checking a plan, cancelling consent, and executing the exchange. Its complete browser flow passed against an isolated local EVM with three distinct test accounts, including cancellation, rejection of the old plan, fresh consent, and final seats C/A/B.

**The home-page mechanism controls are a simulation.** The published fixture proof was run separately. The new wallet lab is a separate route for actual wallet operations; its completed verification status must be checked below. This is a prototype, not a production booking platform.

## What the evidence means

| Surface | What it demonstrates | What it does not establish |
| --- | --- | --- |
| Home page / `break.html` | An understandable fictional exchange, including failure paths. | Wallet signatures or transactions produced by those simulation buttons. |
| Local EVM checks | Contract invariants and signature rules in a controlled test environment. | Monad fees, network latency, or real users. |
| Latest Monad withdrawal fixture | Real testnet execution: missing consent rejected, nonce cancelled, old plan rejected, fresh relay executed, replay rejected, and events reconstructed. | Independent people consenting, real seats, wallet UX, or a real cancellation/execution race. |
| `live.html` wallet lab | Complete browser flow tested with three EOA accounts and two host approvals on isolated Hardhat through a test provider. | An independent-wallet run on public Monad, a real user pilot, wallet-extension UX, or network-finality performance. |

The latest proof is one successful outer transaction containing three rejected internal execution calls and one actual cancellation. The earlier proof contains two rejected internal calls and no cancellation. A browser preflight rejection is another distinct result: it checks an execution call without mining that failed call.

## Review checklist

Open [the English app](https://one-more-person-guangzhou.justdog33.chatgpt.site) and select `Add a waitlisted person`. The [Chinese version](https://one-more-person-guangzhou.justdog33.chatgpt.site/zh.html) remains available. Alice, Bob, and Charlie correspond to 小林、小陈、小雨 in the Chinese example.

| Check | Action | Expected result |
| --- | --- | --- |
| Initial state | Open the demo | Alice has Saturday morning, Bob has Saturday afternoon, Sunday is empty, Charlie is waiting; count is 2. |
| No premature swap | `Find a relay`; select fewer than all consent boxes; `Run the simulation` | No seat or assigned-person count changes. A missing-consent message appears. |
| Happy path | `Reset this scenario`; `Find a relay`; check all three boxes; `Run the simulation` | Charlie gets morning, Alice gets afternoon, Bob gets Sunday; count becomes 3. |
| Withdrawal | Reset and find a plan; `Simulate all approvals`; `Simulate Bob withdrawing`; run | The old plan is marked invalid. Original seats remain unchanged. |
| Expiration | Reset and find a plan; `Simulate all approvals`; `Simulate expiry`; run | The plan is expired. Original seats remain unchanged. |
| No invented gain | Select `Swap two times`; find a plan, agree, and run | The two holders exchange times; count remains 2. |
| No available plan | Select `No suitable vacancy`; `Find a relay` | No executable plan is offered; the existing three holders keep their seats. |
| Reset | `Reset this scenario` | Seat assignments, consent, result, and progress return to that scenario's initial state. |
| Responsive layout | Review desktop and a narrow phone screen | Text and controls stay readable; no horizontal page overflow. |
| Clear evidence | Read the evidence cards | Simulation, local EVM, and the real testnet fixture are labeled separately. |
| Public proof | Open the proof transaction and download its snapshot | Links resolve to the documented testnet transaction and event record. No fake hashes or TPS claims. |

The central rejection rule is: **any failed plan leaves all original seats unchanged**. A pure swap must never be counted as adding another attendee.

## Wallet acceptance checks

These are acceptance criteria for further reviews. The completed local browser run is recorded below; it does not imply that every error/recovery case in this table was exercised. The separate Monad fixture proof cannot substitute for browser verification.

| Check | Expected result |
| --- | --- |
| Wallet missing or connection rejected | Clear next step; no fake account or success state. |
| Wrong network | Require chain 10143 before signing or sending; do not execute on mainnet. |
| Pool identity | Verify code, chain, contract, configuration, deadline, and three eligible addresses before requesting consent. |
| Two host approvals | A single host approval does not open the pool. Both approve the same configuration. |
| Shared plan | All three signatures refer to exactly the same ordered moves, expiry, chain, and contract. |
| Import tampering | Altering a participant, target, nonce, expiry, or pool must invalidate the imported consent. |
| Partial consent | Execution is unavailable or rejected without all required valid signatures. Signing alone does not move a seat. |
| Cancellation | After cancellation is included, preflight of the old plan fails. Current seats remain unchanged. |
| Fresh consent | Rebuild with current nonces, sign again, and execute. The final seats are C, A, B; occupied count becomes 3. |
| Provisional vs final | A receipt is labeled separately from the finalized result. All final seat reads use one block. |
| Recovery | If a response is interrupted, retain the known hash and check its status rather than sending a duplicate plan. |
| Timing record | Show measured boundaries and transaction hash; do not substitute chain marketing numbers. |

## Completed local browser run

On 21 November 2026, the actual `live.js` interface was driven through the browser using an isolated Hardhat EIP-1193 test provider and three distinct EOA test accounts. One operator controlled all three accounts.

1. Connected A, deployed a pool, and verified its deployment and runtime code.
2. Approved the pool as both A and B, then built one shared plan.
3. Collected three real EIP-712 test-account signatures through the browser.
4. Cancelled B's consent. Checking the old plan called the contract and rejected it without sending an execution transaction; the seats stayed A/B/empty.
5. Rebuilt the plan with B's nonce 1, collected three fresh signatures, and executed. Final seats were C/A/B.

The [request record](../research/validation/wallet-local-browser-log.json) contains **5 local transactions and 6 typed-signature requests**. The [browser screenshot](../research/validation/wallet-local-browser-success.jpg) records the completed state. This is local browser evidence: Hardhat used chain ID 10143 solely to exercise the exact signature domain. **It is not Monad network data or measured Monad finality.**

Report the status as **“complete browser flow tested locally; independent-wallet execution on public Monad and a human pilot remain pending.”** Do not call the three controlled test accounts three independent people.

## Limits to report

- Testnet actors are fictional and share one controller; the proof does not demonstrate consent from independent people.
- No real institutions, customers, personal identities, or tickets are registered in this demo.
- The full wallet browser flow is tested locally; an independent-wallet browser run on public Monad and a human pilot have not been completed. There is no production organizer dashboard, notification system, payment, NFT resale, or check-in flow.
- No Monad TPS or real-world adoption is claimed. An individual recorded transaction timing is an observation, not a general performance benchmark.
- On-chain state cannot force an organizer to honor a physical seat.

See [testnet evidence](testnet-proof.md) for the exact contracts, transactions, verification scope, and reproducible command.

See [judge-demo.md](judge-demo.md) for the short stage sequence and [pilot-plan.md](pilot-plan.md) for the uncompleted real-user study. The user will submit the competition entry personally.
