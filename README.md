# 多一个人 · One More Person

**换到合适的时间，才放开原来的位置。**

面向两家独立活动主办方的保底换位原型。每个参与者签署同一份完整方案；所有条件成立才同时更新名额。少一份有效同意、有人撤回或方案过期，整份方案失败，已有名额保留。一个以空位为终点的换位链可能接入候补者；纯互换不会增加获配人数。

本项目参加 [Monad Blitz@广州](https://mojo.devnads.com/events/18)，目标网络为 **Monad Testnet，chainId 10143**。网页使用明确标注的虚构数据；本地 EVM 测试不能证明 Monad 性能。测试网合约尚未部署，配置中的地址保持 `null`。

## 本地运行

需要 Node.js 24 LTS 和 pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm demo:local
pnpm build
pnpm dev
```

打开终端打印的本地地址。`pnpm demo:local` 执行独立的本地合约演示并导出事件证据；`pnpm verify:events` 复算证据文件；`pnpm check:network` 只读检查 Monad Testnet。

## 工程边界

| 路径 | 职责 |
| --- | --- |
| `web/` | 可直接运行的交互演示，拒绝把模拟结果显示为链上交易 |
| `contracts/src/SafeSeatRelay.sol` | 双主办方配置确认、EIP-712 同意、nonce 撤回和原子换位 |
| `lib/` | 签名消息与独立事件复算 |
| `scripts/` | 编译、打包、网络核验、本地演示与 MOJO 接入 |
| `tests/` | 成功路径、回滚、重放、资格、签名域与复算测试 |
| `config/monad.testnet.json` | 唯一测试网部署记录；未部署字段为空 |
| `docs/` | 产品收敛、架构、验收与参赛说明 |

完整范围和实现映射见 [技术方案](docs/technical-plan.md)。首次场次分配是背景对照，当前合约实现的是已持有名额的条件换位。身份核验、通知、签到、代付队列和生产钱包接入属于后续工作。

## 诚信与隐私

- 两家须在线下真实预留席位；合约不能保证机构履约。
- 一地址至多一席不等于一自然人一席；资格与身份由机构核验。
- 链上地址、资格掩码和名额关系可关联；不写入姓名、手机或证件资料。
- `.mojo/`、`.env`、私钥、原始附件与本地工具不进入仓库或部署包。
- 往届比较有覆盖限制，不宣称全球首创或已查尽全部项目。

来源与范围见 [来源记录](docs/sources.md)。
