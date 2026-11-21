# Judge challenge

Open `break.html`. The page starts in English and has a Chinese toggle. No wallet is needed for the challenge panel.

1. Click **Test missing consent**. Charlie has not agreed. The attempt is rejected and all three seat positions are unchanged.
2. Click **Withdraw, then try old plan**. This starts a fresh fictional scene, gathers three simulated approvals, and then increments Bob's consent counter. The old plan is rejected; Bob keeps his afternoon seat.
3. Click **Run valid relay**. This starts another fresh scene. Alice takes afternoon, Bob takes Sunday, and Charlie takes morning. The same three seats now accommodate three people instead of two.

The top panel is explicitly labeled **SIMULATION · NO TRANSACTION**. It uses the existing browser model and never signs or broadcasts. Each choice resets the initial fictional scene so a prior successful attempt does not contaminate the next challenge. The before/after comparison and downloaded challenge record show this distinction.

The evidence section leads with the latest withdrawal proof. **Earlier proof: missing consent and replay** expands a separate, already executed Monad Testnet proof. Its outer transaction succeeded; two internal calls were rejected. First, missing consent left the original seats and nonces unchanged. Next the complete relay succeeded. Finally, replay of the completed plan was rejected without changing the result. The fixture controls all contract-wallet actors; it is not independent human consent or a real workshop pilot.

The additional withdrawal card contains a second real [Monad Testnet transaction](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7), at block 81,526,321. It proves missing consent, then a real `cancelConsent()` changing Bob's nonce from 0 to 1 while preserving his seat. The old plan is rejected. Fresh approvals execute a new plan, and replay is rejected. This second successful outer transaction contains **three rejected internal calls**. The strict snapshot validator requires all five fixture proof events, exactly one matching cancellation event, preserved before/after seat hashes and a complete relay-event reconstruction. All actors still belong to one controller.

The page first checks the downloaded JSON with `verifyBreakSnapshot`: known proof/deployment identities, event ordering and block range, full seat reconstruction, exact rejection reasons and error selectors, ABI-encoded before/after seat hashes, and the 2-to-3 completion count. This only establishes the downloaded record's consistency.

**Verify against Monad now** performs a separate read-only RPC check: chain ID, successful transaction identity and call, canonical finalized proof block, pinned historical contract bytecode, full seat-event history, receipt proof events, and `getSeats()` at that same proof block. RPC failures remain visible and never turn into a passed check. The measured time is the browser's verification read duration, not the historical transaction's latency. The historical send-to-finalized time is explicitly **Not recorded**.

**Open the real wallet flow** goes to `live.html#challenge`. That flow provides actual wallet signing and consent cancellation. Its preflight rejection must not be described as a failed mined transaction.

Validation: `node --test tests/break-proof.test.mjs` checks both valid records, forged rejection selectors and seat hashes, missing proof events, wrong transaction provenance, duplicate event positions, missing/mismatched withdrawal nonces, wrong network, and failed RPC receipts. Browser QC is performed by the integrating agent.

Build integration: bundle `web/break.js` to `break.bundle.js` with esbuild (browser ESM target) because it imports `viem`, `lib/break-proof.mjs`, `lib/replay.mjs`, and `lib/log-ranges.mjs`. Copy `break.html`, `break.css`, and the existing `relay.js`. Keep the explicit public JSON allowlist.
