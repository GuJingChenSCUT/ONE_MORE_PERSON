# Three people, one live room

**Public interaction option:** [open the three-role lobby](https://one-more-person-guangzhou.justdog33.chatgpt.site/demo.html) and follow the [bilingual guide](https://one-more-person-guangzhou.justdog33.chatgpt.site/demo-guide.html). That version synchronizes a clearly labeled simulation across three tabs of one browser profile. The instructions below still apply to the preserved real local contract deployment.

This working local app has three separate demo identities, live server-sent updates, browser-created EIP-712 signatures, and actual transactions against the unchanged SafeSeatRelay contract on isolated Hardhat chain **31337**. The rehearsal needs no extension wallet, faucet or internet connection. The **Monad proof** link opens separately recorded public Testnet evidence and does require internet.

These are controlled public test accounts, not production authentication or independent human testers. Alice and Bob also represent the two hosts to keep the demo to three pages. No test account is used on a public network. The server relays transactions; each tab signs its own consent. Login sessions are separate per tab. Shared pool state survives a page refresh but is lost when the server stops.

## Open the app

Double-click `Start-Demo.cmd` in the project folder. It reuses a running room or starts a hidden local server, then opens three pages in the default browser. Close the launcher after it says **Ready**. Its Node fallback is specific to this laptop; other machines need Node 22.10+ and `pnpm install` first. Alternatively run `node scripts/serve-rehearsal.mjs` in the repository and keep that terminal open.

| Page | URL | Login card |
| --- | --- | --- |
| Alice | http://127.0.0.1:4180/?role=alice | Alice |
| Bob | http://127.0.0.1:4180/?role=bob | Bob |
| Charlie | http://127.0.0.1:4180/?role=charlie | Charlie |

Use three normal tabs or windows; incognito profiles are unnecessary. Each tab remembers its login when refreshed. Logging out of one does not log out the others. `中文` switches login, participant controls, guidance, activity and result messages. Downloaded evidence retains the original English record.

Before presenting, confirm **Live room connected** in all three tabs. If already used, Alice → **Presenter controls** → **Restart rehearsal**. Everyone returns to the beginning together and stays logged in. Restart creates a fresh contract; download evidence first to retain the previous round.

## Exact live rundown — 3–4 minutes

Opening: **“Alice and Bob already have workshop seats. Charlie is waiting. We let people change times without giving up their old seat first.”**

| Step | Exact action | Expected result / what to say |
| --- | --- | --- |
| 1 · 20 sec | Show each page logged in as its named person. | Alice has Sat 10 AM; Bob has Sat 2 PM; Sun 2 PM is empty; Charlie waits. **“Three seats, but only two people can attend right now.”** |
| 2 · 20 sec | Alice: **Approve pool as Dr. Alice**. Bob: **Approve pool as Dr. Bob**. | All pages show **2 / 2**. **“Both organizers agree to the same fixed pool.”** |
| 3 · 15 sec | Alice: **Create shared plan**. | Alice → afternoon, Bob → Sunday, Charlie → morning. **“This is one complete plan.”** |
| 4 · 20 sec | Alice, Bob and Charlie: **Approve my move** once each. Wait for three “signed” badges. | Seats remain Alice / Bob / empty. **“Agreement alone never gives away your seat.”** |
| 5 · 25 sec | Bob: **Withdraw my approval**. Alice: **Try withdrawn plan**. | **WITHDRAWN**, a real local transaction is **REVERTED**, all seats unchanged. **“Bob changed his mind. The whole plan fails, so nobody loses a seat.”** |
| 6 · 25 sec | Alice: **Create fresh plan**. All three: **Approve my move** again. | Old signatures are cleared. **“We cannot reuse the old permissions.”** |
| 7 · 20 sec | Alice: **Execute all 3 moves**. Switch through Bob and Charlie. | Every page shows Charlie / Alice / Bob; attendance becomes **3**. **“Same three seats. One more person gets in. All moves happened together.”** |
| 8 · 20 sec | Expand **Receipts & contract evidence**; optionally **Download this rehearsal record**. Open **Monad proof**. | **“This live rehearsal runs locally. Here is our separately verified deployment and proof on Monad.”** |

Optional challenges: before signatures, **Try incomplete plan** proves missing-consent rejection. After success, **Try used plan** proves replay rejection. Both leave seats unchanged and add about 10 seconds each.

Closing: **“For one organizer a database is simpler. Our intended use is independent organizers and participants agreeing to shared rules that neither organizer can change alone.”**

## Recovery

- **Room disconnected:** reopen `Start-Demo.cmd`. Pages reconnect automatically. After a server restart, choose each identity again; the old in-memory room is gone.
- **Wrong identity:** **Log out of this tab**, then choose the correct name. Other pages remain signed in.
- **Disabled button:** follow **Your next step**. Both hosts approve before plan creation. After withdrawal Alice creates a fresh plan before anyone signs again.
- **Another run:** Alice → **Presenter controls** → **Restart rehearsal** resets everyone together.
- **Port occupied:** the launcher reuses only an identified rehearsal service. Do not stop unrelated apps. For a different port set `OMP_DEMO_PORT` when starting the server directly and adjust all three URLs.
- **Keep evidence:** download the JSON before restart. It contains public test addresses, consent signatures and receipts, never login tokens or user credentials.

## 中文讲解

“Alice 和 Bob 已有席位，Charlie 在候补。换时间不必先放弃原位。”依次执行双方确认、创建方案、三人同意、Bob 撤回、旧方案失败、创建新方案、三人重新同意、整批执行。

“签名不是退位；一人撤回，旧方案整体失败，所有原位不变。重新同意后，三个换位一次完成，相同供给多一个人参加。”明确现场是本地链彩排，再打开 Monad proof 展示独立的真实测试网证据。
