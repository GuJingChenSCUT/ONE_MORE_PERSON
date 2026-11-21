# One More Person

## System explanation and live demo guide

21 November 2026. Three-page laptop rehearsal. English presentation; Chinese controls available.

### The problem we solve

Alice and Bob hold workshop places with different organizers; Charlie is waiting. Alice wants a later time, but should not have to surrender her current seat before another is secured.

**Our promise: your old seat is released only if the complete, approved exchange gives you the new seat you accepted.** One invalid permission makes the whole exchange fail without moving any seats.

| Person | Before | After the approved relay |
| --- | --- | --- |
| Alice | Saturday 10 AM | Saturday 2 PM |
| Bob | Saturday 2 PM | Sunday 2 PM |
| Charlie | Waiting for Saturday morning | Saturday 10 AM |

Sunday starts empty. The same **three seats** serve **three people instead of two**. This is a fictional scenario, not a customer result. A two-person swap can improve timing while adding zero attendees.

### Open the local deployment

1. Double-click **Start-Demo.cmd** in the project folder. It opens three pages and starts the server. Once it says **Ready**, you can close the launcher; the server keeps running.
2. On each page, choose the matching demo identity. Normal browser tabs are sufficient; separate profiles and wallet extensions are unnecessary.
3. Confirm **Live room connected** on all three pages. If a previous round is finished, Alice opens **Presenter controls**, then **Restart rehearsal**.

