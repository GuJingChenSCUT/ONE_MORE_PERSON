const errorTranslations={"还没有可执行的共同方案。":"There is no jointly approved plan to run.","方案已过期或超出名额池截止时间，原有名额保持不变。":"This plan has expired. Every existing seat stays put.","换位人数不符合范围。":"This plan contains an unsupported number of people.","目标位置无效。":"A destination seat is invalid.","同一人或同一个位置重复出现。":"A person or destination appears twice.","还有人没有同意。大家的原名额都保留。":"Someone has not agreed. Everyone keeps their existing seat.","目标场次不在这位参加者的资格范围内。":"A participant is not eligible for the destination.","有人撤回或名额状态已变化。整个旧方案失效，大家保留原名额。":"An approval was withdrawn or a seat changed. The old plan fails; everyone keeps their existing seat.","目标位置的持有人没有参与本次换位。":"A destination holder has not agreed to move."};
const names={lin:'Alice',chen:'Bob',yu:'Charlie',ning:'Dana'};
const venues=[['Sat · 10:00 AM','Lingnan Makers · workshop'],['Sat · 2:00 PM','Xiguan Youth · workshop'],['Sun · 2:00 PM','Xiguan Youth · workshop']];
let state=SeatRelay.createState(),plan=null,consent={},outcome=null;
const $=id=>document.getElementById(id);
function status(message,kind=''){ $('status').textContent=message;$('status').className='status '+kind; }
const avatar=person=>`<span class="avatar ${person||'empty'}" aria-hidden="true">${person?names[person][0]:'+'}</span>`;
const seatIcon='<svg class="seat-icon" viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M8 7a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v23H8V7Z" fill="currentColor" opacity=".3"/><path d="M8 9a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v20H8V9ZM5 29h30v7H5zM8 36v9m24-9v9" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function paintProgress(){
  $('plan-progress').hidden=!plan;
  if(plan){
    const expired=!outcome?.ok && state.now>=plan.deadline;
    const stale=!outcome?.ok && plan.moves.some(m=>state.nonces[m.person]!==m.nonce);
    const agreed=plan.moves.filter(m=>consent[m.person]).length;
    $('plan-progress').dataset.invalid=String(expired||stale);
    $('consent-count').textContent=expired?'Expired':stale?'Old plan invalid':`${agreed} / ${plan.moves.length}`;
    $('progress-fill').style.width=`${expired||stale?0:agreed/plan.moves.length*100}%`;
  }
}
function paint(){
  document.body.dataset.phase=outcome?.ok?'complete':plan?'plan':'idle';
  $('seats').innerHTML=state.seats.map((p,i)=>`<div class="seat ${p?'':'free'}">${seatIcon}<div class="seat-info"><div class="seat-time">${venues[i][0]}</div><div class="seat-place">${venues[i][1]}</div></div><div class="holder">${avatar(p)}<div>${p?names[p]:'Empty'}<small>${p?'Reserved':'Available'}</small></div></div></div>`).join('');
  $('count').textContent=state.seats.filter(Boolean).length;$('waiting').textContent=state.seats.includes('yu')?'Has a morning seat':'Waiting';
  $('metric-bar').innerHTML=state.seats.map(p=>`<i class="${p?'filled':''}"></i>`).join('');
  $('plan').innerHTML=plan?'<div class="plan-list">'+plan.moves.map(m=>`<div class="move"><div class="move-top"><strong class="move-person">${avatar(m.person)}${names[m.person]}</strong><div class="move-route"><small>${m.from?'Has '+venues[m.from-1][0]:'On the waitlist'}</small>Wants ${venues[m.to-1][0]}</div></div><label><input type="checkbox" data-person="${m.person}" ${consent[m.person]?'checked':''} ${outcome?.ok?'disabled':''}>Simulate agreement to this whole plan</label></div>`).join('')+'</div>':'<div class="empty-plan"><div class="empty-avatars">'+avatar('lin')+avatar('chen')+avatar('yu')+avatar(null)+'</div><h3>A different time. One more person.</h3><p>Find an arrangement everyone accepts.<br>Your current booking stays yours until the relay succeeds.</p></div>';
  $('find').hidden=!!plan;$('execute').hidden=!plan;$('execute').disabled=!!outcome?.ok;
  $('execute').textContent=outcome?.ok?'Relay completed':'Run the simulation';paintProgress();
  document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===state.kind)));
}
function reset(kind=state.kind){state=SeatRelay.createState(kind);plan=null;consent={};outcome=null;paint();status('Everyone keeps their current seat until all conditions pass.');}
function find(){plan=SeatRelay.planFor(state);consent={};outcome=null;paint();status(plan?'Plan found. Simulate each person agreeing. No seats have moved yet.':'No relay fits these choices. Keeping every current booking is the correct outcome.');}
$('find').onclick=find;
$('plan').addEventListener('change',e=>{if(e.target.dataset.person){consent[e.target.dataset.person]=e.target.checked;paintProgress();}});
$('execute').onclick=()=>{const before=JSON.parse(JSON.stringify(state));outcome=SeatRelay.execute(state,plan,consent);outcome.before=before;state=outcome.state;paint();status(outcome.ok?(outcome.additional?'All moves completed. Charlie gets the morning seat. The same 3 seats now welcome 1 more person.':'Both people get their agreed time. Attendance stays the same.'):(errorTranslations[outcome.message]||outcome.message),outcome.ok?'success':'failure');};
$('agree-all').onclick=()=>{if(!plan)find();if(plan&&!outcome?.ok){plan.moves.forEach(m=>consent[m.person]=true);paint();status('All approvals simulated. Everyone still holds their original seat until execution.');}};
$('cancel').onclick=()=>{if(outcome?.ok){status('This relay already completed. Reset to try withdrawing an approval.');return;}state=SeatRelay.cancel(state,'chen');paint();status('Bob withdrew in this simulation. His afternoon seat stays his. The old plan can no longer execute.');};
$('expire').onclick=()=>{if(outcome?.ok)return;state.now=state.deadline;paintProgress();status('The simulated deadline has passed. Running this plan will fail without moving seats.');};
$('reset').onclick=()=>reset();document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>reset(b.dataset.scenario));
$('download').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({mode:'local-mechanism-simulation',state,plan,consent,outcome},null,2)],{type:'application/json'}));a.download='one-more-person-simulation.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
paint();
