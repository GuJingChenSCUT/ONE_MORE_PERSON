# Three-role redesign verification - 21 November 2026

## Public interaction simulation

Three actual Edge tabs opened the Alice, Bob and Charlie routes in the same room. Host approvals synchronized, each role submitted its own simulated approval, Bob withdrew, and Alice's withdrawn-plan attempt preserved Alice / Bob / empty. A fresh plan cleared old approvals. After all three approved again, execution produced Charlie / Alice / Bob and 3 / 3 on every tab. Charlie retained the completed state after refresh. Replay was rejected without changing seats. Bob's Chinese controls and rejection message were checked.

The public version uses browser storage and Web Locks. It has no real wallet signatures, contract execution or fake transaction receipts. The displayed simulation notice and exported record preserve that distinction. Different profiles/devices do not share a room.

The complete withdrawal and recovery sequence was repeated on the published Sites version 4 URL in room `qc-release`, not just on the local preview. All three public tabs showed the same Charlie / Alice / Bob result; Charlie retained it after reload. `public-three-page-success.jpg` captures the published simulation outcome. Desktop layout was inspected. The browser's requested mobile viewport override did not apply to the inspected tab, so no new mobile-width verification is claimed for this redesign.

## Preserved local contract deployment

The original service on port 4180 stayed running. Three separate Edge tabs logged in as Alice, Bob and Charlie. The full real-signature sequence passed: two host approvals, plan creation, three typed signatures, Bob's on-chain cancellation, reverted execution of the old plan, a fresh plan and three fresh signatures, then successful atomic execution. Every page showed Charlie / Alice / Bob. Actual local receipts and events were saved in `local-preserved-qc.json`. This was isolated EVM 31337, not a public Monad run.

After evidence export, Alice restarted the local rehearsal. All three pages returned to two attendees and kept their separate logins. The original server remains running; no cloud gateway or tunnel was started.

## Automated and release checks

35 tests passed, including the shared real-EVM room, public interaction transition rules, stale-consent rejection, role limits, reset protection and the prepared gateway checks. Static build and the explicit public-asset allowlist passed. The original local harness and public fixture mnemonic remain excluded from static publication. Browser screenshots and final deployment identifiers accompany the release record.
