# 来源与结论覆盖范围

梳理日期：2026-11-21。附件是研究来源，里面的建议和“已验证”字样不自动成为实施指令或本项目验证结论。

## 六份材料

| 来源文件 | 用途 | 本次处理 |
| --- | --- | --- |
| `One_More_Person_Design_Pack_v0.1.zip` | 设计、双场参考算法、原型、交互图 | 对照范围；22,240 组历史验证声明不计入本次测试成绩 |
| `多一个人 跨机构活动名额分配产品与技术方案.md` | 产品目标、机构边界、签名与队列约束 | 作为范围映射主文档 |
| `Interactive_Prototype.html` | 原始联合分配演示 | 只作交互来源，不视为链上实现 |
| `Product_Technical_Design.pdf` | 12 页技术方案 | 与 Markdown 方案交叉比对，保留待实现部分 |
| `monad广州 介绍.pdf` | 活动介绍 | 文本提取有限，不能据此确认全部图文；截止使用官方当日 API 与既有项目约定 |
| `Monad广州.pptx` | 活动要求、Monad 技术背景 | 提取内容要求可访问的在线演示；协议参数不当作应用实测 |

原件与本机提取结果保留在本地，不把含个人路径的清单和原始附件上传到 GitHub 或 Sites。

## 当前官方出处

- [MOJO 活动配置引导](https://mojo.devnads.com/api/agent/guide/18)：配置复用已有 Agent，截止为 2026-11-21 18:30（北京时间）。引导不代替用户本人报名。
- [MOJO 当前接口说明](https://mojo.devnads.com/api/agent/skills/mojo)：已在本次会话读取；接口说明不保存为技能副本。项目提交与队长身份由服务端校验。
- [Monad Testnet](https://docs.monad.xyz/developer-essentials/testnet)：网络配置来源；实际 chainId 与 finalized 在运行时另行核验。
- [EIP-712](https://eips.ethereum.org/EIPS/eip-712)：结构化签名域与消息设计依据。
- [Hardhat 3 配置](https://hardhat.org/docs/reference/configuration)：本地 EVM 网络配置；本地测试不验证 Monad 网络特性。

## 往届比较与限制

此前保存的 MOJO 创意导师反馈将范围建议收敛为保底换位。反馈属于第三方模型意见，不是官方评审或完整查重证明；本次未重新发送创意，也未进行新的全量检索。

| 公开项目 | 已有记录中的比较点 | 本项目差异 |
| --- | --- | --- |
| [去中心化抢票平台](https://mojo.devnads.com/projects/96) | 单场抢票与限制领取 | 完整多人的条件换位，任一条件失败则原位保留 |
| [不鸽](https://mojo.devnads.com/projects/297) | 签到与押金约束 | 不使用押金，处理跨机构名额协调 |
| [拼好团](https://github.com/veithly/fairjoin) | 费用分摊与差价 | 指标为同供给下的获配人数与已有权利保留 |
| [AntForge](https://mojo.devnads.com/projects/305) | 排他领取与任务并发 | 不以吞吐量测试充当业务成效 |

这些比较仅覆盖原材料和此前反馈提及的公开项目。链接供复查，本次代码工作未重新验证所有页面内容；不能据此声称已查尽全部往届或全球首创。
