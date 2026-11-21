import { initialRoom, changeRoom, roles } from './demo-state.mjs';
import { initRoleMenu } from './role-menu.js';
initRoleMenu();
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const pageRole = location.pathname.split('/').pop().replace(/\.html$/, '');
const role = roles.includes(pageRole) ? pageRole : roles.includes(params.get('role')) ? params.get('role') : null;
const rawRoom = params.get('room') ?? 'stage';
const room = /^[a-zA-Z0-9_-]{1,40}$/.test(rawRoom) ? rawRoom : 'stage';
const key = `omp-interaction-v1:${room}`;
const names = { alice: 'Alice', bob: 'Bob', charlie: 'Charlie' };
const hostNames = { alice: 'Dr. Alice', bob: 'Dr. Bob' };
let zh = params.get('lang') === 'zh', state, busy = false, ready = false, feedback = '', error = false, primaryAction = null;
let channel; try { channel = new BroadcastChannel(key); } catch {}
const t = (en, cn) => zh ? cn : en;
const text = (id, en, cn) => { $(id).textContent = t(en, cn); };
const slots = () => [t('Sat · 10 AM', '周六 · 上午10点'), t('Sat · 2 PM', '周六 · 下午2点'), t('Sun · 2 PM', '周日 · 下午2点')];
const href = r => `${r}.html?room=${encodeURIComponent(room)}&lang=${zh ? 'zh' : 'en'}`;
function read() {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (value.schema !== 1 || value.room !== room || !Array.isArray(value.seats) || !Array.isArray(value.consents)) throw new Error('Invalid room data. Create a new demo room.');
  return value;
}
function save(next) { localStorage.setItem(key, JSON.stringify(next)); channel?.postMessage(next.revision); }
function receive() {
  try { const next = read(); if(next && (!state || next.revision !== state.revision)){state=next;feedback='';render();} }
  catch { ready=false; render(); }
}
window.addEventListener('storage', event => { if(event.key === key)receive(); });
if(channel)channel.onmessage=receive;
window.addEventListener('pageshow', receive);
document.addEventListener('visibilitychange', () => {if(!document.hidden)receive();});
function render() {
  document.documentElement.lang=zh?'zh-CN':'en'; document.body.dataset.role=role??'lobby';
  $('lobby').hidden=!!role; $('participant').hidden=!role;
  text('language','中文','English');text('proof','Monad proof','Monad 链上证据');text('guide-link','Demo guide','演示说明');
  text('switch-label','Choose participant','选择演示人物');
  text('menu-copy','Choose a person for this tab. Your shared room stays the same.','仅切换当前页面的人物，保留共享房间进度。');
  $('role-menu-trigger').setAttribute('aria-label',t('Choose participant','选择演示人物'));
  $('role-menu-trigger').title=t('Choose participant','选择演示人物');
  $('reset-room').hidden=!role;
  $('reset-room').disabled=busy||!ready;
  $('reset-room').title=t('Reset demo room — all three pages','重置演示房间（三个页面一起回到初始状态）');
  $('reset-room').setAttribute('aria-label',$('reset-room').title);
  $('role-menu-close').setAttribute('aria-label',t('Close participant chooser','关闭人物选择'));
  $('role-switcher').setAttribute('aria-label',t('Switch this page’s person','切换当前页面的人物'));
  $('role-switcher').innerHTML=roles.map(r=>`<a class="role-chip ${r===role?'selected':''}" data-person="${r}" href="${href(r)}" ${r===role?'aria-current="page"':''}><span class="chip-avatar" aria-hidden="true">${names[r][0]}</span>${names[r]}${r===role?'<span class="selected-mark" aria-hidden="true">✓</span>':''}</a>`).join('');
  text('disclosure','INTERACTION SIMULATION · Shared in this browser only · No blockchain transactions','交互模拟 · 仅在同一浏览器内同步 · 不发送区块链交易');
  text('boundary','This public demo simulates consent and execution. The local app runs real isolated EVM transactions; Monad proof opens a separate recorded Testnet result. Use one browser profile; other devices do not share this room.','公网版模拟同意和执行。本地版运行真实隔离 EVM 交易；Monad 链上证据为独立记录的真实测试网结果。请使用同一浏览器配置，不同设备不会同步。');
  text('lobby-label','THREE PAGES. ONE SHARED STORY.','三个页面，共享同一个故事。');
  $('lobby-title').innerHTML=zh?'一个人。<br>一个页面。<br><em>多一个机会。</em>':'One person.<br>One page.<br><em>One more place.</em>';
  text('lobby-copy','Open Alice, Bob and Charlie in three tabs of the same browser. Each person makes their own choices. Watch every page change together.','在同一浏览器打开 Alice、Bob、Charlie 三个标签页。每个人操作自己的页面，三页同步展示同一份结果。');
  const stories=[t('Has morning. Wants afternoon.','已有上午席位，想换到下午。'),t('Has afternoon. Can move to Sunday.','已有下午席位，可以改到周日。'),t('Waiting. Can only attend morning.','仍在候补，只能参加上午。')];
  $('role-cards').innerHTML=roles.map((r,i)=>`<a class="role-card" href="${href(r)}" target="_blank" rel="noopener"><div class="avatar">${names[r][0]}</div><h2>${names[r]}</h2><p>${stories[i]}</p><span class="open">${t('Open '+names[r]+"'s page",'打开 '+names[r]+' 的页面')}</span></a>`).join('');
  text('new-room','Create a separate demo room','创建另一个演示房间');text('copy-links','Copy the three links','复制三个页面链接');
  text('lobby-note',`Room: ${room}. Open all three links in the same browser profile. Keep the same room name.`, `房间：${room}。请在同一浏览器配置打开三个链接，保持房间名称一致。`);
  if(!role||!state)return;
  const i=roles.indexOf(role), complete=state.phase==='completed', stale=state.phase==='withdrawn', signed=state.consents.includes(role), hostReady=state.hosts.every(Boolean);
  document.title=`${names[role]} · ${t('Shared demo','共享演示')} · One More Person`;
  text('role-caption',i===0?'PARTICIPANT + HOST · Dr. Alice · PRESENTER':i===1?'PARTICIPANT + HOST · Dr. Bob':'PARTICIPANT · WAITING LIST',i===0?'参加者 + 主办方 Dr. Alice · 演示者':i===1?'参加者 + 主办方 Dr. Bob':'参加者 · 候补');
  text('greeting',`You're ${names[role]}.`,`你是 ${names[role]}。`);$('story').textContent=complete?t('Your new seat is confirmed. The complete exchange worked.','你的新席位已确认，完整换位已成功。'):stories[i];$('avatar').textContent=names[role][0];
  text('room-label',`ROOM ${room} · ROUND ${state.round} · PLAN ${state.plan || '—'}`,`房间 ${room} · 第 ${state.round} 轮 · 方案 ${state.plan || '未创建'}`);
  text('sync',ready?`Shared update #${state.revision} · Tabs sync automatically`:'Sync unavailable',ready?`共享更新 #${state.revision} · 三页自动同步`:'同步不可用');
  const phase=complete?3:state.plan?2:hostReady?1:0;
  $('steps').innerHTML=(zh?['主办方确认','完整换位方案','三人分别同意','一起获得新席位']:['Hosts approve','One complete plan','Everyone agrees','New seats together']).map((label,n)=>`<li class="${n<phase?'done':n===phase?'current':''}" ${n===phase?'aria-current="step"':''}>${label}</li>`).join('');
  text('your-move-label','YOUR MOVE','你的换位');text('current-label',complete?'Before the exchange':'Your current place',complete?'换位之前':'你当前的席位');
  const seat=complete?[0,1,-1][i]:state.seats.indexOf(role);$('current-seat').textContent=seat<0?t('Waiting list','候补中'):slots()[seat];
  text('protected',complete?'Changed only when the whole plan worked':seat<0?'No current booking to release':'Still yours until the whole plan works',complete?'完整方案成功后才改变':seat<0?'不会挤占他人的已有席位':'整份方案成功前，原位仍属于你');
  text('destination-label',complete?'Your confirmed new seat':'Your accepted destination',complete?'已确认的新席位':'你接受的新场次');$('destination').textContent=slots()[[1,2,0][i]];
  text('destination-note',complete?'Exchange completed':'Only if everyone agrees',complete?'换位已完成':'所有人同意后才一起生效');
  text('next-label','YOUR NEXT STEP','你的下一步');
  let title,copy,label;primaryAction=null;
  if(!hostReady){
    const can=i<2&&!state.hosts[i];title=can?t('Lock your workshop seats','确认你的活动席位'):t('Waiting for the hosts','等待主办方确认');
    copy=t('Dr. Alice and Dr. Bob each approve the fixed pool. Everyone keeps their current place.', 'Dr. Alice 与 Dr. Bob 分别确认固定席位池。所有人的原有席位保持不变。');
    label=can?t(`Approve pool as ${hostNames[role]}`,`以 ${hostNames[role]} 身份确认`):t('Waiting for Dr. Alice / Dr. Bob','等待 Dr. Alice / Dr. Bob');if(can)primaryAction='host';
  }else if(state.phase==='ready'){
    title=role==='alice'?t('Connect all three moves','把三个换位连起来'):t('Alice is preparing the plan','等待 Alice 创建方案');copy=t('Alice moves to afternoon, Bob to Sunday, and Charlie gets morning.','Alice 去下午，Bob 去周日，Charlie 获得上午。');label=role==='alice'?t('Create shared plan','创建共享方案'):t('Waiting for Alice','等待 Alice');if(role==='alice')primaryAction='plan';
  }else if(complete){title=t('One more person gets in.','多一个人参加。');copy=t('Charlie has morning. Alice has afternoon. Bob has Sunday. Same three seats, now three people.','Charlie 上午，Alice 下午，Bob 周日。同样三个席位，现在三人参加。');label=t('Your new place is confirmed','你的新席位已确认');
  }else if(stale){const tested=state.result?.kind==='rejected';title=t('Your original place is safe.','你的原位仍然安全。');copy=tested?t('The old plan was rejected. Alice creates a fresh plan; all three people approve again.','旧方案已被拒绝。Alice 创建新方案，三人重新同意。'):t('An approval was withdrawn. Alice can demonstrate rejection: no seats will move.','有人撤回同意。Alice 可以演示旧方案失败：所有席位不变。');label=role==='alice'?(tested?t('Create fresh plan','创建新方案'):t('Try withdrawn plan','尝试已撤回方案')):t('Waiting for a fresh plan','等待新方案');if(role==='alice')primaryAction=tested?'plan':'execute';
  }else if(!signed){title=t('Review your move. Keep your seat.','先同意换位，原位仍保留。');copy=t('Your approval applies to this complete three-person plan. It does not release your old seat.','你的同意针对完整的三人方案，同意本身不会释放原位。');label=t('Approve my move','同意我的换位');primaryAction='agree';
  }else if(state.consents.length<3){const waiting=roles.filter(r=>!state.consents.includes(r)).map(r=>names[r]).join(' + ');title=t(`Waiting for ${waiting}`,`等待 ${waiting}`);copy=t('Your approval is saved. Watch the other pages approve; your seat stays yours.','已记录你的同意。观察其他页面同意，你的原位仍然保留。');label=t('Approval saved','已记录同意');
  }else{title=role==='alice'?t('Everyone is ready. Move together.','三人已同意，一起换位。'):t('All three people approved.','三个人都已同意。');copy=t('Alice can execute now. For the safety demo, Bob withdraws first and Alice tries the old plan.','Alice 可以执行。演示安全机制时，先由 Bob 撤回，再由 Alice 尝试旧方案。');label=role==='alice'?t('Execute all 3 moves','执行三人换位'):t('Waiting for Alice to execute','等待 Alice 执行');if(role==='alice')primaryAction='execute';}
  $('next-title').textContent=title;$('next-copy').textContent=copy;$('primary').textContent=busy?t('Updating…','更新中…'):label;$('primary').disabled=busy||!ready||!primaryAction;
  $('withdraw').hidden=state.phase!=='consent'||!signed;$('withdraw').disabled=busy||!ready;text('withdraw','Withdraw my approval','撤回我的同意');
  $('feedback').textContent=feedback;$('feedback').className=error?'error':'';
  text('shared-label','EVERYONE SEES THIS','三页共同看到');text('shared-title','Three seats. Shared progress.','三个席位，共同进度。');$('count').innerHTML=`${state.seats.filter(Boolean).length}<span>/3</span>`;
  $('seat-list').innerHTML=state.seats.map((r,n)=>`<div class="seat-row"><div><strong>${slots()[n]}</strong><small>${n===0?t('Host Dr. Alice','主办方 Dr. Alice'):t('Host Dr. Bob','主办方 Dr. Bob')}</small></div><b class="${r?'':'empty'}">${r?names[r]:t('Available','空缺')}</b></div>`).join('');
  $('agreements').className='agreements';$('agreements').innerHTML=(!hostReady?['alice','bob']:roles).map((r,n)=>{const yes=!hostReady?state.hosts[n]:state.consents.includes(r);return `<span class="badge ${stale?'stale':yes?'yes':''}">${!hostReady?hostNames[r]:names[r]} · ${stale?t('renew approval','需重新同意'):yes?t('approved','已同意'):t('waiting','等待')}</span>`;}).join('');
  text('guarantee','No one gives up a seat before the whole exchange succeeds.','整份换位成功前，没有人需要先放弃原位。');
  $('result').hidden=!state.result;
  if(state.result){const kind=state.result.kind;$('result').className=`result ${kind}`;$('result').innerHTML=kind==='success'?`<h2>${t('+1 person. Zero extra seats.','多 1 人参加，不增加席位。')}</h2><p>${t('Simulated exchange completed. Every page shows the same new assignments.','模拟换位完成。三个页面展示相同的新席位结果。')}</p>`:kind==='withdrawn'?`<h2>${t('Approval withdrawn. Seats unchanged.','同意已撤回，席位保持不变。')}</h2><p>${t('The old plan is invalid. Nobody has lost their original place.','旧方案失效，没有人失去原有席位。')}</p>`:`<h2>${t('Plan rejected. Seats unchanged.','方案已拒绝，席位保持不变。')}</h2><p>${t('This is a simulated rejection, not a blockchain receipt.','这是交互模拟的拒绝结果，不是区块链交易回执。')}</p>`;}
  text('plan-summary','Review the complete exchange','查看完整换位方案');$('full-plan').innerHTML=roles.map((r,n)=>`<div class="plan-row"><strong>${names[r]}</strong><span>${n===2?t('Waiting list','候补'):slots()[n]}</span><span>${t('To: ','换到：')}${slots()[[1,2,0][n]]}</span></div>`).join('');
  text('plan-boundary','This predefined scenario demonstrates coordination. It does not discover an optimal match or create real signatures.','这是预设的协调演示，不进行最优匹配计算，也不生成真实签名。');
  $('presenter').hidden=role!=='alice';text('presenter-title','Presenter controls & safety challenges','演示控制与安全挑战');
  text('challenge-copy','Try before all approvals to demonstrate rejection. After success, try the used plan again. Restart resets all three pages in this room.','同意未收齐时可以尝试失败；完成后可以尝试重复执行。重新开始会同时重置本房间的三个页面。');
  text('challenge',complete?'Try used plan':stale?'Try withdrawn plan':'Try incomplete plan',complete?'尝试重放旧方案':stale?'尝试已撤回方案':'尝试缺少同意的方案');$('challenge').disabled=!ready||busy||!state.plan;
  text('reset','Restart this room','重新开始本房间');text('download','Download simulation record','下载模拟记录');$('reset').disabled=busy||!ready;
  text('activity-title','Shared activity','共同操作记录');const verbs={host:t('approved the host pool','确认了主办方席位池'),plan:t('created a fresh plan','创建了换位方案'),agree:t('approved the complete plan','同意了完整方案'),withdraw:t('withdrew approval; seats unchanged','撤回了同意，席位不变'),execute:t('tried execution','尝试执行')};
  $('history').innerHTML=state.history.slice(-8).reverse().map(h=>`<li>${(h.action==='host'?hostNames[h.role]:names[h.role])??'Participant'} · ${verbs[h.action]??'updated'}${h.action==='execute'?' · '+(h.result==='success'?t('completed','已完成'):t('rejected','已拒绝')):''}</li>`).join('')||`<li>${t('Ready for the first host approval.','等待第一位主办方确认。')}</li>`;
}
async function act(action){
  if(!ready||busy||!action)return;busy=true;error=false;feedback='';const seen={round:state.round,plan:state.plan};render();
  try{await navigator.locks.request(key,()=>{const next=changeRoom(read(),role,action,seen);save(next);state=next;});error=action==='execute'&&state.result?.kind==='rejected';feedback=error?t('Plan rejected. Every current seat stays in place.','方案已拒绝，当前所有席位保持不变。'):action==='reset'?t('Room reset. All three pages are ready for a new demo.','房间已重置，三个页面已回到演示初始状态。'):t('Updated. All open pages receive this change.','已更新，所有打开的页面同步接收。');}
  catch(e){feedback=zh?'操作未完成，请查看当前房间状态后重试。':e.message;error=true;}
  finally{busy=false;render();}
}
$('primary').onclick=()=>act(primaryAction);$('withdraw').onclick=()=>act('withdraw');$('challenge').onclick=()=>act('execute');$('reset').onclick=()=>act('reset');
$('reset-room').onclick=()=>act('reset');
$('language').onclick=()=>{zh=!zh;feedback='';const url=new URL(location.href);url.searchParams.set('lang',zh?'zh':'en');history.replaceState({},'',url);render();};
$('new-room').onclick=()=>{location.href=`demo.html?room=${crypto.randomUUID().slice(0,8)}&lang=${zh?'zh':'en'}`;};
$('copy-links').onclick=async()=>{try{await navigator.clipboard.writeText(roles.map(r=>new URL(href(r),location.href).href).join('\n'));$('global-feedback').textContent=t('Three links copied. Open them in the same browser.','已复制三个链接，请在同一浏览器打开。');}catch{$('global-feedback').textContent=t('Use the three role cards above to open the pages.','请使用上面的三张角色卡打开页面。');}};
$('download').onclick=()=>{const blob=new Blob([JSON.stringify({notice:'INTERACTION SIMULATION ONLY. No blockchain transactions or actual signatures.',state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`one-more-person-simulation-${room}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
try{if(!navigator.locks)throw new Error('Use this demo in a current browser with Web Locks support.');await navigator.locks.request(key,()=>{state=read()??initialRoom(room);if(!read())save(state);});ready=true;render();}
catch(e){$('global-feedback').textContent=zh?'浏览器无法共享房间。请使用允许本地存储的 Edge 或 Chrome 普通窗口。':e.message;}
