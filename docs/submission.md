# MOJO entry — ready-to-edit copy

Event: **Monad Blitz@Guangzhou**, event ID 18. Deadline: **21 November 2026, 18:30 Beijing time**.

Name: **One More Person · 多一个人**

## English description

Change your workshop time without gambling away the seat you already have.

One More Person coordinates conditional seat exchanges between independent organizers. Each participant signs the same complete plan. Only when every consent, current booking, eligibility rule, nonce, and deadline is valid does the contract update every seat together. A rejected plan leaves existing seats unchanged. A relay ending in an empty seat can also admit someone from a waitlist; a pure swap adds no attendees.

The prototype includes a responsive mechanism demo, a judge-led failure challenge, a Solidity contract, EIP-712 consent, automated local EVM tests, and independent event reconstruction. Two hosts approve one fixed pool configuration. Personal identity checks remain with organizers; public wallet and seat relationships are visible on-chain.

The unmodified product contract runs on Monad Testnet (10143). The latest verified proof rejects missing consent, cancels a holder's consent without moving their seat, rejects the old plan, completes a freshly approved relay, and rejects replay. It is one successful transaction with three rejected internal calls, using fictional contract-wallet actors under one controller. The wallet flow and a synchronized three-page Alice/Bob/Charlie demo both passed local EVM testing with three controlled EOA accounts, including browser signatures, two host approvals, cancellation, old-plan rejection and fresh-plan execution. These browser tests use isolated Hardhat, not Monad; independent-wallet execution on public Monad and a human pilot remain pending.

The intended use is independent organizers accepting shared execution rules. A single organizer's database is usually simpler. The next validation is a real two-organizer pilot. No application TPS, real-user traction, or globally unique algorithm is claimed.

## 中文简介

换个时间，不必拿已有席位冒险。多一个人帮助独立主办方协调条件换位：每个人同意同一完整方案，只有签名、资格、当前持有状态、nonce 和截止条件全部成立，才一次更新所有位置；失败时原位保留。以空位为终点的接力可能让候补参加，纯互换不增加人数。

原型包含交互演示、失败挑战、Solidity 合约、EIP-712 签名、自动测试与事件复算。产品合约已部署 Monad Testnet（10143），最新证明记录缺签被拒、撤回不丢席位、旧方案被拒、重新同意后接力成功，以及重放被拒。一笔成功外层交易包含三个被拒的内部调用，虚构合约钱包由同一控制者管理，不代表真人试点。完整钱包浏览器流程也已使用三个 EOA 测试账户通过本地验收：建池、双方确认、签名、撤回、旧方案拒绝、重新签名和成功执行。这次浏览器验收运行在隔离的 Hardhat，不是 Monad；公共测试网独立钱包全程操作与真人试点仍待完成。机构须真实预留名额并履约；身份信息留在机构侧，链上地址及名额关系公开。单一机构使用数据库通常更简单，不宣称应用 TPS、用户采用或全球首创。

## Links and evidence

- Demo: [one-more-person-guangzhou.justdog33.chatgpt.site](https://one-more-person-guangzhou.justdog33.chatgpt.site)
- Source: [GuJingChenSCUT/ONE_MORE_PERSON](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON)
- [Pitch](pitch.en.md), [judge runbook](judge-demo.md), [QC scope](QC-review.en.md), [testnet proof](testnet-proof.md).
- [Latest withdrawal proof](https://testnet.monadvision.com/tx/0x4694e41130890603ecc7b979a5e92880099fb3b66a46649a7a1ff735c46746d7). The earlier proof is retained in [testnet-proof.md](testnet-proof.md).
- `docs/submission.json` holds the structured English entry. Its screenshot references are intentionally empty after the account change; freshly upload the current English homepage and withdrawal challenge before API submission. The browser form uses the same prepared local images. Uploading images does not submit the competition entry.

## Submission status

The site is public. **On 21 November, the owner authorized submission and future synchronization after completed changes pass the relevant checks**, superseding the earlier self-submission preference. The owner subsequently reported resolving the team-leader restriction and requested web submission. The prepared form is preserved, but fresh screenshot upload is waiting for Edge's local-file permission; the local Agent is still unclaimed. No successful submission or project ID has been confirmed. See [current status](SUBMIT-READY.md). Once an entry exists, update that same entry instead of creating duplicates. Successful submissions and updates remain subject to organizer review.
