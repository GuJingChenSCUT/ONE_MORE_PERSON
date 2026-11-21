# Final hackathon QC — 21 November 2026

Scope: English-first public site, optional Chinese, real injected-wallet interface, adversarial judge demo, and a reproducible Monad Testnet withdrawal proof. Competition submission remains the user's responsibility.

## Automated checks

- 32 tests passed: contract ownership/eligibility, exact EIP-712 consent, two hosts, strict deadlines, duplicate destinations, replay, atomic rollback, cancellation, fresh consent, evidence reconstruction, provider range splitting, and both pinned proof validators.
- After the final wallet button-state change, the six live-protocol tests passed again, including stale/completed execution readiness.
- Static build and link checks passed: five pages, 42 local links, and 24 allowlisted public assets. Private credentials, attachments, and the local wallet harness are excluded.
- Both proof validators separately rechecked Monad RPC data: canonical finalized receipts, fixed code hashes, complete event history, and same-block seats.

## Browser interaction checks

The English home page rejected missing consent without moving seats; a complete relay changed occupancy from two to three; withdrawal invalidated the old plan and preserved Alice/Bob's original seats. All three challenge buttons produced the expected before/after seat states. A fresh withdrawal-proof RPC check passed from the browser in 12.65 seconds; that is verification read time, not transaction latency.

The wallet page showed an honest no-wallet state and no fabricated connection. The full **actual wallet-page JavaScript** was then exercised through a local EIP-1193 test bridge and isolated Hardhat chain:

1. Connect A, deploy a three-seat pool, and verify its constructor and runtime.
2. Approve as hosts A and B.
3. Collect three distinct EOA signatures covering the same plan.
4. Withdraw B's consent. The existing seats remain A, B, empty.
5. Call contract preflight with the old signatures: rejected; no transaction sent.
6. Build a new plan with B's nonce 1; collect three fresh signatures.
7. Execute: final seats C, A, B; three attendees. Five local transactions and six signatures were logged.

The harness uses chain ID 10143 solely to exercise the production signing domain. **It is not Monad Testnet and its finality timings are not network measurements.** The harness was stopped and excluded from public assets. Records: `wallet-local-browser-log.json`, `wallet-local-browser-success.jpg`.

At 390×844, home, wallet, challenge, and pitch pages had no horizontal overflow. The five-section pitch's seat illustration and English/Chinese switching worked. The Chinese home page remains separately accessible at `zh.html`.

The production Site version 3 was published successfully. Its English homepage and interactive withdrawal challenge were checked in the browser, including both downloadable proof snapshots. The packaged 24 public files match the local validated build byte for byte.

## Real network proof

Latest transaction: `0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7`, block 81,526,321, Monad Testnet 10143. Missing consent, withdrawn consent, and replay were rejected inside one successful outer transaction. Withdrawal increased the participant nonce without releasing a seat; fresh full-plan approvals then completed the relay. All actors are fictional and controlled by one fixture.

Source explorer reports are retained verbatim in `challenge-explorer-verification.json`: the fixture has a perfect MonadVision match, the actor verifies on both explorers, and the product contract has a partial MonadVision match with Monadscan reporting already verified. Separate local compilation and RPC checks verified the deployment calldata, provenance, configuration, and runtime.

## Limits

No independent human pilot or three-wallet public-Monad browser run was performed. No real institutional seats, payments, identity assurance, production security audit, or application TPS are claimed. The browser workflow, local-EVM behavior, and real network fixture are separate evidence layers.