| Page | Local address |
| --- | --- |
| Alice | [http://127.0.0.1:4180/?role=alice](http://127.0.0.1:4180/?role=alice) |
| Bob | [http://127.0.0.1:4180/?role=bob](http://127.0.0.1:4180/?role=bob) |
| Charlie | [http://127.0.0.1:4180/?role=charlie](http://127.0.0.1:4180/?role=charlie) |

**Local chain 31337:** real signatures and contract transactions using public test accounts; no faucet or internet needed. Never fund these accounts publicly. **Monad proof** opens separate public Testnet evidence and needs internet.

<!-- pagebreak -->

## How the system works

### Three layers, one shared seat record

| Layer | What it does |
| --- | --- |
| Three browser pages | Each page reviews the same plan and creates an EIP-712 signature with its own test account. Each tab has a separate login session. |
| Local coordinator | A Node server receives signatures, relays transactions and broadcasts live updates using server-sent events. The demo plan is predefined. |
| SafeSeatRelay contract | The unchanged product contract checks permissions and updates seats atomically in a local Hardhat EVM. The display reads the mined contract state. |

The flow is **review -> sign -> submit -> validate -> update all pages**. Signing never moves a seat. Both hosts first approve the fixed pool in separate transactions. Alice and Bob also play Host A and Host B for this three-page demo.

### What the contract checks

- **Both hosts approved:** both accept the same fixed seats, eligibility and pool terms.
- **Every move is authorized:** signatures cover the complete plan, participant, old and new seats, consent version and expiry, bound to this contract and chain.
- **Current facts match:** participants still hold their old seats, are eligible for destinations and have valid consent. People and destinations cannot be duplicated.
- **Occupied destinations are released:** each current holder must also move in this plan. Nobody outside the plan loses a seat.
- **Everything succeeds together:** the contract updates all seats and consent versions, or rolls back all changes from a failed transaction.

### Why withdrawal and replay fail safely

**Withdraw my approval** advances Bob's consent version, or nonce, in a transaction. His seat stays in place. The old plan has the wrong version and is rejected; everyone signs a fresh complete plan.

Withdrawal must be included **before** execution. Logging out is not withdrawal; withdrawal cannot undo a completed exchange. After success, changed seats and consent versions prevent replay.

### Why use a shared contract?

A database is usually simpler for one organizer. Independent organizers can instead accept shared execution rules that neither can rewrite alone. This contract validates a proposed exchange, not the best possible match. Organizers must still verify people, reserve real capacity and honor admission.

<!-- pagebreak -->

## The exact live rundown

Allow **3-4 minutes** with all three tabs logged in. Wait for each click to finish; updates are automatic. [Chinese speaking script](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON/blob/main/docs/three-page-demo.md).

Opening: **"Alice and Bob already have workshop seats. Charlie is waiting. We let people change times without giving up their old seat first."**

| Step | Click | Show or say |
| --- | --- | --- |
| 1 | Show Alice, Bob and Charlie's pages. | Alice holds morning; Bob holds afternoon; Sunday is empty; Charlie is waiting. "Three seats, two people with places." |
| 2 | Alice: **Approve pool as Host A**. Bob: **Approve pool as Host B**. | All pages show **2 / 2** host approvals. "Both organizers accept the same pool." |
| 3 | Alice: **Create shared plan**. | Alice moves to afternoon, Bob to Sunday, Charlie to morning. "This is one complete exchange." |
| 4 | Each page: **Approve my move**, once. Wait for all three signed badges. | Original seats are unchanged. "Approving a move does not give away your seat." |
| 5 | Bob: **Withdraw my approval**. Alice: **Try withdrawn plan**. | A real local transaction is **REVERTED**; every original seat remains. "One person changed their mind, so the whole old plan fails." |
| 6 | Alice: **Create fresh plan**. Each page: **Approve my move** again. | The old signatures are cleared. "We need new permission for this version." |
| 7 | Alice: **Execute all 3 moves**. Show Bob and Charlie's pages. | Morning / afternoon / Sunday now show **Charlie / Alice / Bob**, and attendance is **3** everywhere. "Same three seats. One more person gets in." |
| 8 | Expand **Receipts & contract evidence**. Choose **Download this rehearsal record**. Open **Monad proof**. | Show local transaction receipts, then separate public evidence. "This live run is local; this other record is verified on Monad Testnet." |

Optional judge challenges: **Try incomplete plan** before collecting signatures; **Try used plan** after success. Both create rejected local transactions and leave the seat record unchanged. Allow about 10 seconds each.

Closing: **"For one organizer a database is simpler. We coordinate independent organizers and participants under shared rules that neither organizer can change alone."**

<!-- pagebreak -->

## Evidence and recovery

### What the demonstration proves

| Evidence | What it demonstrates | What it does not demonstrate |
| --- | --- | --- |
| Local room, chain 31337 | Typed signatures, host approvals, withdrawal, transaction rejection, atomic relay and synchronized tabs. | Production authentication, independent human testing or public Monad performance. |
| Monad Testnet proof, chain 10143 | The unchanged contract rejects missing consent, a withdrawn plan and replay; a fresh relay succeeds. | Independent human approval. Fictional contract-wallet actors share one controller. |

**Public proof:** [Monad Testnet transaction](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7). One successful outer transaction contains three rejected internal calls, cancellation and a successful relay. See [verification and provenance](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON/blob/main/docs/testnet-proof.md).

**33 automated tests** and a three-tab walkthrough passed, including withdrawal, rejection and success. Desktop and 390px layouts were checked. These verify prototype behavior, not adoption, throughput or production readiness. The plan is predefined.

### Run it again or recover during a presentation

| Situation | Action |
| --- | --- |
| Start another round | Alice: **Presenter controls -> Restart rehearsal**. All pages reset to a fresh pool. Download evidence first. |
| Room disconnected | Reopen **Start-Demo.cmd** and log in again if the server restarted. Refresh keeps the room; stopping the server loses its in-memory state. |
| Wrong identity | **Log out of this tab**, then choose the correct name. Other tabs stay logged in. |
| Button disabled | Read **Your next step**. Both hosts approve first. After withdrawal, Alice creates a fresh plan before anyone signs again. |
| An action times out | Check the room and receipt before retrying. A lost response does not prove the transaction failed. |
| Keep an audit record | **Download this rehearsal record** before reset or shutdown. It includes public test addresses, signatures, receipts and events, but no login tokens. |

Manual start: **node scripts/serve-rehearsal.mjs**; keep the terminal open. Another machine needs Node 22.10+ and **pnpm install --frozen-lockfile** first. The launcher's runtime fallback is laptop-specific. The service binds to **127.0.0.1**: links work only on this laptop.

[GitHub source](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON) | [Public website](https://one-more-person-guangzhou.justdog33.chatgpt.site). Static site simulations are separate from this local room. No payment, token, ticket trading or production identity service is included.
