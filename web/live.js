import { createPublicClient, createWalletClient, custom, encodeDeployData, http, zeroAddress } from 'viem';
import { monadTestnet } from 'viem/chains';
import { matchesRuntime } from '../lib/deployment.mjs';
import { CHAIN_ID, SESSION_KIND, TERMS, TERMS_HASH, buildPlan, checkSnapshot, consentTypedData, executionReadiness,
  mergeSessions, movesForContract, normalizeSession, parseSession, poolConfigHash, poolConstructorArgs,
  sessionText, uint, validateParticipants, verifySessionSignatures } from '../lib/live-protocol.mjs';

const $ = id => document.getElementById(id);
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const short = value => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : '—';
const explorer = 'https://testnet.monadvision.com';
const hostNames = ['Dr. Alice', 'Dr. Bob'];
// The build-time override is used only by the loopback browser test harness. Public builds use Monad RPC.
const RPC_URL = typeof __OMP_TEST_RPC__ === 'string' && ['127.0.0.1', 'localhost'].includes(location.hostname)
  ? __OMP_TEST_RPC__ : 'https://testnet-rpc.monad.xyz';
const IS_LOCAL_HARNESS = RPC_URL.startsWith('http://127.0.0.1:') || RPC_URL.startsWith('http://localhost:');
const publicClient = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL, { timeout: 12000, retryCount: 1 }), cacheTime: 0, pollingInterval: 1000 });
const state = { lang: 'en', account: null, wallet: null, provider: null, session: null, snapshot: null,
  verified: false, busy: false, artifact: null, records: [], providers: [] };
