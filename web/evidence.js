import { verifyEvidence } from './replay.mjs';
const en = document.documentElement.lang === 'en';

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
  localTitle.textContent = en ? 'Events match the seat snapshot' : '事件复算与合约快照一致';
  document.getElementById('local-proof').textContent = en ? `${result.seatCount} seats, ${result.assignedPeople} people. Your browser independently replayed ${result.executedPlans} successful plan. This is a local EVM test, not a Monad transaction.` : `本地合约记录：${result.seatCount} 席，${result.assignedPeople} 人获配。浏览器已独立复算 ${result.executedPlans} 份成功方案。这不是 Monad 测试网交易。`;
  document.getElementById('local-proof-link').hidden = false;
} catch {
  localTitle.textContent = en ? 'Local evidence could not be verified' : '暂无可核验的本地记录';
  document.getElementById('local-proof').textContent = en ? 'The snapshot is unavailable or inconsistent. Generate and rebuild local evidence from the repository.' : '证据未生成、读取失败或复算不一致。可在仓库运行 pnpm demo:local 后重新打包。';
}
try {
  const proof = await json('evidence/monad-proof-evidence.json');
  if (proof.mode !== 'monad-testnet' || proof.fixtureType !== 'single-controller-fictional-actors' || !/^0x[0-9a-f]{64}$/i.test(proof.proofHash)) throw new Error('Unexpected proof');
  const result = verifyEvidence(proof);
  if (result.executedPlans !== 1 || result.assignedPeople !== 3 || result.additionalPeople !== 1) throw new Error('Unexpected result');
  document.getElementById('network-proof-title').textContent = en ? 'Testnet snapshot checks out' : '测试网样例已复算';
  document.getElementById('network-proof').textContent = en ? 'A real transaction: 3 seats, 3 people, +1 attendee. Missing-consent and replay calls were rejected inside the proof transaction. Fictional actors share one controller; this is not a human pilot or performance benchmark.' : '真实交易的公开快照：3 席获配 3 人，新增 1 人。缺签与重放的内部调用被拒绝。虚构角色由同一控制者管理；不是多人真实签名或性能测试。';
  const links = document.createElement('div'); links.className = 'proof-links';
  const transaction = document.createElement('a'); transaction.href = 'https://testnet.monadvision.com/tx/' + proof.proofHash; transaction.textContent = en ? 'Inspect the Monad transaction' : '查看测试网证明交易'; transaction.target = '_blank'; transaction.rel = 'noopener';
  const download = document.createElement('a'); download.href = 'evidence/monad-proof-evidence.json'; download.textContent = en ? 'Download the event snapshot' : '下载事件快照'; download.download = 'monad-proof-evidence.json';
  links.append(transaction, download); document.getElementById('network-proof').after(links);
} catch {
  document.getElementById('network-proof-title').textContent = en ? 'Testnet evidence needs checking' : '测试网证据待复核';
  document.getElementById('network-proof').textContent = en ? 'The snapshot is unavailable or failed verification. The home simulation remains available; no unverified chain result is shown.' : '无法读取证明快照，或事件复算不一致。上方仍可体验机制演示；此处不把未核验的数据显示为链上结果。';
}
