import { mnemonicToAccount } from 'viem/accounts';
import { consentTypedData } from '../lib/live-protocol.mjs';
const $ = id => document.getElementById(id);
const roles = ['alice','bob','charlie'];
const names = ['Alice','Bob','Charlie'];
const linkRole = new URL(location.href).searchParams.get('role');
const storageKey = `omp-rehearsal-${roles.includes(linkRole) ? linkRole : 'tab'}`;
let login = null; try { login = JSON.parse(sessionStorage.getItem(storageKey)); } catch {}
let state, busy = false, connected = false, zh = sessionStorage.getItem('omp-rehearsal-language') === 'zh';
function acceptState(incoming) {
  if (login && login.instanceId !== incoming.instanceId) { login=null; sessionStorage.removeItem(storageKey); }
  if (!state || state.instanceId !== incoming.instanceId || incoming.version >= state.version) state=incoming;
}
const t = (en, cn) => zh ? cn : en;
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slot = n => [t('Waiting list','候补'),t('Sat · 10 AM','周六 · 上午10点'),t('Sat · 2 PM','周六 · 下午2点'),t('Sun · 2 PM','周日 · 下午2点')][Number(n)];
const text = (id, en, cn) => { $(id).textContent = t(en, cn); };
async function api(path, body) {
  const response = await fetch(path,{method:'POST',headers:{'content-type':'application/json',...(login ? {authorization:`Bearer ${login.token}`} : {})},body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) { if(response.status === 401) { login=null;sessionStorage.removeItem(storageKey);render(); } throw new Error(data.error); }
  return data;
}
function render() {
  $('login').hidden=!!login;$('room').hidden=!login;
  text('language', '中文','English');
  text('mode','LOCAL BLOCKCHAIN REHEARSAL · Real signatures and EVM transactions · Fictional people and seats · Not public Monad','本地链彩排 · 真实签名与 EVM 交易 · 虚构人物和席位 · 非公共 Monad');
  text('connection',connected?'Live room connected':'Room disconnected',connected?'房间已实时连接':'房间已断开');
  document.body.classList.toggle('disconnected',!connected);
  document.querySelectorAll('[data-login]').forEach(b=>{b.classList.toggle('selected',b.dataset.login===linkRole);b.disabled=!connected||busy;});
  if(!state||!login)return;
  const i=roles.indexOf(login.role),name=names[i],a=state.actors[i], s=state.snapshot,stage=state.readiness.stage;
  const mine=state.signatures[a.address.toLowerCase()];
  document.title=`${name} · One More Person live room`;
  text('identity-type',i<2?`PARTICIPANT + HOST ${i===0?'A':'B'}`:'WAITING LIST PARTICIPANT',i<2?`参加者 + 主办方 ${i===0?'A':'B'}`:'候补参加者');
  text('greeting',`You're ${name}.`,`你是 ${name}。`);
  text('identity',`${name} · this tab only`,`${name} · 仅此标签页`);
  text('personal-story',i===0?'You have morning. Afternoon works better.':i===1?'You have afternoon. You can move to Sunday.':'You are waiting. Only Saturday morning works.',i===0?'已有上午席位，想换到下午。':i===1?'已有下午席位，可以改到周日。':'正在候补，只能参加周六上午。');
  text('logout','Log out of this tab','退出此标签页');text('round-label',`LIVE ROOM · ROUND ${state.round}`,`实时房间 · 第 ${state.round} 轮`);
  text('room-title','The same 3 seats. Room for one more.','相同的 3 个席位，多一个人参加。');
  $('attendees').textContent=s.seatOf.filter(x=>x!=='0').length;
  text('attendee-label','people attending / 3 seats','人参加 / 共 3 席');
  $('seats').innerHTML=s.seats.map((holder,j)=>{const actor=state.actors.find(p=>p.address.toLowerCase()===holder.toLowerCase());const isMe=actor?.role===login.role;return `<article class="seat ${actor?'':'open'} ${isMe?'mine':''}"><div class="seat-top"><span>${t('SEAT','席位')} ${j+1}</span><span>${isMe?t('YOUR SEAT','你的席位'):actor?t('RESERVED','已保留'):t('AVAILABLE','空缺')}</span></div><h3>${slot(j+1)}</h3><div class="holder">${actor?actor.name:t('Empty seat','空位')}</div><small>${j===0?t('Host A · morning workshop','主办方 A · 上午工作坊'):t('Host B · alternative workshop','主办方 B · 可选场次')}</small></article>`;}).join('');
  $('outcome').hidden=!state.lastResult;
  if(state.lastResult){$('outcome').className=`outcome ${state.lastResult.kind}`;$('outcome').textContent=state.lastResult.message;}
  text('hosts-title','Both hosts lock the rules','两位主办方确认规则');text('hosts-copy','Alice and Bob each approve this fixed pool. Neither can move a participant alone.','Alice 和 Bob 分别确认固定席位池，任何一方都不能单独移动参加者。');
  $('host-count').textContent=`${(s.approvals&1?1:0)+(s.approvals&2?1:0)} / 2`;
  $('hosts').innerHTML=[0,1].map(j=>`<span class="${s.approvals&(j+1)?'yes':''}">${names[j]} · ${s.approvals&(j+1)?t('Approved','已确认'):t('Waiting','待确认')}</span>`).join('');
  $('approve').hidden=i===2; $('approve').disabled=busy||!connected||!!(s.approvals&(i+1));text('approve',`Approve pool as Host ${i===0?'A':'B'}`,`作为主办方 ${i===0?'A':'B'} 确认`);
  text('plan-title','One plan. Three yeses.','一份方案，三人同意。');
  const stages={none:t('NO PLAN','未创建'),active:t('COLLECTING CONSENT','收集同意'),stale:t('WITHDRAWN','已撤回'),completed:t('COMPLETED','已完成'),expired:t('EXPIRED','已过期'),waiting:t('WAITING','等待')};
  $('plan-status').textContent=stages[stage];
  $('moves').innerHTML=names.map((n,j)=>`<div class="move"><strong>${n}</strong><span>${slot([1,2,0][j])}</span><span>→</span><span class="to">${slot([2,3,1][j])}</span></div>`).join('');
  $('signatures').innerHTML=state.actors.map(p=>{const sig=state.signatures[p.address.toLowerCase()];return `<span class="signature ${sig?(stage==='stale'?'stale':'signed'):''}">${p.name} · ${sig?(stage==='stale'?t('needs fresh consent','需重新同意'):t('signed','已签名')):t('not signed','未签名')}</span>`;}).join('');
  text('my-consent',`Your current place: ${slot(s.seatOf[i])}. Signing alone never releases it.`,`当前位置：${slot(s.seatOf[i])}。仅签名不会释放原位。`);
  $('plan').hidden=i!==0; $('plan').disabled=busy||!connected||s.approvals!==3||!['none','stale','expired'].includes(stage);
  text('plan',state.plan?'Create fresh plan':'Create shared plan',state.plan?'创建新方案':'创建共享方案');
  $('sign').disabled=busy||!connected||stage!=='active'||!!mine;text('sign',mine?'My move approved':'Approve my move',mine?'我已同意':'同意我的换位');
  $('cancel').disabled=busy||!connected||stage!=='active'||!mine;text('cancel','Withdraw my approval','撤回我的同意');
  $('execute').disabled=busy||!connected||!state.plan;
  const count=Object.keys(state.signatures).length;
  text('execute',stage==='completed'?'Try used plan':stage==='stale'?'Try withdrawn plan':count<3?'Try incomplete plan':'Execute all 3 moves',stage==='completed'?'尝试重放旧方案':stage==='stale'?'尝试已撤回方案':count<3?'尝试缺签方案':'执行三人换位');
  text('execute-help',stage==='completed'?'Every move completed in the same transaction. A replay must fail.':stage==='stale'?'The withdrawn plan must revert. Nobody loses their current seat.':count<3?'Try it now: the contract must reject missing consent.':'All three signed. Execute together, or Bob can withdraw first.',stage==='completed'?'三人换位在同一交易完成；重放必须失败。':stage==='stale'?'撤回后的方案必须失败，所有原位保留。':count<3?'现在尝试：合约必须拒绝缺少同意的方案。':'三人已签名，可以一起执行，也可以先让 Bob 撤回。');
  text('next-label','YOUR NEXT STEP','你的下一步');
  let next,copy;
  if(s.approvals!==3){next=i<2&&!((i+1)&s.approvals)?t('Approve your host pool','确认你的席位池'):t('Wait for both hosts','等待两位主办方');copy=t('Alice approves Host A. Bob approves Host B. Watch both badges update.','Alice 确认 A，Bob 确认 B，观察两个状态实时变化。');}
  else if(!state.plan){next=i===0?t('Create the shared plan','创建共享方案'):t('Alice creates one plan','等待 Alice 创建方案');copy=t('The plan includes all three moves, not just your own.','方案包含三个人的全部换位。');}
  else if(stage==='completed'){next=t('One more person gets in','多一个人参加');copy=t('Charlie has morning. Alice has afternoon. Bob has Sunday. No extra seats were added.','Charlie 上午，Alice 下午，Bob 周日，没有增加席位。');}
  else if(stage==='stale'){next=i===0?t('Prove the old plan fails','证明旧方案失败'):t('Your original seat is safe','你的原位仍然安全');copy=t('On Alice: Try withdrawn plan, then Create fresh plan. Everyone signs again.','Alice 尝试已撤回方案，再创建新方案，三人重新同意。');}
  else if(!mine){next=t('Review and approve your move','查看并同意你的换位');copy=t('Your page signs the exact full plan with your local test identity.','此页面使用你的本地测试身份签署整份方案。');}
  else{next=count===3?t('Ready for the safety challenge','可以开始撤回挑战'):t('Wait for the other signatures','等待其他人签名');copy=t('Once all three sign, Bob withdraws. Then Alice tries the old plan. After fresh signatures, execute.','三人签名后由 Bob 撤回，Alice 尝试旧方案。重新同意后执行成功。');}
  $('next-step').textContent=next;$('next-copy').textContent=copy;
  $('rundown').innerHTML=(zh?['Alice 与 Bob 确认席位池','Alice 创建方案','三人分别同意换位','Bob 撤回，Alice 尝试失败','创建新方案，三人重新同意','Alice 执行，2 人变成 3 人']:['Alice & Bob approve the pool','Alice creates the shared plan','Each person approves their move','Bob withdraws; Alice proves rejection','Fresh plan; all three approve again','Alice executes: 2 people become 3']).map(x=>`<li>${x}</li>`).join('');
  text('activity-title','Live activity','实时记录');$('activity').innerHTML=state.activity.slice(-7).reverse().map(x=>`<li>${esc(x)}</li>`).join('');
  text('evidence-title','Receipts & contract evidence','回执与合约证据');$('contract').textContent=`Local EVM 31337 · verified contract ${state.pool.contractAddress} · block ${s.blockNumber}`;$('account').textContent=`${name}: ${a.address} · consent nonce ${s.nonces[i]}`;
  $('transactions').innerHTML=state.transactions.slice().reverse().map(tx=>`<div class="receipt"><strong class="${tx.status==='success'?'yes':''}">${esc(tx.action)} · ${tx.status.toUpperCase()}</strong> · block ${tx.blockNumber}<code>${tx.hash}</code></div>`).join('');
  text('download','Download this rehearsal record','下载本轮证据');$('presenter').hidden=i!==0;text('presenter-title','Presenter controls','演示控制');text('reset-copy','Restart deploys a fresh local pool and clears this round’s signatures and receipts in all three pages. Download evidence first if you want to keep it.','重新开始会部署新的本地席位池，并清除三页本轮签名与回执；如需保留请先下载证据。');text('reset','Restart rehearsal','重新开始彩排');$('reset').disabled=busy||!connected;
}
async function run(type) {
  busy=true; $('feedback').textContent=t('Working…','处理中…');$('feedback').className='';render();
  try {
    let payload={type};
    if(type==='signature') {
      const index=roles.indexOf(login.role);
      // Public fixture key, never funded on any public network. Signing happens separately in each tab.
      const account=mnemonicToAccount('test test test test test test test test test test test junk',{addressIndex:index});
      const pool=state.pool,plan=state.plan;
      payload={...payload,planHash:plan.planHash,contractAddress:pool.contractAddress,signature:await account.signTypedData(consentTypedData(pool,plan,account.address,31337))};
    }
    acceptState(await api('/api/action',payload));$('feedback').textContent=t('Done. All connected pages are updated.','完成，所有已连接页面已同步。');
  } catch(error){$('feedback').textContent=error.message;$('feedback').className='error';}
  finally{busy=false;render();}
}
for(const [id,type] of Object.entries({approve:'approve',plan:'plan',sign:'signature',cancel:'cancel',execute:'execute',reset:'reset'}))$(id).onclick=()=>run(type);
document.querySelectorAll('[data-login]').forEach(button=>button.onclick=async()=>{busy=true;render();try{login=await api('/api/login',{role:button.dataset.login});sessionStorage.setItem(storageKey,JSON.stringify(login));render();}catch(error){alert(error.message);}finally{busy=false;render();}});
$('logout').onclick=async()=>{try{await api('/api/logout',{});}finally{login=null;sessionStorage.removeItem(storageKey);render();}};
$('language').onclick=()=>{zh=!zh;sessionStorage.setItem('omp-rehearsal-language',zh?'zh':'en');render();};
const events=new EventSource('/api/events');
events.onopen=()=>{connected=true;render();};
events.onmessage=event=>{acceptState(JSON.parse(event.data));render();};
events.onerror=()=>{connected=false;render();};
render();
