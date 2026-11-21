# 前端视觉改版 · 2026-11-21

公开演示：https://one-more-person-guangzhou.justdog33.chatgpt.site

采用深色底、Monad 紫与空位青绿色，新增 SVG 席位接力示意、轻量浮动与轨道动画、人物标记、同意进度和整组成功反馈。动画遵循 `prefers-reduced-motion`；无需远程图片、字体或新增依赖。

本次仅改交互演示层，未连接钱包，未广播交易。部署状态和本地 EVM 证据仍分开显示。

## 验证

- `node --check web/app.js` 通过。
- `node --test tests/model.test.mjs`：2 项测试通过，覆盖拒绝、撤回、过期、无增益互换和无解。
- `node scripts/build-web.mjs` 构建通过；本地 HTTP 200。
- Edge 桌面与 390 × 844 手机视口：无横向溢出。
- 浏览器操作：不同意时保留 2 人获配；三人逐一同意显示 1/3 至 3/3，执行后 3 人获配；撤回显示“旧方案已失效”并保留原位；过期显示“方案已过期”并保留原位；两人互换仍为 2 人；无可用空位不产生方案。
- 公开 Sites 版本 2 发布成功，浏览器已读取新版首页及独立复算结果。

截图：`redesign-desktop.jpg`（公开网站）、`redesign-mobile-home.jpg`、`redesign-mobile-cancel.jpg`（本地同版源码）。
