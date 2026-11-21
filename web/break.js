import { createPublicClient, http } from 'viem';
import { monadTestnet } from 'viem/chains';
import { verifyBreakSnapshot, verifyBreakOnChain, verifyCancellationSnapshot, verifyCancellationOnChain } from '../lib/break-proof.mjs';

const $ = id => document.getElementById(id);
const initialLabels = Object.fromEntries([...document.querySelectorAll('[data-i18n]')].map(node => [node.dataset.i18n, node.textContent]));
const zh = {
  brandSub: '保住原位，多一种可能。', navWallet: '真实钱包演示', navPitch: '项目介绍',
  eyebrow: 'MONAD BLITZ / 评委亲自挑战', title1: '试着让它失败。', title2: '原位仍然属于你。',
  intro: '换个工作坊时间，不该先放弃手上的名额。让一次换位失败，看看每个人的席位是否仍然安全。',
  promiseLabel: '只有一个承诺', promiseTitle: '只有整份方案成功，你才会放开原来的席位。', promiseScope: '原子协调，无需发行代币。',
  sandboxEyebrow: '先检验规则', chooseTitle: '你来决定，哪一步出错。', simulationBadge: '机制模拟 · 不发送交易',
  scenario: '小林有周六上午场，小陈有周六下午场，周日还有一个空位。小雨想参加周六上午，正在候补。所有人物和席位均为虚构。',
  missingButton: '试试缺少一人同意', missingSub: '小雨尚未同意。', cancelButton: '撤回后，再执行旧方案', cancelSub: '小陈改变了主意。',
  validButton: '执行完整接力', validSub: '所有人同意同一份完整方案。', readyLabel: '等待你的挑战', ofThree: '人已有名额 / 共 3 席',
  freshScene: '每次选择都会从新的虚构场景开始，方便比较不同结果。',
  beforeTitle: '尝试执行前', afterTitle: '尝试执行后', resetButton: '重置挑战',
  walletInvitation: '想把模拟同意换成你自己的真实钱包签名？', walletLink: '打开真实钱包流程',
  chainEyebrow: '再检查链上证据', chainTitle: '真实交易，可复核的结果。',
  chainIntro: '这是独立的链上测试：全部合约钱包角色由同一个测试控制器管理。它证明合约行为，不代表独立参与者或真实工作坊试点。',
  recordLabel: '已记录的合约测试', proofTitle: '一笔成功的外层交易。', innerNote: '其中两次内部调用被拒绝，并不是两笔失败的外层交易。',
  gainLabel: '此构造案例多安排一人', proofMissingTitle: '缺少同意，被拒绝', proofMissingText: '原来的席位与所有同意计数都没有变化。',
  proofValidTitle: '完整接力，执行成功', proofValidText: '小林去下午，小陈去周日，小雨拿到上午场。', proofReplayTitle: '重放旧方案，被拒绝', proofReplayText: '已完成的安排保持不变。',
  proofBlockLabel: '证明所在区块', gasLabel: '外层交易 gas limit', latencyLabel: '历史发送至最终确认耗时', notRecorded: '未记录',
  snapshotLoading: '正在复算下载的事件快照…', verifyButton: '现在向 Monad 重新核验', explorerLink: '查看交易', downloadProof: '下载证明 JSON',
  rpcNote: '此按钮只读取公共 RPC：交易、最终确认、合约代码、完整席位事件和同一区块席位。它不会签名或发送交易。读取耗时不代表交易速度。',
  cancellationEyebrow: '最新合约测试', cancellationTitle: '先撤回，拒绝旧方案，再签新方案。',
  earlierProof: '较早证明：缺少同意与重放', rejectionsLabel: '被拒绝的内部调用',
  cancellationRpcNote: '只读核验。所显示的耗时是 RPC 读取时间，不是交易确认速度。',
  scopeNote: '这些证据不代表真实机构采用、身份核验、线下名额履约或 Monad 极限吞吐量。增加人数仅发生在有合适空位的接力中；普通两人互换不会增加参加人数。',
  reviewerEyebrow: '质检要点', reviewerTitle: '失败，也应该保护参与者。', reviewerCopy: '正确的演示不只有成功路径。有人说“不”时，检查什么必须保持不变。',
  downloadReview: '下载我的挑战记录', footerScope: '虚构场景，明确的证据边界。',
};
const dynamic = {
  en: {
    names: { lin: 'Alice', chen: 'Bob', yu: 'Charlie', empty: 'Empty' },
    times: ['Saturday morning', 'Saturday afternoon', 'Sunday afternoon'], hosts: ['Host A', 'Host B', 'Host B'],
    idleTitle: 'Choose a challenge. Nobody has moved.', idleDetail: 'The plan would move Alice to afternoon, Bob to Sunday and Charlie into the morning vacancy. Looking at it releases no seats.',
    missingTitle: 'Plan rejected. Every original seat is protected.', missingDetail: 'Charlie did not agree. Two approvals cannot move three people. Alice keeps morning; Bob keeps afternoon.',
    cancelTitle: 'Old plan rejected. Bob still has his seat.', cancelDetail: 'Bob withdrew before execution. His consent counter changed, making the old plan stale even though it once had three approvals.',
    validTitle: 'The whole relay worked. One more person can join.', validDetail: 'All three agreed to this exact plan. Alice gets afternoon, Bob gets Sunday and Charlie gets morning. There was no extra seat.',
    errorTitle: 'The challenge did not meet its expected result.', errorDetail: 'Do not treat this as a passed safety check. Reset the challenge and review the downloaded record.',
    protectedLabel: 'REJECTED PLAN · SEATS PROTECTED', completeLabel: 'RELAY COMPLETE · ONE MORE PERSON', errorLabel: 'CHECK FAILED',
    idleCheck: 'Fictional local state. No wallet signature or RPC call.', protectedCheck: 'Seat check: 3 of 3 positions match the state before this attempt.', completeCheck: 'Seat check: all 3 agreed destinations match. Occupancy increased from 2 to 3.',
    collect: 'Consent', counter: 'Validity', result: 'Seat update',
    idleCollect: 'Waiting for your challenge.', idleCounter: 'Old seats remain owned.', idleResult: 'No changes yet.',
    missingCollect: '2 of 3 approvals. Charlie is missing.', missingCounter: 'The exact plan requires every participant.', missingResult: 'Rejected before any seat update.',
    cancelCollect: '3 approvals collected, then Bob withdraws.', cancelCounter: 'Bob’s counter changes from 0 to 1.', cancelResult: 'The old plan still says 0: rejected.',
    validCollect: 'All 3 approve the same complete plan.', validCounter: 'Ownership, eligibility and counters match.', validResult: 'All changes succeed together.',
    snapshotReady: 'Snapshot consistent: both rejection seat hashes match, and event replay reconstructs 3 assigned people. The separate button below rechecks public RPC data.',
    snapshotFail: 'The downloaded proof could not be validated. No fresh RPC verification is available.',
    progress: { network: 'Checking Monad Testnet, transaction and finality…', code: 'Checking historical contract bytecode…', events: 'Rebuilding seats from the complete event history…', seats: 'Comparing seats at the exact proof block…' },
    rpcSuccess: (seconds, block) => `Fresh RPC check passed in ${seconds}s. The proof is finalized by block ${Number(block).toLocaleString('en-US')}. This is verification read time, not the transaction’s confirmation latency.`,
    rpcFailure: 'Fresh RPC check could not complete. The downloaded snapshot remains a separate record; a failed read is not proof that the contract failed.',
    rpcRetry: 'Retry the Monad check', rpcChecking: 'Checking Monad…',
    cancellationDescription: 'One successful Monad transaction rejected three internal calls: missing consent, Bob’s withdrawn plan, and replay. Every rejection preserved the seats. Fresh approvals completed the 2-to-3 relay.',
    cancellationReady: 'Snapshot consistent: withdrawal 0→1, original seats preserved, three rejection records and one completed relay.',
    cancellationFail: 'The additional withdrawal proof could not be validated. Do not treat this card as a passed test.',
    cancellationVerify: 'Recheck withdrawal on Monad', cancellationExplorer: 'Inspect withdrawal proof',
  },
  zh: {
    names: { lin: '小林', chen: '小陈', yu: '小雨', empty: '空位' },
    times: ['周六上午', '周六下午', '周日下午'], hosts: ['主办方 A', '主办方 B', '主办方 B'],
    idleTitle: '请选择一次挑战，还没有人换位。', idleDetail: '方案让小林去下午、小陈去周日、小雨拿到上午场。仅查看方案，不会释放任何席位。',
    missingTitle: '方案被拒绝，所有原位受到保护。', missingDetail: '小雨尚未同意。两份同意不能让三个人换位。小林仍在上午，小陈仍在下午。',
    cancelTitle: '旧方案被拒绝，小陈仍保有原位。', cancelDetail: '小陈在执行前撤回，同意计数已经变化。旧方案即使曾集齐三份同意，也已失效。',
    validTitle: '整条接力成功，多一个人可以参加。', validDetail: '三个人同意同一份方案。小林拿到下午、小陈拿到周日、小雨拿到上午，没有新增任何席位。',
    errorTitle: '挑战结果不符合预期。', errorDetail: '不能把它当作通过的安全检查。请重置并检查下载的记录。',
    protectedLabel: '方案被拒绝 · 原位受到保护', completeLabel: '接力完成 · 多一个人参加', errorLabel: '核验失败',
    idleCheck: '虚构的本地状态，不进行钱包签名或 RPC 调用。', protectedCheck: '席位检查：3 个位置都与本次尝试前相同。', completeCheck: '席位检查：3 个同意的目标都符合预期，获配人数从 2 增至 3。',
    collect: '同意状态', counter: '有效条件', result: '席位更新', idleCollect: '等待选择挑战。', idleCounter: '每个人仍保有原位。', idleResult: '尚未更新。',
    missingCollect: '2 / 3 份同意，缺少小雨。', missingCounter: '完整方案需要每位参与者同意。', missingResult: '更新任何席位前就拒绝。',
    cancelCollect: '集齐 3 份同意后，小陈撤回。', cancelCounter: '小陈的计数由 0 变成 1。', cancelResult: '旧方案仍写着 0，因此拒绝。',
    validCollect: '3 人同意同一份完整方案。', validCounter: '当前持有者、资格与计数都符合。', validResult: '所有变更一起生效。',
    snapshotReady: '快照内部一致：两次拒绝的席位哈希都吻合，事件复算得到 3 人获配。下方按钮可另行读取公共 RPC 重新核验。',
    snapshotFail: '无法验证下载的证明，暂不能进行新的 RPC 核验。',
    progress: { network: '正在检查 Monad 测试网、交易与最终确认…', code: '正在检查历史合约字节码…', events: '正在从完整事件历史重建席位…', seats: '正在对照证明所在区块的席位…' },
    rpcSuccess: (seconds, block) => `本次 RPC 核验通过，用时 ${seconds} 秒；已在区块 ${Number(block).toLocaleString('zh-CN')} 或之前最终确认。这是读取核验耗时，不是原交易的确认延迟。`,
    rpcFailure: '本次 RPC 核验未能完成。已下载快照仍是独立记录；读取失败不代表合约执行失败。',
    rpcRetry: '重试 Monad 核验', rpcChecking: '正在核验 Monad…',
    cancellationDescription: '一笔成功的 Monad 交易中，三次内部调用被拒绝：缺少同意、小陈撤回后的旧方案、以及重放。每次拒绝都保留席位，重新集齐同意后完成 2 人到 3 人的接力。',
    cancellationReady: '快照内部一致：撤回计数 0→1、原位保留、三次拒绝记录与一次完整接力。',
    cancellationFail: '无法验证新增的撤回证明，不能把此卡片视作测试通过。',
    cancellationVerify: '向 Monad 重新核验撤回', cancellationExplorer: '查看撤回证明交易',
  },
};

