# Three separate public pages

The owner explicitly selected a public, same-browser interaction simulation while retaining the existing local contract deployment and separate Monad proof.

Open all three in one browser profile, with the same room name:

- Alice: https://one-more-person-guangzhou.justdog33.chatgpt.site/alice.html?room=stage
- Bob: https://one-more-person-guangzhou.justdog33.chatgpt.site/bob.html?room=stage
- Charlie: https://one-more-person-guangzhou.justdog33.chatgpt.site/charlie.html?room=stage
- Entry and separate-room creation: https://one-more-person-guangzhou.justdog33.chatgpt.site/demo.html
- Bilingual walkthrough: https://one-more-person-guangzhou.justdog33.chatgpt.site/demo-guide.html

These routes were published as Sites version 4 on 21 November 2026. Three real browser tabs then passed the full withdrawal, fresh-consent and successful-exchange walkthrough on the public URL. Deployment identifiers are recorded in `config/site.json`.

## Four-minute flow

1. Show initial seats: Alice morning, Bob afternoon, Charlie waiting, Sunday empty.
2. Alice approves Host A; Bob approves Host B. Charlie's page updates automatically.
3. Alice creates the shared plan. Each person approves their own move on their page. No seat moves yet.
4. Bob withdraws. Alice tries the withdrawn plan. All pages show rejection and unchanged seats.
5. Alice creates a fresh plan; each participant approves again.
6. Alice executes all three moves. Every page shows Charlie / Alice / Bob and 3 / 3.
7. Open the separate Monad proof. Explain that the public interaction is simulated, while the recorded testnet proof is real and uses controlled fictional actors.

Alice's presenter controls also allow incomplete-consent and replay challenges, JSON export, and room reset. A reset affects all three pages in that room. Each role has one primary next-step button, with clear waiting states and a separate withdrawal action.

## What syncs

The fixed top-right Alice / Bob / Charlie control changes only the current tab's identity and preserves its room and language. Alice uses purple, Bob blue and Charlie green. Other tabs keep their own identity. The shared update number shows which room revision each page has received. The lower role links still open additional tabs. This update was published as Sites version 6.

The public demo uses localStorage, BroadcastChannel and storage events in one browser profile. Web Locks serialize simultaneous actions. Refresh or tab re-entry reads the latest stored room. Separate room names isolate concurrent rehearsals. Other browsers, profiles and devices do not share state. The public demo creates no actual signatures, contract calls, transaction hashes or blockchain receipts.

The original local service at port 4180 is preserved. Its separate role logins use real typed signatures and the unmodified SafeSeatRelay contract on isolated EVM 31337, with server-sent updates. See `three-page-demo.md` and the local PDF. The real public Monad proof remains at chain 10143; do not merge these evidence claims.

## Ten-step interactive film

Open `story.html` on the public site. Three embedded role pages share an isolated browser simulation room. Play/pause, next, restart, timeline seeking and speed controls are available. The ten steps split the existing rehearsal into setup, hosts, plan, consent, withdrawal, rejection, fresh plan, renewed consent, execution and evidence. No actual transactions are sent. MOJO synchronization on this update remains blocked: the project query returned 403, Agent has not been claimed.
