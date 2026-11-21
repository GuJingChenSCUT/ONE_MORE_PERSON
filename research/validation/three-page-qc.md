# Three-page rehearsal QC — 21 November 2026

Scope: a laptop rehearsal authorized to use a local blockchain. This does not establish public Monad execution from three independent wallets or a human pilot.

Passed:

- 33 automated tests, including a new integration test against the unmodified SafeSeatRelay bytecode on an in-process EVM, chain 31337. It covers concurrent host approvals and signature collection, wrong-signer rejection, missing consent, nonce withdrawal, stale-plan rejection, fresh consent, three atomic moves, replay rejection, consistent broadcasts, and restart with a new deployment.
- Actual Edge tabs independently logged in as Alice, Bob and Charlie. Each browser page generated its own EIP-712 consent. All three showed the same seats after host approvals, signatures, withdrawal and execution, without manual refreshing.
- Browser flow: both hosts approved; Alice created the plan; all three signed; Bob withdrew; the old plan transaction reverted and seats remained Alice / Bob / empty; a fresh plan required three new signatures; execution produced Charlie / Alice / Bob and attendance 3.
- First browser run also submitted missing-consent and replay transactions, both reverted. Records: `three-page-browser-evidence.json`. The final server build was separately exercised end to end: `three-page-final-browser-evidence.json`.
- Charlie logout did not log out Alice or Bob. Bob's page refresh preserved Bob's session. Server restart invalidated old sessions and showed the demo identity choices. Presenter restart deployed a new pool and reset all three pages while preserving their logins.
- HTTP checks: unauthenticated actions returned 401; cross-origin login returned 403; Charlie could not gain Alice's reset authority through a request body (400); logged-out tokens returned 401.
- Launcher started a hidden server and subsequently reused that same service. The room was left running with all three tabs logged in and reset to initial seats.
- Chinese participant controls were checked, then returned to English. Event history remains English. Static site build and all 42 existing local links passed; the local server and test identity signing code are excluded from the public static asset allowlist.

Boundaries: identities are selectable local demo roles, not secure real-person authentication. Their signing keys are public Hardhat fixtures and must never be funded on public networks. The server is loopback-only, uses an in-process provider, and offers no generic JSON-RPC endpoint. It relays local transactions. A single laptop controls all three roles. Room state lives in memory; download evidence before resetting or stopping. No performance benchmark is claimed.