let language = 'en';
try { if (localStorage.getItem('omp-language') === 'zh') language = 'zh'; } catch {}
let attempt = null, evidence = null, snapshotResult = null, snapshotFailed = false;
let rpcState = null;
let cancellationEvidence = null, cancellationResult = null, cancellationFailed = false, cancellationRpc = null;
const t = () => dynamic[language];
const clone = value => JSON.parse(JSON.stringify(value));
const chair = '<svg class="seat-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M8 9a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v20H8V9ZM5 29h30v7H5zM8 36v9m24-9v9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 10h22v18H9z" fill="currentColor" opacity=".16"/></svg>';

function seatsInto(id, seats, before) {
  const fragment = document.createDocumentFragment();
  seats.forEach((person, i) => {
    const tile = document.createElement('div');
    tile.className = `seat-tile${person ? '' : ' empty'}${before && person !== before[i] ? ' changed' : ''}`;
    tile.innerHTML = chair;
    const name = document.createElement('div'); name.className = 'seat-name'; name.textContent = t().times[i];
    const host = document.createElement('small'); host.textContent = t().hosts[i]; name.append(host); tile.append(name);
    const holder = document.createElement('div'); holder.className = 'seat-holder';
    const avatar = document.createElement('span'); avatar.className = `seat-avatar ${person || 'empty'}`; avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = person ? t().names[person].slice(language === 'zh' ? 1 : 0, language === 'zh' ? 2 : 1) : '+';
    const label = document.createElement('span'); label.textContent = t().names[person || 'empty'];
    holder.append(avatar, label); tile.append(holder); fragment.append(tile);
  });
  $(id).replaceChildren(fragment);
}

