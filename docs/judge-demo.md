# Judge-led demo runbook

**Goal:** let a judge check that an invalid exchange cannot take away an existing seat. This is a fictional booking example. There is no real organizer pilot to claim.

## Open before your slot

- [Pitch page](https://one-more-person-guangzhou.justdog33.chatgpt.site/pitch.html): English by default; Chinese toggle available.
- [Try to break it](https://one-more-person-guangzhou.justdog33.chatgpt.site/break.html): short interactive challenge.
- [Wallet lab](https://one-more-person-guangzhou.justdog33.chatgpt.site/live.html): real wallet operations, separate from the simulation.
- [Recorded withdrawal proof](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7): fallback evidence if the wallet or RPC is unavailable. The earlier proof remains documented in [testnet-proof.md](testnet-proof.md).

Confirm the published pages open. Keep the downloaded public evidence record available locally. Do not depend on deploying a new pool in the three-minute stage slot.

## 75-second interactive challenge

| Step | Presenter | Judge | Pass condition |
| --- | --- | --- | --- |
| Explain | “Alice has morning, Bob has afternoon, Sunday is empty, Charlie is waiting. These are fictional people.” | Reads the original seats. | Two occupied seats, one empty, one waiting. |
| Break | “Choose a failure. These controls are a simulation.” | Selects `Test missing consent` or `Withdraw, then try old plan`. | Explicit rejection reason; every original seat unchanged; count remains 2. |
| Succeed | “Now give everyone valid consent.” | Selects `Run valid relay`. | Charlie gets morning, Alice afternoon, Bob Sunday; count 3. |
| Verify | “The real proof is separate from the animation.” | Uses `Recheck withdrawal on Monad` or `Inspect withdrawal proof` in the “Withdraw. Reject the old plan. Re-sign.” card. | Chain 10143, the known transaction, actual cancellation, rejection of the old plan, and reconstructed seats are visible. A failed RPC check must not be presented as a fresh pass. |

Each challenge starts from the fictional initial state. Resetting the challenge does not undo a blockchain transaction.

## Real wallet path — prepare a separate pool

Use three test wallet accounts A, B, and C. A and B also act as the two hosts in this demonstration. That role overlap is a test convenience, not evidence of independent institutions.

1. Connect A on Monad Testnet and create a pool for A, B, and C: seat 1=A, seat 2=B, seat 3=empty. Verify the displayed pool and terms.
2. A and B each use `Approve pool as host` for the same configuration. Share the session using its link or exported JSON.
3. Use `Build shared plan`. Every participant reviews the same moves and expiry. A, B, and C each use `Sign my move` and return the signed session. Signing alone does not change seats.
4. Preserve that signed session. B uses `Cancel my consent`. Wait for the recorded transaction result. On the old session use `Check this plan`: a stale nonce must reject it. Read all three current seats; they remain A, B, empty.
5. Explain the boundary: this is an `eth_call` preflight rejection after a real cancellation, not a failed mined execution transaction. Cancellation only invalidates the plan if included before execution.
6. Build a fresh plan with current nonces, collect all three signatures again, check it, and use `Execute all three moves`. Show its transaction hash, receipt state, finalized state, and the seats read at one finalized block.
7. Download the transaction record. Report the actual observed timings with their boundaries. If only one browser controlled all three accounts, disclose that fact.

The complete browser flow passed locally with three EOA test accounts through an isolated Hardhat test provider: 5 transactions, 6 typed signatures, an unchanged-seat rejection, and final seats C/A/B. One operator controlled the accounts. That local chain used 10143 only for the signature domain; its transactions and “finalized” display are not Monad evidence. See [the recorded QC run](QC-review.en.md#completed-local-browser-run). An independent-wallet run on public Monad remains a separate acceptance step; prepare that pool before presenting it as a live public-network demonstration.

The separate testnet fixture proves missing-consent rejection, actual withdrawal, rejection of the old plan, fresh successful consent, and replay rejection under a controlled order. It does not prove wallet-extension UX, independent human consent, or the outcome of a real transaction-ordering race. The original two-rejection proof is retained as a separate historical record.

## If something fails on stage

- Wallet rejected or locked: show the specific message; no seat change should be claimed.
- RPC unavailable: retain the transaction hash and show the saved evidence. Do not repeatedly send a transaction to get a faster response.
- Receipt observed but not finalized: say “submitted / provisional,” not “settled.”
- Imported session changed, expired, or from another chain: reject it and explain why; do not silently rebuild what a participant signed.

Close with: **“No one has to give up their seat first.”** Then explain the next two-organizer pilot rather than claiming it has happened.
