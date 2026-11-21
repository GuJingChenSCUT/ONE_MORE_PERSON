# 验证记录 · 2026-11-21

- 本地 `pnpm test`：18 项通过，包含 13 项合约场景及模型、复算检查（测试框架统计包含父测试）。
- `pnpm demo:local`：部署编译后的字节码到进程内 EVM（31337）；缺签交易回滚，完整方案成功；同样 3 席从 2 人变 3 人。
- `pnpm verify:events`：重建事件与记录的合约快照一致。该结果仅证明证据文件内部一致，不能代替 RPC 来源核验。
- `pnpm build`：Solidity 0.8.30 编译，运行时代码 6304 字节；静态页面与证据文件打包成功。
- 浏览器实测：缺少同意保留原位；三人完整方案成功；小陈撤回后旧方案失效；390px 宽移动布局未出现水平溢出。
- 网络检查：2026-11-21 14:42:13（北京时间），chainId=10143，finalized 区块 81510032；没有配置应用合约，`deploymentVerified=false`。
- [GitHub 云端 CI](https://github.com/GuJingChenSCUT/ONE_MORE_PERSON/actions/runs/44877547395)：提交 `ff1e348` 的安装、测试、本地演示、复算和构建全部通过。
- Sites：已部署成功，当前仅所有者可访问；公开给评委前须变更访问范围。

尚未验证：Monad Testnet 上的应用部署与真实交易、真实钱包签署、真实机构履约、ERC-1271 钱包联调、应用确认时延和实网 gas 成本。

证据与图片见 `research/validation/`、`docs/screenshots/`。先前研究截图和此次补充截图都只展示虚构机制，不是测试网交易凭证。