function renderChallenge() {
  const base = attempt?.before ?? SeatRelay.createState();
  const after = attempt?.result.state ?? base;
  const key = attempt?.consistent === false ? 'error' : attempt?.kind ?? 'idle';
  const phase = key === 'idle' ? 'idle' : key === 'error' ? 'error' : key === 'valid' ? 'complete' : 'protected';
  $('challenge-board').dataset.outcome = phase;
  $('outcome-label').textContent = key === 'idle' ? (language === 'zh' ? zh.readyLabel : initialLabels.readyLabel) : t()[`${phase}Label`];
  $('occupancy').textContent = after.seats.filter(Boolean).length;
  seatsInto('before-seats', base.seats);
  seatsInto('after-seats', after.seats, base.seats);
  $('outcome-title').textContent = t()[`${key}Title`]; $('outcome-detail').textContent = t()[`${key}Detail`];
  $('outcome-symbol').textContent = phase === 'idle' ? '◇' : phase === 'error' ? '!' : '✓';
  $('check-summary').textContent = t()[`${phase === 'error' ? 'idle' : phase}Check`];
  const trace = document.createDocumentFragment();
  for (const [label, suffix] of [['collect', 'Collect'], ['counter', 'Counter'], ['result', 'Result']]) {
    const item = document.createElement('li'), strong = document.createElement('strong');
    strong.textContent = t()[label]; item.append(strong, document.createTextNode(t()[`${key === 'error' ? 'idle' : key}${suffix}`])); trace.append(item);
  }
  $('trace').replaceChildren(trace);
  document.querySelectorAll('[data-challenge]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.challenge === attempt?.kind)));
}

function runChallenge(kind) {
  let before = SeatRelay.createState();
  const plan = SeatRelay.planFor(before), consent = { lin: true, chen: true, yu: kind !== 'missing' };
  if (kind === 'cancel') before = SeatRelay.cancel(before, 'chen');
  const result = SeatRelay.execute(before, plan, consent);
  const sameSeats = JSON.stringify(result.state.seats) === JSON.stringify(before.seats);
  const consistent = kind === 'valid'
    ? result.ok && result.additional === 1 && JSON.stringify(result.state.seats) === JSON.stringify(['yu', 'lin', 'chen'])
    : !result.ok && sameSeats;
  attempt = { mode: 'local-mechanism-simulation', kind, at: new Date().toISOString(), before: clone(before), plan: clone(plan), consent, result: clone(result), consistent };
  renderChallenge();
}

function renderProofStatus() {
  const node = $('snapshot-status');
  node.dataset.state = snapshotResult ? 'ready' : snapshotFailed ? 'error' : 'loading';
  node.textContent = snapshotResult ? t().snapshotReady : snapshotFailed ? t().snapshotFail : (language === 'zh' ? zh.snapshotLoading : initialLabels.snapshotLoading);
  if (snapshotResult) {
    $('proof-block').textContent = Number(evidence.proofBlock).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
    $('proof-gas').textContent = Number(evidence.proofGasLimit).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US');
  }
  const busy = rpcState?.status === 'running';
  $('verify-chain').disabled = !snapshotResult || busy || cancellationRpc?.status === 'running';
  $('verify-chain').textContent = busy ? t().rpcChecking : rpcState?.status === 'error' ? t().rpcRetry : (language === 'zh' ? zh.verifyButton : initialLabels.verifyButton);
  $('rpc-status').hidden = !rpcState;
  if (rpcState) {
    $('rpc-status').dataset.state = rpcState.status;
    $('rpc-status').textContent = busy ? t().progress[rpcState.stage]
      : rpcState.status === 'success' ? t().rpcSuccess(rpcState.seconds, rpcState.result.finalizedBlock) : t().rpcFailure;
  }
}

function renderCancellation() {
  const card = $('cancellation-card');
  card.hidden = !cancellationResult && !cancellationFailed;
  if (card.hidden) return;
  $('cancellation-description').textContent = cancellationResult ? t().cancellationDescription : '';
  $('cancellation-result').textContent = cancellationResult ? t().cancellationReady : t().cancellationFail;
  $('cancellation-result').dataset.state = cancellationResult ? 'ready' : 'error';
  if (cancellationResult) {
    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    $('cancellation-block').textContent = Number(cancellationEvidence.proofBlock).toLocaleString(locale);
    $('cancellation-gas').textContent = Number(cancellationEvidence.proofGasLimit).toLocaleString(locale);
    $('cancellation-rejections').textContent = cancellationResult.rejectedInternalCalls;
  }
  const links = $('cancellation-links'); links.replaceChildren();
  if (cancellationResult) {
    const verify = document.createElement('button'); verify.className = 'primary'; verify.id = 'verify-cancellation';
    verify.textContent = cancellationRpc?.status === 'running' ? t().rpcChecking : t().cancellationVerify;
    verify.disabled = cancellationRpc?.status === 'running' || rpcState?.status === 'running';
    verify.addEventListener('click', recheckCancellation);
    const explorer = document.createElement('a'); explorer.href = 'https://testnet.monadvision.com/tx/' + cancellationEvidence.proofHash;
    explorer.target = '_blank'; explorer.rel = 'noopener'; explorer.textContent = t().cancellationExplorer;
    const download = document.createElement('a'); download.href = 'evidence/cancellation-proof.json'; download.download = '';
    download.textContent = language === 'zh' ? zh.downloadProof : initialLabels.downloadProof;
    links.append(verify, explorer, download);
  }
  const status = $('cancellation-rpc-status'); status.hidden = !cancellationRpc;
  if (cancellationRpc) {
    status.dataset.state = cancellationRpc.status;
    status.textContent = cancellationRpc.status === 'running' ? t().progress[cancellationRpc.stage]
      : cancellationRpc.status === 'success' ? t().rpcSuccess(cancellationRpc.seconds, cancellationRpc.result.finalizedBlock) : t().rpcFailure;
  }
}

async function recheckCancellation() {
  if (!cancellationResult || cancellationRpc?.status === 'running' || rpcState?.status === 'running') return;
  cancellationRpc = { status: 'running', stage: 'network' }; renderCancellation(); renderProofStatus();
  const start = performance.now();
  try {
    const client = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz', { timeout: 10000, retryCount: 1 }) });
    const result = await verifyCancellationOnChain(client, cancellationEvidence, stage => { cancellationRpc.stage = stage; renderCancellation(); });
    cancellationRpc = { status: 'success', result, seconds: ((performance.now() - start) / 1000).toFixed(2), checkedAt: new Date().toISOString(), timingScope: 'RPC verification read duration, not transaction latency' };
  } catch (error) {
    cancellationRpc = { status: 'error', checkedAt: new Date().toISOString(), reason: String(error.shortMessage || error.message || 'Read failed').split('\n')[0].slice(0, 240) };
  }
  renderCancellation(); renderProofStatus();
}

function setLanguage(next) {
  language = next; document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  document.title = language === 'zh' ? '试着让它失败 · 多一个人' : 'Try to break it · One More Person';
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = language === 'zh' ? zh[node.dataset.i18n] ?? initialLabels[node.dataset.i18n] : initialLabels[node.dataset.i18n]; });
  $('language').textContent = language === 'zh' ? 'English' : '中文';
  $('language').lang = language === 'zh' ? 'en' : 'zh-CN';
  try { localStorage.setItem('omp-language', language); } catch {}
  renderChallenge(); renderProofStatus(); renderCancellation();
}

