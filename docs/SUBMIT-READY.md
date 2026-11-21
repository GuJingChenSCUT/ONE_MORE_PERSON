# Your submission package

The demo is public. **MOJO entry [#471 — One More Person · 多一个人](https://mojo.devnads.com/projects/471) was verified in the signed-in owner's profile and project detail page on 21 November 2026. Its status is `pending` / 待审核.** The recorded event is 18, and both the public demo URL and GitHub repository match this project. This check confirms an existing submission; this naming-update workflow did not create it.

The current naming update is published as Sites version 8: organizers display as **Dr. Alice** and **Dr. Bob** across the public demo, local rehearsal, wallet lab and guides. The existing MOJO edit page was inspected, but uploading the fresh `research/validation/named-hosts-seats.jpg` failed because the Edge extension requires “Allow access to file URLs.” No MOJO fields or existing images were changed. The local Agent remains `pending_claim`, and its API project query returns HTTP 403, `Agent has not been claimed`. Update the existing entry #471 after upload access is restored; do not create a duplicate. See [the naming checks](../research/validation/named-hosts-qc.md) and [project record](../config/mojo-project.json).

At the 30-minute submission freeze check on 21 November, the current Agent again returned `pending_claim`; the event project query returned HTTP 403, `Agent has not been claimed`. The new public three-page demo and guide were published as Sites version 4, and the prepared entry text was updated locally. This does not establish a successful MOJO submission or update.

Submission preflight on 21 November: all 33 local tests passed; live Monad Testnet reads verified chain 10143, product runtime, deployment identity and the finalized withdrawal proof. GitHub commit `b288dc7` was pushed and its verification workflow passed. Earlier screenshot UUIDs were cleared from the draft payload because they must not be reused under a different account. Upload fresh images before retrying the API payload.

- Event: [Monad Blitz@Guangzhou, event 18](https://mojo.devnads.com/events/18).
- Confirmed deadline: **21 November 2026, 18:30 Beijing time (UTC+8)**.
- Project name: **One More Person · 多一个人**.
- Demo: https://one-more-person-guangzhou.justdog33.chatgpt.site
- New public three-page interaction demo: https://one-more-person-guangzhou.justdog33.chatgpt.site/demo.html . Same-browser simulation with independent Alice/Bob/Charlie pages; no real signatures or chain writes. The local real-EVM version remains available separately.
- Bilingual public demo guide: https://one-more-person-guangzhou.justdog33.chatgpt.site/demo-guide.html . Sites version 4 was published and its three-role withdrawal/recovery flow was browser-verified.
- Repository: https://github.com/GuJingChenSCUT/ONE_MORE_PERSON
- Copy-ready description: [submission.md](submission.md); structured fields: [submission.json](submission.json).
- Current screenshots: `research/validation/final-home-desktop.jpg` and `research/validation/final-challenge-desktop.jpg`.
- Laptop presentation: [three-page live room and exact rundown](three-page-demo.md). Alice, Bob and Charlie use separate demo logins with synchronized real local EVM state. [QC record](../research/validation/three-page-qc.md). This is separate from public Monad Testnet proof.
- [Presentation](https://one-more-person-guangzhou.justdog33.chatgpt.site/pitch.html), [English spoken pitch](pitch.en.md), [Chinese spoken pitch](pitch.zh.md), [three-minute judge runbook](judge-demo.md).

For the stage demo, open the failure challenge. Let the judge choose withdrawal, show that the old seats stay put, then run a valid fictional relay and inspect the separately recorded real Monad proof. The complete wallet browser flow was tested locally with three controlled EOA accounts; do not describe it as a public-Monad human pilot.

The ZIP kit includes these documents and current images. It contains no private keys, wallet session, MOJO credential, or raw source attachments.

After each completed change passes the relevant checks, update the affected GitHub source, the existing public Site, and the same MOJO entry. Query for an existing entry before creating one, refresh screenshots when their visible content changes, and verify the result after publication. A successful submission or update enters `pending` review; it does not establish acceptance or an award.
