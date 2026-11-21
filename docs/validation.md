# Verification status · 21 November 2026

The current release is documented in [final QC](../research/validation/final-qc.md), the [reviewer guide](QC-review.en.md), and [real testnet proof](testnet-proof.md).

- 32 automated tests passed; final wallet readiness checks passed separately.
- The complete wallet interface passed browser testing against an isolated local EVM: two host approvals, three distinct signatures, cancellation, old-plan rejection, fresh signatures, and successful relay.
- Two real Monad Testnet fixtures are deployed and independently verified. The latest proof includes missing consent, actual nonce cancellation, stale-plan rejection, fresh consent, execution, and replay rejection.
- English/Chinese pages, mobile layouts, proof downloads, and browser RPC rechecking were tested. Public Site version 3 is published.
- The local browser test is not a public-Monad wallet run. No independent human pilot or application performance benchmark was run. Publication and subsequent updates are authorized; see [current submission status](SUBMIT-READY.md) for the outstanding MOJO team-leader requirement.

## Earlier checkpoint — retained as history

The items below describe the earlier build before the real testnet proofs and wallet interface were added.

- 本地 `pnpm test`：19 项通过，包含 13 项合约场景、ERC-1271 测试夹具及模型、复算检查（测试框架统计包含父测试）。单控制者的虚构夹具不代表真实参与者签名。
- `pnpm demo:local`：部署编译后的字节码到进程内 EVM（31337）；缺签交易回滚，完整方案成功；同样 3 席从 2 人变 3 人。
- `pnpm verify:events`：重建事件与记录的合约快照一致。该结果仅证明证据文件内部一致，不能代替 RPC 来源核验。
- `pnpm build`：Solidity 0.8.30 编译，运行时代码 6304 字节；静态页面与证据文件打包成功。
- 浏览器实测：缺少同意保留原位；三人完整方案成功；小陈撤回后旧方案失效；390px 宽移动布局未出现水平溢出。
- 网络检查：2026-11-21 14:42:13（北京时间），chainId=10143，finalized 区块 81510032；没有配置应用合约，`deploymentVerified=false`。
- [GitHub 云端 CI](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON/actions/runs/44877870726)：提交 `4a99407` 的安装、19 项测试、本地演示、复算和构建全部通过。
- Sites：已部署成功；2026-11-21 经用户明确选择，已开放为公开访问。MOJO 提交暂缓。

尚未验证：Monad Testnet 上的应用部署与真实交易、真实钱包签署、真实机构履约、ERC-1271 钱包联调、应用确认时延和实网 gas 成本。

证据与图片见 `research/validation/`、`docs/screenshots/`。先前研究截图和此次补充截图都只展示虚构机制，不是测试网交易凭证。
