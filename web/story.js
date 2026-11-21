import {initialRoom,changeRoom,roles} from './demo-state.mjs';
const $=id=>document.getElementById(id), room='film-'+Math.random().toString(36).slice(2,10), key='omp-interaction-v1:'+room;
const channel=new BroadcastChannel(key);
const steps=[
 ['三个页面，同一个席位池','Alice 已有上午席位，Bob 已有下午席位，Charlie 候补；周日空缺。',[]],
 ['双方主办方确认','Alice 确认后，Bob 和 Charlie 收到进度；Bob 再确认，三页都看到双方同意。',[['alice','host'],['bob','host']]],
 ['创建完整换位方案','Alice 去下午，Bob 去周日，Charlie 去上午。完整方案同步给三个人。',[['alice','plan']]],
 ['三个人分别同意','逐个收集同意；其他页面收到确认。注意：原来的席位还没有改变。',roles.map(r=>[r,'agree'])],
 ['Bob 撤回同意','Bob 改变主意，Alice 和 Charlie 立即收到撤回信息。',[['bob','withdraw']]],
 ['尝试旧方案：整体拒绝','Alice 尝试执行，三页都显示拒绝。没有任何人失去原来的席位。',[['alice','execute']]],
 ['创建一份新方案','Alice 重新创建方案；之前的同意全部清空，必须重新征得同意。',[['alice','plan']]],
 ['三人重新确认','Alice、Bob、Charlie 对新的完整方案分别同意。',roles.map(r=>[r,'agree'])],
 ['一起执行，三个页面同时更新','Charlie 获得上午，Alice 获得下午，Bob 获得周日。同样三个席位，多一个人参加。',[['alice','execute']]],
 ['结果与证据边界','本影片是浏览器交互模拟。真实本地演示为 EVM 31337；独立 Monad Testnet 10143 证据可通过下方链接查看。',[]]
];
let index=0,timer=null,playing=false,generation=0;
function save(s){localStorage.setItem(key,JSON.stringify(s));channel.postMessage(s.revision);}
function rebuild(n){let s=initialRoom(room);for(let i=0;i<=n;i++)for(const [r,a] of steps[i][2])s=changeRoom(s,r,a,{plan:s.plan});s.revision=Date.now();save(s);}
$('screens').innerHTML=roles.map(r=>`<section class="screen" id="screen-${r}"><div class="bar"><span>${r[0].toUpperCase()+r.slice(1)}</span><span class="signal" id="signal-${r}">共享房间已连接</span></div><div class="viewport"><iframe title="${r} 的交互页面" src="${r}.html?room=${room}&lang=zh"></iframe></div></section>`).join('');
// Keep the real role pages interactive; compact only their presentation inside this film.
for(const frame of document.querySelectorAll('iframe'))frame.addEventListener('load',()=>{const d=frame.contentDocument;const style=d.createElement('style');style.textContent='header,.disclosure,.role-nav,#steps,.boundary{display:none!important}main{padding:12px!important}.workspace{display:block!important;gap:8px!important}.identity-row,.room-meta{display:none!important}.personal,.shared{padding:12px!important;margin-bottom:10px!important}.ticket{margin:8px 0!important;padding:8px!important}.next-step{margin-top:8px!important}main{zoom:.8}p{font-size:14px!important}h2{font-size:20px!important}h1{font-size:26px!important}.role-heading{margin-bottom:12px!important}';d.head.append(style);});
function render(){const [title,copy]=steps[index];$('step').textContent=`STEP ${index+1} / 10`;$('title').textContent=title;$('copy').textContent=copy;$('play').textContent=playing?'暂停':'播放演示';$('next').disabled=index===9;$('timeline').innerHTML=steps.map((s,i)=>`<button title="${s[0]}" aria-label="第 ${i+1} 步：${s[0]}" class="${i===index?'current':''}" data-step="${i}" ${i===index?'aria-current="step"':''}>${i+1}</button>`).join('');}
function pause(){playing=false;clearTimeout(timer);generation++;render();}
function signal(actor){for(const r of roles){$('screen-'+r).classList.toggle('active',r===actor);$('signal-'+r).textContent=r===actor?'已发出操作':'已收到 '+actor+' 的更新';}}
async function show(n,animate=true){clearTimeout(timer);const token=++generation;index=n;rebuild(n-1);render();for(const [r,a] of steps[n][2]){if(animate)await new Promise(resolve=>setTimeout(resolve,850));if(token!==generation)return;const s=JSON.parse(localStorage.getItem(key));save(changeRoom(s,r,a,{plan:s.plan}));signal(r);}if(playing){if(index<9)timer=setTimeout(()=>show(index+1),Number($('speed').value));else pause();}}
$('play').onclick=()=>{if(playing)return pause();playing=true;if(index===9)show(0);else{render();timer=setTimeout(()=>show(index+1),Number($('speed').value));}};
$('next').onclick=()=>{pause();show(Math.min(9,index+1));};$('reset').onclick=()=>{pause();show(0);};$('timeline').onclick=e=>{const b=e.target.closest('[data-step]');if(b){pause();show(Number(b.dataset.step),false);}};
$('full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{$('hint').textContent='浏览器未允许全屏，可以继续播放。';});};

show(0,false);