document.querySelectorAll('[data-challenge]').forEach(button => button.addEventListener('click', () => runChallenge(button.dataset.challenge)));
$('reset-challenge').addEventListener('click', () => { attempt = null; renderChallenge(); });
$('language').addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
$('verify-chain').addEventListener('click', async () => {
  if (!evidence || !snapshotResult || rpcState?.status === 'running' || cancellationRpc?.status === 'running') return;
  rpcState = { status: 'running', stage: 'network' }; renderProofStatus(); renderCancellation();
  const start = performance.now();
  try {
    const client = createPublicClient({ chain: monadTestnet, transport: http('https://testnet-rpc.monad.xyz', { timeout: 10000, retryCount: 1 }) });
    const result = await verifyBreakOnChain(client, evidence, stage => { rpcState.stage = stage; renderProofStatus(); });
    rpcState = { status: 'success', result, seconds: ((performance.now() - start) / 1000).toFixed(2), checkedAt: new Date().toISOString(), timingScope: 'RPC verification read duration, not transaction latency' };
  } catch (error) {
    rpcState = { status: 'error', checkedAt: new Date().toISOString(), reason: String(error.shortMessage || error.message || 'Read failed').split('\n')[0].slice(0, 240) };
  }
  renderProofStatus(); renderCancellation();
});
$('download-review').addEventListener('click', () => {
  const record = { schemaVersion: 1, createdAt: new Date().toISOString(), simulation: attempt,
    downloadedSnapshotCheck: snapshotResult ? { scope: snapshotResult.scope, proofHash: evidence.proofHash, rejectedInternalCalls: 2, additionalPeople: 1 } : null,
    freshRpcCheck: rpcState?.status === 'running' ? { status: 'incomplete' } : rpcState,
    withdrawalSnapshotCheck: cancellationResult ? { scope: cancellationResult.scope, proofHash: cancellationEvidence.proofHash, rejectedInternalCalls: 3, withdrawalProved: true } : null,
    withdrawalRpcCheck: cancellationRpc?.status === 'running' ? { status: 'incomplete' } : cancellationRpc,
    warning: 'Fictional local scenario and separate single-controller contract-wallet proof. Not an independent-user pilot or throughput benchmark.' };
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'one-more-person-judge-challenge.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

setLanguage(language);
fetch('evidence/monad-proof-evidence.json', { cache: 'no-store' })
  .then(response => { if (!response.ok) throw new Error('Evidence unavailable'); return response.json(); })
  .then(record => { snapshotResult = verifyBreakSnapshot(record); evidence = record; renderProofStatus(); })
  .catch(() => { snapshotFailed = true; renderProofStatus(); });

fetch('evidence/cancellation-proof.json', { cache: 'no-store' })
  .then(response => { if (response.status === 404) return null; if (!response.ok) throw new Error('Withdrawal evidence unavailable'); return response.json(); })
  .then(record => { if (!record) return; cancellationResult = verifyCancellationSnapshot(record); cancellationEvidence = record; renderCancellation(); })
  .catch(() => { cancellationFailed = true; renderCancellation(); });