const say = (en, zh) => state.lang === 'zh' ? zh : en;
const seatNames = () => [say('Sat · 10:00 AM', '周六上午 10:00'), say('Sat · 2:00 PM', '周六下午 14:00'), say('Sun · 2:00 PM', '周日下午 14:00')];
function element(tag, className, text) { const item = document.createElement(tag); if (className) item.className = className; if (text !== undefined) item.textContent = text; return item; }
function link(text, url) { const item = element('a', '', text); item.href = url; item.target = '_blank'; item.rel = 'noopener'; return item; }
function status(text, type = '') { $('live-status').textContent = text; $('live-status').className = `status ${type}`; }
function planStatus(text, type = '') { $('plan-check').textContent = text; $('plan-check').className = `status ${type}`; }
function errorText(error) {
  const code = error?.code ?? error?.cause?.code;
  if (code === 4001 || error?.name === 'UserRejectedRequestError' || /user rejected|user denied/i.test(error?.shortMessage ?? error?.message ?? '')) return say('You declined the wallet request. No new approval was recorded by this page.', '你拒绝了钱包请求。此页面没有记录新的同意。');
  const text = error?.shortMessage ?? error?.message ?? String(error);
  return String(text).split('\n')[0].replace(/https?:\/\/[^\s)]+/g, '[RPC]').slice(0, 300);
}
async function action(fn) {
  if (state.busy) return;
  state.busy = true; renderButtons();
  try { await fn(); }
  catch (error) { status(errorText(error), 'failure'); }
  finally { state.busy = false; render(); }
}
function renderButtons() {
  const connected = !!state.account;
  const pool = state.session?.pool;
  const plan = state.session?.plan;
  const readiness = executionReadiness(state.session, state.snapshot);
  const member = pool?.participants.some(x => same(x, state.account));
  const hostIndex = pool?.participants.slice(0, 2).findIndex(x => same(x, state.account)) ?? -1;
  const hostAlreadyApproved = hostIndex >= 0 && ((state.snapshot?.approvals ?? 0) & (1 << hostIndex));
  const allowed = {
    connect: true, create: connected && !pool && !!state.artifact, import: !!state.artifact,
    approve: connected && state.verified && hostIndex >= 0 && !hostAlreadyApproved,
    refresh: state.verified, 'build-plan': state.verified && !plan && state.snapshot?.approvals === 3 && state.snapshot.seatOf.join(',') === '1,2,0',
    sign: connected && member && !!plan && state.verified && readiness.stage === 'active' && !state.session?.signatures[state.account?.toLowerCase()],
    'check-plan': !!plan && state.verified,
    execute: connected && state.verified && readiness.canExecute,
    'cancel-consent': connected && member && state.verified,
    'clear-plan': !!plan, 'copy-session': !!pool, 'download-session': !!pool,
    'clear-session': !!pool, 'download-record': state.records.length > 0,
  };
  for (const [id, enabled] of Object.entries(allowed)) $(id).disabled = state.busy || !enabled;
  $('approve').textContent = hostIndex >= 0 ? say(`Approve as ${hostNames[hostIndex]}`, `以 ${hostNames[hostIndex]} 身份确认`) : say('Approve pool as host', '以主办方身份确认');
  $('execute').textContent = readiness.stage === 'completed' ? say('Relay completed', '换位已完成') : say('Execute all three moves', '执行三人整份换位');
  $('provider-select').disabled = state.busy;
  $('create-form').querySelectorAll('input,select').forEach(el => { el.disabled = state.busy || !!pool; });
}
function renderWallet() {
  $('wallet-label').textContent = state.account ? `${say('Connected', '已连接')} · ${short(state.account)}` : say('No wallet connected', '尚未连接钱包');
  $('wallet-label').title = state.account ?? '';
  $('wallet-detail').textContent = state.account ? say('Monad Testnet only. Every signature and transaction needs your wallet approval.', '仅使用 Monad 测试网。每份签名和交易都需在你的钱包确认。') : say('Use an installed Ethereum-compatible browser wallet with test MON.', '请使用已安装的以太坊兼容浏览器钱包，并准备测试 MON。');
  $('connect').textContent = state.account ? say('Reconnect / switch account', '重新连接 / 切换账户') : say('Connect wallet', '连接钱包');
}
function renderPool() {
  if (!state.session || !state.snapshot) {
    $('pool-badge').textContent = say('NOT LOADED', '尚未加载');
    $('pool-summary').textContent = say('Create a pool or import a shared session. We verify its code and deployment before allowing a signature.', '创建席位池或导入共享会话。允许签名前，我们会核验合约代码和部署交易。');
    $('live-seats').replaceChildren(element('div', 'seat-placeholder', say('A keeps seat 1 · B keeps seat 2 · seat 3 is open', 'A 保留席位 1 · B 保留席位 2 · 席位 3 空缺')));
    $('pool-meta').replaceChildren(); $('host-status').replaceChildren(); return;
  }
  const { pool } = state.session; const snap = state.snapshot;
  const count = snap.seats.filter(x => !same(x, zeroAddress)).length;
  $('pool-badge').textContent = say('CODE VERIFIED', '代码已核验');
  $('pool-summary').textContent = say(`${count} people have seats. Read together from finalized block ${snap.blockNumber}.`, `${count} 人已有席位。状态统一读取自最终确认区块 ${snap.blockNumber}。`);
  $('live-seats').replaceChildren(...snap.seats.map((owner, i) => {
    const empty = same(owner, zeroAddress); const row = element('div', `live-seat${empty ? ' empty' : ''}`);
    const details = element('div'); details.append(element('strong', '', seatNames()[i]), element('small', '', `${say('Seat', '席位')} ${i + 1}`));
    const index = pool.participants.findIndex(x => same(x, owner));
    const who = element('div', 'seat-owner', empty ? say('Open seat', '空缺席位') : `${say('Participant', '参加者')} ${['A', 'B', 'C'][index] ?? '?'}`);
    if (!empty) who.append(element('small', '', short(owner)));
    row.append(details, who); return row;
  }));
  const contract = element('p'); contract.append(document.createTextNode(`${say('Pool', '席位池')} · `), link(pool.contractAddress, `${explorer}/address/${pool.contractAddress}`));
  const close = element('p', '', `${say('Closes', '截止')} · ${new Date(Number(pool.closesAt) * 1000).toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-GB')}`);
  $('pool-meta').replaceChildren(contract, close);
  $('host-status').replaceChildren(...[0, 1].map(i => element('span', `host-pill${snap.approvals & (1 << i) ? ' approved' : ''}`, `${hostNames[i]} · ${snap.approvals & (1 << i) ? say('approved', '已确认') : say('waiting', '待确认')}`)));
}
function renderPlan() {
  const plan = state.session?.plan; const sigs = state.session?.signatures ?? {};
  const readiness = executionReadiness(state.session, state.snapshot);
  const count = Object.keys(sigs).length;
  const inactive = ['stale', 'expired', 'completed'].includes(readiness.stage);
  const hint = readiness.stage === 'completed' ? say(' · seats updated; these approvals cannot run again', ' · 席位已更新，这些同意不可再次执行')
    : readiness.stage === 'stale' ? say(' · old plan is no longer valid', ' · 旧方案已失效')
      : readiness.stage === 'expired' ? say(' · plan expired', ' · 方案已过期') : '';
  $('signature-count').textContent = `${count} / 3 ${say('wallet signatures collected', '份钱包签名已收集')}${hint}`;
  $('signature-count').parentElement.dataset.state = readiness.stage;
  $('signature-fill').style.width = `${count / 3 * 100}%`;
  if (!plan) {
    $('live-plan').replaceChildren(element('p', 'muted', say('Both hosts approve the pool, then build one plan and share it with all three wallets.', '两位主办方先确认席位池，再生成一份方案分享给三个钱包。'))); return;
  }
  const rows = plan.moves.map((move, i) => {
    const signed = !!sigs[move.participant.toLowerCase()];
    const row = element('div', `live-move${signed ? inactive ? ' inactive' : ' signed' : ''}`);
    const detail = element('div', 'move-detail');
    const from = move.fromSeat === '0' ? say('Waiting', '候补') : seatNames()[Number(move.fromSeat) - 1];
    detail.append(element('strong', '', `${from} → ${seatNames()[Number(move.toSeat) - 1]}`), element('small', '', `${short(move.participant)} · nonce ${move.nonce}`));
    const signatureLabel = !signed ? say('Needs consent', '待同意') : readiness.stage === 'completed' ? say('Nonce consumed', 'Nonce 已消耗')
      : readiness.stage === 'stale' ? say('Stale plan', '方案失效') : readiness.stage === 'expired' ? say('Expired', '已过期') : say('Signed', '已签名');
    row.append(element('span', 'person', ['A', 'B', 'C'][i]), detail, element('span', 'signature-state', signatureLabel)); return row;
  });
  rows.push(element('p', 'plan-identity mono', `${say('Whole-plan hash', '整份方案哈希')} · ${plan.planHash}`));
  rows.push(element('p', 'plan-deadline', `${say('Signatures expire', '签名过期')} · ${new Date(Number(plan.validUntil) * 1000).toLocaleString(state.lang === 'zh' ? 'zh-CN' : 'en-GB')}`));
  $('live-plan').replaceChildren(...rows);
}
function renderRecords() {
  if (!state.records.length) return;
  $('transaction-list').replaceChildren(...[...state.records].reverse().map(record => {
    const row = element('article', 'transaction-row'); const top = element('div', 'transaction-top');
    const names = { deploy: say('Create pool', '创建席位池'), approve: say('Host approval', '主办方确认'), cancel: say('Cancel consent', '撤回同意'), execute: say('Execute relay', '执行换位') };
    const statuses = { submitted: say('Submitted', '已提交'), receipt: say('Receipt received · awaiting finality', '已收到回执 · 等待最终确认'), finalized: say('Finalized', '已最终确认'), reverted: say('Reverted · seats unchanged', '已回滚 · 席位不变'), unconfirmed: say('Confirmation incomplete · check explorer', '确认未完成 · 请查浏览器') };
    top.append(element('strong', '', names[record.action] ?? record.action), element('span', `tx-state ${record.state}`, statuses[record.state] ?? record.state));
    row.append(top); const tx = link(record.hash, `${explorer}/tx/${record.hash}`); tx.className = 'tx-link'; row.append(tx);
    const metrics = element('div', 'tx-metrics');
    for (const [label, value] of [[say('Hash → receipt', '哈希 → 回执'), record.receiptMs], [say('Hash → finalized', '哈希 → 最终确认'), record.finalizedMs]]) {
      const item = element('span', '', `${label} `); item.append(element('strong', '', value === undefined ? say('pending', '等待中') : `${(value / 1000).toFixed(2)} s`)); metrics.append(item);
    }
    if (record.gasLimit) metrics.append(element('span', '', `${say('Gas limit', 'Gas 上限')} ${record.gasLimit}`));
    if (record.receiptBlock) metrics.append(element('span', '', `${say('Receipt block', '回执区块')} ${record.receiptBlock}`));
    row.append(metrics); return row;
  }));
}
function render() { renderWallet(); renderPool(); renderPlan(); renderRecords(); renderButtons(); }
function setLanguage(lang) {
  state.lang = lang; document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[lang].replace(/\\n/g, '\n'); });
  $('language').textContent = lang === 'en' ? '中文' : 'English'; $('language').setAttribute('aria-label', lang === 'en' ? 'Switch to Chinese' : '切换为英语'); render();
}

