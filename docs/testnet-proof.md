# Monad Testnet proof

This records real on-chain tests using fictional actors controlled by test fixtures. They are separate from the browser simulation, the visitor-wallet lab, and any future organizer pilot.

## Latest proof: withdrawal keeps the seat

- Network: Monad Testnet, chain ID 10143.
- Unmodified product contract: [SafeSeatRelay](https://testnet.monadvision.com/address/0xeAC3414f47aD5Fd2F12B8A88575eBc04c4EaF378).
- Test controller contract: [RelayChallengeFixture](https://testnet.monadvision.com/address/0xBBBdddD59037f1656478b7f8F9A805a887ff26Eb).
- [Deployment transaction](https://testnet.monadvision.com/tx/0x6372b72935ce6ba2b75f5ce6e8ccb9938dad5baa22ae4c618100c66e1bf5ef1c), block 81,525,968.
- [Withdrawal proof transaction](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7), block 81,526,321.
- Evidence: `research/validation/cancellation-proof.json`. Deployment provenance: `config/challenge-proof.json`.

The transaction performs the following checks against the unmodified product contract:

1. Omit one actor's consent. Execution is rejected and all original seats stay unchanged.
2. Complete consent, then have the second holder call `cancelConsent()`. Its nonce increases from 0 to 1; the seat stays with that holder.
3. Try the old complete plan. Its stale nonce is rejected and all original seats stay unchanged.
4. Create the fresh plan with the current nonce. All three actors approve its new digest. Execution assigns the waiting person to morning, the first holder to afternoon, and the second holder to Sunday.
5. Replay the completed plan. It is rejected without changing the completed seats.

This is **one successful outer transaction containing three rejected internal execution calls**, one `ConsentCancelled` event, and one successful relay. It is not three failed mined transactions. Cancellation is ordered before execution inside this controlled test; it does not demonstrate the outcome of a real network race.

```sh
node scripts/verify-challenge-proof.mjs 0x6372b72935ce6ba2b75f5ce6e8ccb9938dad5baa22ae4c618100c66e1bf5ef1c 0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7
```

The verifier confirmed the deployment and proof against RPC: chain 10143, successful finalized receipts, expected controller and factory, CreateX calldata and guarded salt, compiled runtime code, fixture/actor configuration, cancellation nonce, rejection evidence, complete event history, and the seat snapshot at the proof block. Event reconstruction yields **3 seats, 3 assigned accounts, 1 executed plan, and 1 additional allocation**. All actors still share one controller; these are not independent human signatures or real institutional seats.

The deployment gas limit was 4,438,126 and the proof gas limit was 729,760, both at a receipt effective gas price of 102 gwei. These include fixture overhead and multiple test operations. They are not the fee for one ordinary participant exchange.

Independent RPC verification of deployed runtime, deployment calldata, factory code, and provenance passed. The explorer API returned the following separate source-match results, preserved in `research/validation/challenge-explorer-verification.json`:

| New deployment | MonadVision | Monadscan |
| --- | --- | --- |
| `RelayChallengeFixture` | Perfect match | Reported “Contract source code already verified”; not a fresh success response |
| Representative `ChallengeActor` | Perfect match | Pass — verified |
| `SafeSeatRelay` | Partial match | Reported “Contract source code already verified”; not a fresh success response |

These are not perfect matches for every contract on both explorers. Explorer source-match status and the independent runtime/provenance verification are different checks. The original proof's separate source-verification result is described below.

`research/validation/challenge-timings.json` records one observation from this computer. The CLI returned after 21,229 ms; receipt observation was 10,701 ms after that return; finalized observation was 13,083 ms after that return. The CLI duration includes startup, authorization, estimation, submission, and possible internal waiting. The transaction may already have finalized before the hash was returned. Subsequent times include RPC and polling delay. **These are not signing-to-finality, consensus-latency, or TPS measurements.**

## Original proof: missing consent, success, replay

- Network: Monad Testnet, chain ID 10143.
- Unmodified product contract: [SafeSeatRelay](https://testnet.monadvision.com/address/0x7D7DAB361AB5cBA009541491886b4dC9B16c450b).
- Test controller contract: [RelayProofFixture](https://testnet.monadvision.com/address/0x6Ac08dceC963e381D12355C05a016F5229b1F2e3).
- [Deployment transaction](https://testnet.monadvision.com/tx/0x00635026bd8c5b2291043c660616ad5386ed568794892d1036ff8efce72aa70c), block 81,521,195.
- [Proof transaction](https://testnet.monadvision.com/tx/0x20b562b401290c76d9d3070d79d8e6ac02cc80be5f504afc469cb5abc52907de), block 81,521,526.

The proof transaction succeeds as a whole. Inside it, a missing-consent call is rejected without changing seats or nonces; the complete plan then seats three people instead of two; a replay is rejected without changing the completed result. These are **two rejected internal calls, not two failed outer transactions**.

`scripts/verify-testnet-proof.mjs` checks the chain, finalized receipts, sender, CreateX calldata and guarded salt, predicted fixture address, source bytecode, constructor configuration, actor ownership, and proof events. It reconstructs all seat events from deployment through the proof block and compares them with the contract snapshot at that same block. Range-limited RPC responses are split without skipping blocks. The resulting record is `research/validation/monad-proof-evidence.json`.

```sh
node scripts/verify-testnet-proof.mjs 0x00635026bd8c5b2291043c660616ad5386ed568794892d1036ff8efce72aa70c 0x20b562b401290c76d9d3070d79d8e6ac02cc80be5f504afc469cb5abc52907de
```

An optional `MONAD_RPC_URL` changes the read-only verification endpoint. Do not commit a credential-bearing RPC URL. Automatically loading the evidence card checks the downloaded snapshot's internal consistency; that is not a fresh RPC check. The challenge page has a separate **Verify against Monad now** action. When it succeeds, it has freshly checked chain ID, transaction receipt and call identity, canonical finalized block, pinned contract bytecode, event history, and the seat snapshot at that same block. RPC errors leave the fresh verification incomplete.

The deployment gas limit was 4,034,031; the proof gas limit was 568,785. The receipts report the same values as gas used, with an effective gas price of 102 gwei. This fixture deploys additional test contracts, so these figures are not ordinary participant transaction costs, throughput, or latency benchmarks.

For this original proof, the official verification API returned successful source verification on MonadVision and Monadscan for the fixture, product contract, and one representative test actor. Results are recorded in `research/validation/explorer-verification.json`.

CreateX salt handling follows its [official source](https://github.com/pcaversaccio/createx/blob/main/src/CreateX.sol): a zero-address prefix with the cross-chain flag uses a chain-bound guarded salt. The prepared transaction was signed and broadcast by the Alchemy Agent Wallet session; no private key was exported. An initial RPC configuration delay was resolved before the successful broadcast.

## Scope and timing

The home page and interactive failure buttons remain simulations. The complete `live.html` browser flow passed on isolated Hardhat with three EOA test accounts, including deployment, code verification, both host approvals, initial signatures, cancellation, stale-plan rejection, fresh signatures, and successful execution. The [local request record](../research/validation/wallet-local-browser-log.json) has 5 transactions and 6 typed-signature requests. Its chain ID 10143 was used only for signature-domain compatibility: **it is not a Monad run or a network-finality observation**. Independent-wallet execution on public Monad and an independent human pilot remain pending. See the [QC checklist](QC-review.en.md).

The original proof's submission-to-receipt and finality timings were not recorded. A current RPC recheck measures how long that verification took, not how long the old transaction took to finalize. Live-wallet timings start when the browser receives a transaction hash and include RPC and polling delay. Report only an actually collected record and its measurement boundaries.

Real identity checks, independent organizer operations, notification delivery, and real-world seat fulfillment remain outside these proofs. See [current submission status](SUBMIT-READY.md) for publication and organizer review status.
