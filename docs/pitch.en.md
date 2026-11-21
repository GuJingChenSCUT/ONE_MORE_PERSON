# One More Person — speaker notes

**One sentence:** Change your workshop time without gambling away the seat you already have.

**Audience:** Monad Blitz Guangzhou judges. **Format:** a judge-led demonstration with fictional bookings. There are no customer interviews or real organizer pilot results to report yet.

## 90-second pitch

You booked a workshop, but your plans changed. Do you give up your seat and hope another session is still available?

One More Person lets everyone agree on one complete exchange. Your old seat is released only when you get the new seat you accepted. All moves succeed together, or none do.

Here is our example. Alice has Saturday morning. Bob has afternoon. Sunday has a spare seat, and Charlie is waiting. Alice moves to afternoon, Bob to Sunday, Charlie to morning. Three people get places using the same three seats.

Now try to break it. Remove one consent. Nobody moves. If withdrawal reaches the contract first, the old plan also stops working.

On Monad Testnet, our proof rejects missing consent and withdrawn consent, completes a freshly approved relay, and rejects replay. It uses fictional wallets under one controller, so it proves the mechanism, not real-user adoption.

Our complete wallet browser flow also passed a local test with three accounts.

Two independent organizers can accept shared rules without either controlling everyone’s changes. For a single organizer, a database is simpler.

Next, we need two real organizers to honor the final list. Today, test our promise: nobody gives up their seat first.

## Three-minute pitch and demo

| Time | Say | Show |
| --- | --- | --- |
| 0:00–0:25 | “Changing your workshop time shouldn’t mean gambling away your booking.” Explain Alice, Bob, Charlie, and the empty Sunday seat. | Pitch page: problem and three-seat example. |
| 0:25–0:55 | “You choose which new seat you accept. Everyone agrees to the same complete plan.” | Plan: Alice 1→2, Bob 2→3, Charlie 0→1. Explain that 0 means waiting. |
| 0:55–1:30 | “Please choose a failure.” State that this interactive challenge is a simulation. | `Test missing consent` or `Withdraw, then try old plan`; compare every before/after seat. |
| 1:30–1:50 | “With valid consent, all three moves happen together.” | `Run valid relay`: two assigned people become three. A pure two-person swap would add zero people. |
| 1:50–2:20 | “Now separate the animation from evidence.” | Show the withdrawal proof and its event reconstruction: nonce cancellation preserves seats, the old plan is rejected, then fresh consent succeeds. One successful outer transaction contains three rejected internal calls. |
| 2:20–2:40 | “The complete wallet browser flow also passed locally with three accounts.” | Show the wallet lab or saved browser QC result. Label that run as isolated Hardhat, not Monad. Keep its timings separate from real testnet evidence. |
| 2:40–3:00 | “The remaining question is whether two organizers and their participants want this coordination.” | Explain the planned pilot and invite judges to test the promise. No invented users, attendance gains, or market validation. |

The public-network wallet route needs three eligible wallets, test MON for transactions, two host approvals, and time to collect signatures. Prepare it before the pitch. The complete browser route has passed local QC through an isolated Hardhat test provider, but that does not mean independent wallets have completed it on Monad. Use the verified testnet fixture and the separately labeled local browser record when presenting the evidence already collected.

## Answers to likely judge questions

**Why not a spreadsheet or a database?** A database can perform atomic transactions too. For one organizer, it is usually simpler. Our intended case is independent organizers that will honor a shared rule but do not want either party to control the combined booking list. Participants authorize the whole plan; any relayer can submit it, and the result is independently readable.

**What is the new idea?** The product combines conditional consent, multi-person seat relays, and a waitlist into one small workflow. Matching and atomic transactions are established techniques. We do not claim a new algorithm, exclusive use of Monad, or global novelty. Our researched comparisons covered ticket sales and attendance deposits; they do not establish an exhaustive prior-art search.

**Why Monad?** The implementation uses its EVM compatibility and finality-aware RPC workflow for small, interactive coordination. Separate pools do not share an application-wide counter; one relay remains one atomic transaction. That is a design choice, not a measured parallel-execution result. We have not benchmarked application TPS or proven this cannot run on another EVM chain. See [Monad RPC commitment states](https://docs.monad.xyz/reference/json-rpc/overview) and [parallel execution](https://docs.monad.xyz/monad-arch/execution/parallel-execution).

**What does “fast” mean here?** Only report a downloaded transaction record from the live lab. Separate time waiting for a human signature, wallet submission, receipt observation, and finalized observation. One sample describes that run; it is not p95 performance. Monad charges by the transaction’s gas limit, so report that limit and the paid price rather than presenting an Ethereum-style gas-used estimate as the bill. [Monad gas pricing](https://docs.monad.xyz/developer-essentials/gas-pricing).

**Can someone steal my seat by copying the transaction?** A valid signature binds the complete plan, participant, old and new seat, nonce, expiry, chain, and contract. A relayer can submit that authorized plan, but cannot change its recipients. Cancellation must be included before execution to invalidate the old consent; it cannot undo an already executed plan.

**Does the blockchain guarantee admission?** No. Organizers must reserve genuine capacity and honor the resulting list. Identity checks remain their responsibility. Wallet addresses and seat relations are public; the app does not put names or phone numbers on-chain.

**What has actually been validated?** The automated suite reported 32 passes. The complete browser flow passed locally with three distinct EOA test accounts controlled by one operator: 5 local transactions and 6 typed-signature requests. Separately, the latest real Monad fixture includes nonce cancellation, stale-plan rejection, and a fresh successful exchange. Its fictional contract actors share one controller, and its cancellation order is controlled rather than a network race. See [testnet evidence](testnet-proof.md) and the [browser QC record](QC-review.en.md#completed-local-browser-run). Independent-wallet use on public Monad and a human pilot remain untested.

**What would make you stop?** If organizers prefer a shared booking administrator, few valid exchanges exist, or participants find signing more burdensome than manual coordination, simplify the solution. The [pilot plan](pilot-plan.md) records those decision points before testing.

## Demonstration links

- [Public app](https://one-more-person-guangzhou.justdog33.chatgpt.site)
- [Try to break it](https://one-more-person-guangzhou.justdog33.chatgpt.site/break.html)
- [Wallet lab](https://one-more-person-guangzhou.justdog33.chatgpt.site/live.html)
- [Presentation page](https://one-more-person-guangzhou.justdog33.chatgpt.site/pitch.html)
- [Repository](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON)
- [Recorded withdrawal proof](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7)
- [Earlier missing-consent / replay proof](https://testnet.monadvision.com/tx/0x20b562b401290c76d9d3070d79d8e6ac02cc80be5f504afc469cb5abc52907de)

Additional pages are part of the final build; confirm that the published version opens before presenting. See [current submission status](SUBMIT-READY.md).