function addProvider(provider, name) {
  if (!provider?.request || state.providers.some(x => x.provider === provider)) return;
  state.providers.push({ provider, name: String(name).slice(0, 60) });
  $('provider-select').replaceChildren(...state.providers.map((p, i) => { const option = element('option', '', p.name); option.value = String(i); return option; }));
  $('provider-wrap').hidden = state.providers.length < 2; $('no-wallet').hidden = state.providers.length > 0;
}
window.addEventListener('eip6963:announceProvider', event => addProvider(event.detail?.provider, event.detail?.info?.name ?? 'Browser wallet'));
window.dispatchEvent(new Event('eip6963:requestProvider'));
if (window.ethereum) {
  for (const provider of window.ethereum.providers ?? [window.ethereum]) addProvider(provider, provider.isMetaMask ? 'MetaMask-compatible wallet' : provider.isRabby ? 'Rabby' : 'Browser wallet');
}
$('no-wallet').hidden = state.providers.length > 0;
async function connect() {
  const provider = state.providers[Number($('provider-select').value) || 0]?.provider;
  if (!provider) throw new Error(say('No browser wallet detected. Open this page in your wallet-enabled browser, or use the safety challenge below.', '未检测到浏览器钱包。请在安装钱包的浏览器打开，或使用下方安全挑战。'));
  const wallet = createWalletClient({ chain: monadTestnet, transport: custom(provider) });
  const accounts = await wallet.requestAddresses();
  if (!accounts.length) throw new Error('The wallet did not expose an account');
  const current = await wallet.getChainId();
  if (current !== CHAIN_ID) {
    status(say('Approve switching to Monad Testnet in your wallet.', '请在钱包中确认切换到 Monad 测试网。'));
    try { await wallet.switchChain({ id: CHAIN_ID }); }
    catch (error) { if ((error?.code ?? error?.cause?.code) !== 4902) throw error; await wallet.addChain({ chain: monadTestnet }); await wallet.switchChain({ id: CHAIN_ID }); }
  }
  if (await wallet.getChainId() !== CHAIN_ID) throw new Error('Wallet must be on Monad Testnet (10143)');
  state.provider = provider; state.wallet = wallet; state.account = accounts[0];
  if (!$('participant-a').value && !state.session) $('participant-a').value = state.account;
  provider.on?.('accountsChanged', accounts => { if (state.provider !== provider) return; state.account = accounts[0] ?? null; render(); });
  provider.on?.('chainChanged', chainId => { if (state.provider !== provider) return; if (Number(chainId) !== CHAIN_ID) { state.account = null; state.wallet = null; status(say('Wallet network changed. Reconnect to Monad Testnet before signing.', '钱包网络已变更。请先重新连接 Monad 测试网再签名。'), 'failure'); render(); } });
  status(say('Wallet connected. Create or import a pool. Every chain action still requires your approval.', '钱包已连接。可以创建或导入席位池，每次链上操作仍需你的确认。'), 'success');
}
async function ensureWallet() {
  if (!state.wallet || !state.account) throw new Error(say('Connect your wallet first.', '请先连接钱包。'));
  if (await state.wallet.getChainId() !== CHAIN_ID || await publicClient.getChainId() !== CHAIN_ID) throw new Error('Monad Testnet (10143) is required');
  const accounts = await state.wallet.getAddresses();
  if (!same(accounts[0], state.account)) { state.account = accounts[0] ?? null; throw new Error('Wallet account changed. Review the account and try again'); }
  return state.account;
}
const read = (pool, functionName, args, blockNumber) => publicClient.readContract({ address: pool.contractAddress, abi: state.artifact.abi, functionName, args: args ?? [], blockNumber });
async function readSnapshot(pool) {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('RPC network mismatch');
  const block = await publicClient.getBlock({ blockTag: 'finalized' });
  const seats = await read(pool, 'getSeats', [], block.number);
  if (seats.length !== 3) throw new Error('Unexpected pool size');
  const approvals = Number(await read(pool, 'approvals', [], block.number));
  const nonces = [], seatOf = [];
  for (const person of pool.participants) { nonces.push((await read(pool, 'nonces', [person], block.number)).toString()); seatOf.push((await read(pool, 'seatOf', [person], block.number)).toString()); }
  return { blockNumber: block.number.toString(), blockHash: block.hash, timestamp: block.timestamp.toString(), seats, approvals, nonces, seatOf };
}
async function verifyPool(pool) {
  if (!state.artifact) throw new Error('Contract artifact is not loaded');
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('RPC network mismatch');
  const final = await publicClient.getBlock({ blockTag: 'finalized' });
  const code = await publicClient.getBytecode({ address: pool.contractAddress, blockNumber: final.number });
  if (!matchesRuntime(code, state.artifact)) throw new Error('Pool bytecode does not match this app’s SafeSeatRelay contract');
  const receipt = await publicClient.getTransactionReceipt({ hash: pool.deploymentTransaction });
  const tx = await publicClient.getTransaction({ hash: pool.deploymentTransaction });
  if (receipt.status !== 'success' || receipt.blockNumber > final.number || !same(receipt.contractAddress, pool.contractAddress)
    || receipt.blockNumber !== uint(pool.deploymentBlock) || tx.to !== null || !same(tx.from, pool.deployerAddress)) throw new Error('Deployment transaction or identity does not match the pool');
  const deploymentBlock = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  if (deploymentBlock.hash !== receipt.blockHash || uint(pool.closesAt) <= deploymentBlock.timestamp
    || uint(pool.closesAt) > deploymentBlock.timestamp + 86400n) throw new Error('Pool deployment block or bounded 24-hour deadline mismatch');
  const expectedInput = encodeDeployData({ abi: state.artifact.abi, bytecode: state.artifact.bytecode, args: poolConstructorArgs(pool) });
  if (!same(tx.input, expectedInput)) throw new Error('Constructor does not match the displayed hosts, participants, seats and rules');
  if (!same(await read(pool, 'configHash', [], final.number), poolConfigHash(pool))) throw new Error('Onchain pool configuration mismatch');
  if (!same(await read(pool, 'termsHash', [], final.number), TERMS_HASH)) throw new Error('Onchain terms mismatch');
  if (!same(await read(pool, 'hostA', [], final.number), pool.participants[0]) || !same(await read(pool, 'hostB', [], final.number), pool.participants[1])) throw new Error('Onchain hosts mismatch');
  if (await read(pool, 'closesAt', [], final.number) !== uint(pool.closesAt)) throw new Error('Onchain deadline mismatch');
  return readSnapshot(pool);
}
async function refresh() {
  if (!state.session || !state.verified) throw new Error('No verified pool loaded');
  state.snapshot = await readSnapshot(state.session.pool); render(); return state.snapshot;
}
async function waitTransaction(hash, actionName, metadata = {}) {
  const started = performance.now();
  const record = { chainId: CHAIN_ID, action: actionName, hash, submittedAt: new Date().toISOString(), state: 'submitted', ...metadata };
  state.records.push(record); renderRecords();
  status(say('Transaction submitted. Waiting for a receipt, then a finalized block.', '交易已提交。正在等待回执，再等待最终确认区块。'));
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90000 });
    record.receiptMs = Math.round(performance.now() - started); record.receiptBlock = receipt.blockNumber.toString(); record.receiptBlockHash = receipt.blockHash;
    record.receiptStatus = receipt.status; record.gasUsed = receipt.gasUsed.toString(); record.effectiveGasPrice = receipt.effectiveGasPrice.toString(); record.state = 'receipt'; renderRecords();
    const tx = await publicClient.getTransaction({ hash }); record.gasLimit = tx.gas.toString();
    const until = performance.now() + 60000;
    let final;
    while (performance.now() < until) {
      final = await publicClient.getBlock({ blockTag: 'finalized' });
      if (final.number >= receipt.blockNumber) {
        const included = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
        if (included.hash !== receipt.blockHash) throw new Error('Receipt block changed before finality. Refresh the transaction in the explorer');
        record.finalizedMs = Math.round(performance.now() - started); record.finalizedBlock = final.number.toString(); record.finalizedBlockHash = final.hash;
        record.state = receipt.status === 'success' ? 'finalized' : 'reverted'; renderRecords();
        if (receipt.status !== 'success') throw new Error('Transaction reverted. No seat changes were applied');
        return receipt;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Finality was not confirmed in time. Do not resubmit blindly; check the recorded transaction hash');
  } catch (error) { if (!['finalized', 'reverted'].includes(record.state)) record.state = 'unconfirmed'; renderRecords(); throw error; }
}
async function createPool() {
  const account = await ensureWallet();
  if (state.session) throw new Error('Clear the current session before creating another pool');
  if (!$('terms-ok').checked) throw new Error('Confirm the fictional demo terms first');
  const participants = validateParticipants(['a', 'b', 'c'].map(id => $(`participant-${id}`).value.trim()));
  const hours = Number($('pool-hours').value);
  if (![1, 4, 24].includes(hours)) throw new Error('Choose a pool duration between 1 and 24 hours');
  const now = await publicClient.getBlock(); const closesAt = (now.timestamp + BigInt(hours * 3600)).toString();
  const args = poolConstructorArgs({ participants, closesAt });
  const data = encodeDeployData({ abi: state.artifact.abi, bytecode: state.artifact.bytecode, args });
  const estimate = await publicClient.estimateGas({ account, data, value: 0n }); const gas = (estimate * 115n + 99n) / 100n;
  if (gas > 8000000n) throw new Error('Deployment estimate exceeds the demo limit');
  status(say('Review the pool deployment in your wallet. This uses test MON for gas.', '请在钱包核对席位池部署交易。Gas 使用测试 MON。'));
  const hash = await state.wallet.deployContract({ account, chain: monadTestnet, abi: state.artifact.abi, bytecode: state.artifact.bytecode, args, gas, value: 0n });
  const receipt = await waitTransaction(hash, 'deploy', { participants, closesAt, termsHash: TERMS_HASH });
  const session = normalizeSession({ schemaVersion: 1, kind: SESSION_KIND, pool: { chainId: CHAIN_ID, contractAddress: receipt.contractAddress, deployerAddress: account,
    deploymentTransaction: hash, deploymentBlock: receipt.blockNumber.toString(), participants, closesAt, termsHash: TERMS_HASH }, plan: null, signatures: {} });
  const snapshot = await verifyPool(session.pool); state.session = session; state.snapshot = snapshot; state.verified = true;
  status(say('Pool deployed and code verified. A and B each approve it, then share the session.', '席位池已部署并核验代码。请 A、B 分别确认，再分享会话。'), 'success');
}
async function importSession(text) {
  text = text.trim();
  if (/^https?:\/\//i.test(text)) {
    if (text.length > 72000) throw new Error('Shared session link is too large');
    const url = new URL(text);
    if (!url.hash.startsWith('#relay=')) throw new Error('This link does not contain a shared relay session');
    text = decodeURIComponent(url.hash.slice(7));
  }
  const incoming = parseSession(text); await verifySessionSignatures(incoming);
  const merged = mergeSessions(state.session, incoming);
  status(say('Verifying the deployment, contract bytecode and exact shared rules…', '正在核验部署、合约代码及完整共享规则…'));
  const snapshot = await verifyPool(merged.pool);
  state.session = merged; state.snapshot = snapshot; state.verified = true; $('import-session').value = '';
  status(say('Session verified. Matching signatures were merged. Check the plan before executing.', '会话已核验，匹配的签名已合并。执行前请检查方案。'), 'success');
  if (merged.plan) { try { checkSnapshot(merged, snapshot); } catch (error) { planStatus(errorText(error), 'failure'); } }
}
async function write(functionName, args, actionName) {
  const account = await ensureWallet(); const pool = state.session.pool;
  const simulated = await publicClient.simulateContract({ account, address: pool.contractAddress, abi: state.artifact.abi, functionName, args });
  const estimate = await publicClient.estimateContractGas({ account, address: pool.contractAddress, abi: state.artifact.abi, functionName, args });
  const gas = (estimate * 115n + 99n) / 100n;
  if (gas > 4000000n) throw new Error('Transaction estimate exceeds the demo limit');
  const hash = await state.wallet.writeContract({ ...simulated.request, account, chain: monadTestnet, gas });
  const receipt = await waitTransaction(hash, actionName, { contractAddress: pool.contractAddress });
  await refresh(); return receipt;
}
async function approvePool() {
  const account = await ensureWallet(); const pool = state.session.pool;
  if (!pool.participants.slice(0, 2).some(x => same(x, account))) throw new Error('Only the demo hosts Dr. Alice or Dr. Bob can approve this pool');
  await write('approvePool', [poolConfigHash(pool)], 'approve');
  status(say('Host approval finalized. Both host approvals are required before the relay can execute.', '主办方确认已最终生效。换位执行需要两位主办方都确认。'), 'success');
}
async function makePlan() {
  const snapshot = await refresh();
  if (state.session.plan) throw new Error('Clear the existing plan before creating a new one');
  if (snapshot.approvals !== 3) throw new Error('Both hosts must approve first');
  if (snapshot.seatOf.join(',') !== '1,2,0') throw new Error('This three-seat relay is already complete or the starting seats changed');
  const remaining = uint(state.session.pool.closesAt) - uint(snapshot.timestamp);
  if (remaining < 120n) throw new Error('Less than two minutes remain in this pool. Create a new pool for a fresh demo');
  const until = uint(snapshot.timestamp) + (remaining < 3600n ? remaining : 3600n);
  state.session.plan = buildPlan(state.session.pool, snapshot.nonces, until); state.session.signatures = {};
  planStatus(say('Share this exact plan. Each participant checks their move and signs with their own wallet.', '请分享这份完整方案。每位参加者核对自己的换位，并使用自己的钱包签名。'));
  status(say('Shared plan created with current onchain nonces. It expires within one hour.', '共享方案已使用当前链上 nonce 生成，有效期不超过一小时。'), 'success');
}
async function signMove() {
  const account = await ensureWallet(); const snapshot = await refresh(); checkSnapshot(state.session, snapshot);
  const data = consentTypedData(state.session.pool, state.session.plan, account);
  const signature = await state.wallet.signTypedData({ account, ...data });
  const candidate = normalizeSession({ ...state.session, signatures: { ...state.session.signatures, [account.toLowerCase()]: signature } });
  await verifySessionSignatures(candidate); state.session = candidate;
  status(say('Your real wallet signature was verified. Share the updated session with the next participant.', '你的真实钱包签名已验证。请将更新后的会话分享给下一位参加者。'), 'success');
}
async function preflight() {
  const snapshot = await refresh();
  try {
    if (!state.session.plan || Object.keys(state.session.signatures).length !== 3) throw new Error('All three real wallet signatures are required');
    await verifySessionSignatures(state.session);
    const { pool, plan, signatures } = state.session;
    await publicClient.simulateContract({ account: state.account ?? pool.participants[0], address: pool.contractAddress, abi: state.artifact.abi,
      functionName: 'execute', args: [movesForContract(plan), uint(plan.validUntil), plan.moves.map(m => signatures[m.participant.toLowerCase()])] });
    checkSnapshot(state.session, snapshot, { requireSignatures: true });
    planStatus(say('Preflight passed on the current chain state. This read-only check did not move any seats; execution still requires a transaction.', '当前链上状态预检查通过。此只读检查没有移动任何席位，执行仍需要交易。'), 'success'); return true;
  } catch (error) {
    let detail = errorText(error);
    try { checkSnapshot(state.session, snapshot, { requireSignatures: true }); } catch (known) { detail = errorText(known); }
    planStatus(`${say('Preflight rejected. No transaction was sent.', '预检查已拒绝，没有发送交易。')} ${detail}`, 'failure'); throw error;
  }
}
async function executePlan() {
  await ensureWallet(); await preflight();
  const { plan, signatures } = state.session;
  await write('execute', [movesForContract(plan), uint(plan.validUntil), plan.moves.map(m => signatures[m.participant.toLowerCase()])], 'execute');
  const expected = [state.session.pool.participants[2], state.session.pool.participants[0], state.session.pool.participants[1]];
  if (!state.snapshot.seats.every((x, i) => same(x, expected[i]))) throw new Error('Transaction finalized, but the expected final seats could not be confirmed');
  planStatus(say('All three moves finalized together. Three people now have seats; nobody gave up their seat first.', '三人的换位已一起最终确认。现在三个人都有席位，没有人需要先退位。'), 'success');
  status(say('Relay finalized: A takes afternoon, B takes Sunday, and C gets the morning seat.', '换位已最终确认：A 去下午，B 去周日，C 获得上午席位。'), 'success');
}
async function cancelConsent() {
  const account = await ensureWallet(); if (!state.session.pool.participants.some(x => same(x, account))) throw new Error('Only a registered participant can cancel their own consent');
  await write('cancelConsent', [], 'cancel');
  planStatus(say('Cancellation finalized. The old plan is still shown so you can check that it is rejected. Your current seat was not released.', '撤回已最终确认。旧方案仍保留，可以检查它已被拒绝。你的当前席位没有释放。'), 'failure');
  status(say('Consent cancellation finalized. Build a fresh plan and collect fresh signatures to try again.', '撤回同意已最终生效。如需再次尝试，请生成新方案并重新收集签名。'), 'success');
}
function download(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
function clearPlan() { state.session.plan = null; state.session.signatures = {}; planStatus(say('Plan cleared locally. Existing signatures are not revoked; use Cancel my consent to invalidate them onchain.', '方案已在本地清除。已有签名未撤销，需使用「撤回我的同意」在链上使其失效。')); status(say('You can now build a fresh plan with the current nonces.', '现在可以使用当前 nonce 生成新方案。')); }
function clearSession() { state.session = null; state.snapshot = null; state.verified = false; history.replaceState(null, '', location.pathname + location.search); status(say('Session cleared from this page. This does not cancel any onchain consent.', '此页面会话已清除，这不会撤销任何链上同意。')); render(); }

$('connect').addEventListener('click', () => action(connect));
$('create-form').addEventListener('submit', event => { event.preventDefault(); action(createPool); });
$('import').addEventListener('click', () => action(() => importSession($('import-session').value)));
$('session-file').addEventListener('change', event => action(async () => { const file = event.target.files[0]; if (!file) return; if (file.size > 24000) throw new Error('Session file is too large'); await importSession(await file.text()); event.target.value = ''; }));
$('approve').addEventListener('click', () => action(approvePool));
$('refresh').addEventListener('click', () => action(async () => { await refresh(); status(say('Seats refreshed from one finalized block.', '席位已从同一最终确认区块刷新。'), 'success'); }));
$('build-plan').addEventListener('click', () => action(makePlan));
$('sign').addEventListener('click', () => action(signMove));
$('check-plan').addEventListener('click', () => action(preflight));
$('execute').addEventListener('click', () => action(executePlan));
$('cancel-consent').addEventListener('click', () => action(cancelConsent));
$('clear-plan').addEventListener('click', () => action(clearPlan));
$('clear-session').addEventListener('click', clearSession);
$('copy-session').addEventListener('click', () => action(async () => { const url = `${location.origin}${location.pathname}#relay=${encodeURIComponent(sessionText(state.session))}`; await navigator.clipboard.writeText(url); status(say('Session link copied. Share it with the next participant, then import their updated link or file.', '会话链接已复制。请分享给下一位，再导入对方更新后的链接或文件。'), 'success'); }));
$('download-session').addEventListener('click', () => download(state.session, `one-more-person-session-${state.session.pool.contractAddress.slice(2, 10)}.json`));
$('download-record').addEventListener('click', () => download({ schemaVersion: 1, mode: IS_LOCAL_HARNESS ? 'local-browser-harness' : 'monad-testnet-live-wallet', chainId: CHAIN_ID, recordedAt: new Date().toISOString(),
  environment: IS_LOCAL_HARNESS ? 'Isolated Hardhat EVM uses chainId 10143 only to exercise the signature domain. NOT Monad. No real funds or measured network finality.' : 'Monad Testnet; fictional workshop seats.',
  timingSource: 'Browser monotonic clock, starting when wallet returned transaction hash. Includes RPC and polling delay; not a consensus or TPS benchmark.',
  pool: state.session?.pool ?? null, finalizedSnapshot: state.snapshot, transactions: state.records }, IS_LOCAL_HARNESS ? 'one-more-person-local-harness.json' : 'one-more-person-transactions.json'));
$('language').addEventListener('click', () => setLanguage(state.lang === 'en' ? 'zh' : 'en'));
$('terms-text').textContent = TERMS; $('terms-hash').textContent = `keccak256 · ${TERMS_HASH}`;
render();
await action(async () => {
  const response = await fetch('live-artifact.json', { cache: 'no-store' }); if (!response.ok) throw new Error('The contract artifact could not be loaded. Reload before using real wallets');
  const artifact = await response.json();
  if (!Array.isArray(artifact.abi) || !artifact.bytecode?.startsWith('0x') || !artifact.runtimeBytecode?.startsWith('0x') || !artifact.immutableReferences) throw new Error('Invalid contract artifact');
  state.artifact = artifact;
  if (location.hash.startsWith('#relay=')) { const encoded = location.hash.slice(7); if (encoded.length > 72000) throw new Error('Shared session link is too large'); await importSession(decodeURIComponent(encoded)); }
  else status(say('Start with three different wallets. A acts as Dr. Alice; B acts as Dr. Bob.', '请准备三个不同的钱包。A 担任 Dr. Alice，B 担任 Dr. Bob。'));
  if (location.hash === '#challenge') { $('challenge').open = true; $('shared-plan').scrollIntoView({ block: 'start' }); }
});
