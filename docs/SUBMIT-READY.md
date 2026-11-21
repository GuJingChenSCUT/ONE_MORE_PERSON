# Your submission package

The entry is prepared and the demo is public. **Publication and future updates were authorized on 21 November 2026. The owner has since reported resolving the team-leader restriction and explicitly requested submission through the MOJO website. Submission is not yet confirmed.**

The current browser account's refreshed profile showed no project. The event-18 form now contains the prepared name, description, public demo and repository. Fresh screenshots could not be uploaded because the Edge extension requires “Allow access to file URLs”; native file selection was also unavailable. The form is preserved for continuation. Browser security policy prevents opening `edge://extensions` through automation, so the owner must change that setting directly or upload the prepared images in the form. The local Agent is `pending_claim`, and its API project query returns `Agent has not been claimed`. No team membership or unrelated project has been changed.

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
