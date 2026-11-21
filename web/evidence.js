import { verifyEvidence } from './replay.mjs';

async function json(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Evidence unavailable');
  return response.json();
}
const localTitle = document.getElementById('local-proof-title');
try {
  const evidence = await json('evidence/local-demo.json');
  if (evidence.mode !== 'local-evm') throw new Error('Unexpected evidence mode');
  const result = verifyEvidence(evidence);
  localTitle.textContent = '事件复算与合约快照一致';
  document.getElementById('local-proof').textContent = `本地合约记录：${result.seatCount} 席，${result.assignedPeople} 人获配。浏览器已独立复算 ${result.executedPlans} 份成功方案。这不是 Monad 测试网交易。`;
  document.getElementById('local-proof-link').hidden = false;
} catch {
  localTitle.textContent = '暂无可核验的本地记录';
  document.getElementById('local-proof').textContent = '证据未生成、读取失败或复算不一致。可在仓库运行 pnpm demo:local 后重新打包。';
}
try {
  const network = await json('evidence/network.json');
  if (network.chainId !== 10143 || !Number.isInteger(network.finalizedBlock)) throw new Error('Unexpected chain');
  const checkedAt = new Date(network.checkedAt);
  if (Number.isNaN(checkedAt.valueOf())) throw new Error('Invalid timestamp');
  document.getElementById('network-proof').textContent = `已于 ${checkedAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}（北京时间）只读核对网络，最终区块 ${network.finalizedBlock.toLocaleString('en-US')}。这是检查快照；应用合约尚未部署。`;
} catch {
  document.getElementById('network-proof').textContent = '没有可用的网络检查快照。应用合约尚未部署，不显示测试网交易结果。';
}
