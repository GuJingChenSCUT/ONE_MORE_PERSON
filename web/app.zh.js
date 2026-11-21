const names={lin:'小林',chen:'小陈',yu:'小雨',ning:'小宁'};
const venues=[['周六上午 10:00','岭南手作社 · 广彩体验'],['周六下午 14:00','西关青年社 · 广彩体验'],['周日下午 14:00','西关青年社 · 广彩体验']];
let state=SeatRelay.createState(),plan=null,consent={},outcome=null;
const $=id=>document.getElementById(id);
function status(message,kind=''){ $('status').textContent=message;$('status').className='status '+kind; }
const avatar=person=>`<span class="avatar ${person||'empty'}" aria-hidden="true">${person?names[person].slice(1):'+'}</span>`;
const seatIcon='<svg class="seat-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M8 7a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v23H8V7Z" fill="currentColor" opacity=".3"/><path d="M8 9a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v20H8V9ZM5 29h30v7H5zM8 36v9m24-9v9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function paintProgress(){
  $('plan-progress').hidden=!plan;
  if(plan){
    const expired=!outcome?.ok && state.now>=plan.deadline;
    const stale=!outcome?.ok && plan.moves.some(m=>state.nonces[m.person]!==m.nonce);
    const agreed=plan.moves.filter(m=>consent[m.person]).length;
    $('plan-progress').dataset.invalid=String(expired||stale);
    $('consent-count').textContent=expired?'方案已过期':stale?'旧方案已失效':`${agreed} / ${plan.moves.length}`;
    $('progress-fill').style.width=`${expired||stale?0:agreed/plan.moves.length*100}%`;
  }
}
function paint(){
  document.body.dataset.phase=outcome?.ok?'complete':plan?'plan':'idle';
  $('seats').innerHTML=state.seats.map((p,i)=>`<div class="seat ${p?'':'free'}">${seatIcon}<div class="seat-info"><div class="seat-time">${venues[i][0]}</div><div class="seat-place">${venues[i][1]}</div></div><div class="holder">${avatar(p)}<div>${p?names[p]:'空位'}<small>${p?'已持有':'可接力'}</small></div></div></div>`).join('');
  $('count').textContent=state.seats.filter(Boolean).length;$('waiting').textContent=state.seats.includes('yu')?'已获得上午名额':'正在候补';
  $('metric-bar').innerHTML=state.seats.map(p=>`<i class="${p?'filled':''}"></i>`).join('');
  $('plan').innerHTML=plan?'<div class="plan-list">'+plan.moves.map(m=>`<div class="move"><div class="move-top"><strong class="move-person">${avatar(m.person)}${names[m.person]}</strong><div class="move-route"><small>${m.from?'原位 · '+venues[m.from-1][0]:'原来正在候补'}</small>换到 ${venues[m.to-1][0]}</div></div><label><input type="checkbox" data-person="${m.person}" ${consent[m.person]?'checked':''} ${outcome?.ok?'disabled':''}>模拟同意此整份方案</label></div>`).join('')+'</div>':'<div class="empty-plan"><div class="empty-avatars">'+avatar('lin')+avatar('chen')+avatar('yu')+avatar(null)+'</div><h3>换个时间，多一个人。</h3><p>查看有没有大家都接受的安排。<br>在方案完成前，原来的位置仍属于你。</p></div>';
  $('find').hidden=!!plan;$('execute').hidden=!plan;$('execute').disabled=!!outcome?.ok;
  $('execute').textContent=outcome?.ok?'换位已完成':'模拟整份执行';paintProgress();
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===state.kind)));
}
function reset(kind=state.kind){state=SeatRelay.createState(kind);plan=null;consent={};outcome=null;paint();status('先看看：所有条件成立前，大家保留原位。');}
function find(){plan=SeatRelay.planFor(state);consent={};outcome=null;paint();status(plan?'方案已找到。请模拟每位参加者同意；此时名额没有变化。':'这组已表达的选择没有可用接力方案。保持现状，也是一种正确结果。');}
$('find').onclick=find;
$('plan').addEventListener('change',e=>{if(e.target.dataset.person){consent[e.target.dataset.person]=e.target.checked;paintProgress();}});
$('execute').onclick=()=>{const before=JSON.parse(JSON.stringify(state));outcome=SeatRelay.execute(state,plan,consent);outcome.before=before;state=outcome.state;paint();status(outcome.ok?(outcome.additional?'换位全部完成，小雨接上了上午场。同样的 3 个位置，多安排 1 人。':'两人都换到同意的时间，获配人数不变。'):outcome.message,outcome.ok?'success':'failure');};
$('agree-all').onclick=()=>{if(!plan)find();if(plan&&!outcome?.ok){plan.moves.forEach(m=>consent[m.person]=true);paint();status('已模拟所有人同意。执行前，每个人仍保留原来的名额。');}};
$('cancel').onclick=()=>{if(outcome?.ok){status('当前方案已经完成。重置场景后可体验撤回。');return;}state=SeatRelay.cancel(state,'chen');paint();status('小陈已模拟撤回。仍持有下午场；旧方案即使收齐同意也无法执行。');};
$('expire').onclick=()=>{if(outcome?.ok)return;state.now=state.deadline;paintProgress();status('模拟时钟已到截止。再次执行将失败，原位不变。');};
$('reset').onclick=()=>reset();document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>reset(b.dataset.scenario));
$('download').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({mode:'local-mechanism-simulation',state,plan,consent,outcome},null,2)],{type:'application/json'}));a.download='one-more-person-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
paint();
