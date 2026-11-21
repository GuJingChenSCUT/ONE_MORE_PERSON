# Three-minute stage demo / 三分钟演示

The primary presentation is now English, with a Chinese option. Use [judge-demo.md](judge-demo.md) for the exact controls and fallback steps, [pitch.en.md](pitch.en.md) for spoken English, and [pitch.zh.md](pitch.zh.md) for Chinese.

1. **0:00–0:25 — The problem.** Alice already has a workshop seat but needs another time. She should not have to give it up before a replacement is secured.
2. **0:25–0:55 — The complete plan.** Alice moves from morning to afternoon, Bob moves from afternoon to empty Sunday, and Charlie leaves the waitlist for morning. Three existing seats can serve three people instead of two. This is a constructed example.
3. **0:55–1:30 — Let the judge break it.** On `break.html`, choose missing consent or withdrawal. Say explicitly that these challenge controls are a simulation. Every original seat must stay unchanged.
4. **1:30–1:50 — Valid relay.** Run the valid example. A two-person cycle would improve time fit while adding zero attendees; not every scenario creates a gain.
5. **1:50–2:20 — Real evidence.** Open the latest Monad withdrawal proof. The unmodified product contract is deployed on chain 10143. One successful outer transaction contains missing-consent rejection, actual nonce cancellation that preserves seats, rejection of the old plan, a freshly approved 2→3 relay, and replay rejection. It has three rejected internal execution calls. All actors belong to one test controller.
6. **2:20–2:40 — Wallet browser QC.** Show the complete local browser run: three EOA test accounts, 5 transactions, 6 typed-signature requests, cancellation, old-plan preflight rejection, and fresh successful execution. Label it isolated Hardhat, not Monad. A preflight rejection is not a failed mined transaction, and local “finalized” readings are not public-network finality measurements.
7. **2:40–3:00 — Next proof.** Explain the planned two-organizer pilot. No real institutions or user-adoption results have been validated yet. A single organizer usually has a simpler database option.

**中文要点：** 已有位置的人不必先退；全体同意同一方案；先让评委选择失败路径；模拟按钮和真实链上证据分开；只有撤回先上链旧签名才失效；纯互换增量为零；真实机构试点尚未发生。

Terminal output, screenshots, and exported records serve different purposes. Screenshots do not replace on-chain evidence. The user will submit the final competition entry personally.
