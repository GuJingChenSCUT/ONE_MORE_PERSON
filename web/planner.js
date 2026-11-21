import {normalizeItem,overlaps,encodeEvent,calendarFile} from './planner-core.mjs';
import {readPlanner,updatePlanner,storeKey} from './planner-store.mjs';
import {initRoleMenu} from './role-menu.js';
import {makeQR} from './qr.bundle.js';
const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let mode='plans',editing=null,lastRemoved=null,busy=false;
initRoleMenu();
const now=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
$('item-date').value=now;
function feedback(id,message,error=false){$(id).textContent=message;$(id).classList.toggle('error',error);}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function eventURL(item){const url=new URL('event.html',location.href);url.hash='e='+encodeEvent(item);return url.href;}
function setMode(next){
  if(mode!==next){editing=null;$('cancel-edit').hidden=true;feedback('form-feedback','');}
  mode=next;const event=mode==='events';
  $('mode-plan').classList.toggle('active',!event);$('mode-event').classList.toggle('active',event);
  $('mode-plan').setAttribute('aria-pressed',String(!event));$('mode-event').setAttribute('aria-pressed',String(event));
  $('event-fields').hidden=!event;$('item-capacity').disabled=!event;
  $('form-heading').textContent=event?'发起一次新的相聚':editing?'编辑这段行程':'添加一段行程';
  $('title-label').textContent=event?'活动名称':'行程名称';
  $('description-label').textContent=event?'活动介绍':'备注';
  $('item-description').placeholder=event?'告诉大家这是一场什么活动':'记下需要准备的东西';
  $('form-note').textContent=event?'北京时间（UTC+8）· 活动内容会写入分享链接，请只填写可公开的信息。':'北京时间（UTC+8）· 仅保存在当前浏览器，可导出到日历。';
  $('save-item').textContent=event?'生成活动分享页':editing?'保存修改':'加入我的行程';
  $('list-heading').firstChild.textContent=event?'我创建的活动 ':'我的行程 ';
  $('list-note').textContent=event?'活动链接展示创建时的信息；不收集报名、不确认席位。':'只展示保存在当前浏览器的行程。';
  $('export-calendar').hidden=event;
  $('empty-title').textContent=event?'让下一次相聚发生':'从一个小计划开始';
  $('empty-copy').textContent=event?'填好活动信息，就能分享专属链接与二维码。':'写下一场想参加的活动，把期待安排进生活。';
  render();
}
function render(){
  try{
    const state=readPlanner(),items=state[mode].slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    $('item-count').textContent=items.length;$('empty-state').hidden=items.length>0;
    $('export-calendar').disabled=state.plans.length===0;
    $('item-list').innerHTML=items.map(item=>{
      const conflicts=mode==='plans'?items.filter(other=>other.id!==item.id&&overlaps(item,other)):[];
      return '<article class="plan-card"><div class="date-chip">'+Number(item.date.slice(5,7))+'月<b>'+item.date.slice(8)+'</b></div><div><h3>'+escape(item.title)+'</h3><p>'+item.date+' · '+item.start+'–'+item.end+' · 北京时间</p><p>'+escape(item.location||'地点待定')+'</p>'+(conflicts.length?'<p class="conflict">时间重叠：'+conflicts.map(x=>escape(x.title)).join('、')+'</p>':'')+'<div class="card-actions">'+(mode==='events'?'<button class="text-button" data-action="share" data-id="'+item.id+'">分享 / 二维码</button>':'<button class="text-button" data-action="edit" data-id="'+item.id+'">编辑</button>')+'<button class="text-button" data-action="calendar" data-id="'+item.id+'">存到日历</button><button class="text-button" data-action="remove" data-id="'+item.id+'">移出本机</button></div></div></article>';
    }).join('');
  }catch(error){feedback('list-feedback',error.message||'无法读取本机数据。',true);$('save-item').disabled=true;}
}
$('mode-plan').onclick=()=>setMode('plans');$('mode-event').onclick=()=>setMode('events');
$('cancel-edit').onclick=()=>{editing=null;$('item-form').reset();$('item-date').value=now;$('cancel-edit').hidden=true;setMode('plans');};
$('item-form').onsubmit=async event=>{
  event.preventDefault();if(busy)return;const form=event.currentTarget;busy=true;$('save-item').disabled=true;feedback('form-feedback','');
  try{
    const data=Object.fromEntries(new FormData(form));
    const item=normalizeItem({...data,id:editing||crypto.randomUUID(),capacity:mode==='events'?data.capacity:0});
    if(mode==='events'&&item.capacity<1)throw new Error('请填写至少 1 人的计划人数。');
    const collection=mode,wasEditing=editing;
    const state=await updatePlanner(s=>{const index=s[collection].findIndex(x=>x.id===item.id);if(index>=0)s[collection][index]=item;else s[collection].push(item);});
    editing=null;$('cancel-edit').hidden=true;render();
    if(collection==='events'){feedback('form-feedback','活动已保存在本机，分享页已生成。');await showShare(item);}
    else{const conflict=state.plans.filter(x=>x.id!==item.id&&overlaps(x,item));feedback('form-feedback',(wasEditing?'修改已保存。':'已加入你的行程。')+(conflict.length?' 注意：与 '+conflict.map(x=>x.title).join('、')+' 时间重叠。':''));}
    $('save-item').textContent=collection==='events'?'生成活动分享页':'加入我的行程';
    form.reset();$('item-date').value=now;
  }catch(error){feedback('form-feedback',error.message||'保存失败，请检查浏览器是否允许本地存储。',true);}
  finally{busy=false;$('save-item').disabled=false;$('item-capacity').disabled=mode!=='events';}
};
$('item-list').onclick=async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  try{
    const state=readPlanner(),collection=mode,item=state[collection].find(x=>x.id===button.dataset.id);if(!item)return;
    switch(button.dataset.action){
      case 'share':await showShare(item);break;
      case 'calendar':download(calendarFile([item]),'one-more-person.ics','text/calendar;charset=utf-8');break;
      case 'edit':editing=item.id;for(const field of ['title','date','start','end','location','description'])$('item-'+field).value=item[field];$('cancel-edit').hidden=false;setMode('plans');$('item-title').focus();break;
      case 'remove':
        await updatePlanner(s=>{s[collection]=s[collection].filter(x=>x.id!==item.id);});lastRemoved={collection,item};render();feedback('list-feedback','已从本机移除「'+item.title+'」。'+(collection==='events'?'已有的活动分享链接仍可打开。':''));$('undo-delete').hidden=false;break;
    }
  }catch(error){feedback('list-feedback',error.message,true);}
};
$('undo-delete').onclick=async()=>{
  if(!lastRemoved)return;
  try{const saved=lastRemoved;await updatePlanner(s=>{if(!s[saved.collection].some(x=>x.id===saved.item.id))s[saved.collection].push(saved.item);});lastRemoved=null;$('undo-delete').hidden=true;feedback('list-feedback','已恢复。');render();}
  catch(error){feedback('list-feedback',error.message,true);}
};
$('export-calendar').onclick=()=>{try{download(calendarFile(readPlanner().plans),'one-more-person-plans.ics','text/calendar;charset=utf-8');}catch(error){feedback('list-feedback',error.message,true);}};
async function showShare(item){
  const url=item?eventURL(item):new URL('index.html',location.href).href;
  $('share-title').textContent=item?'邀请更多人，认识这场活动':'把多一个人分享出去';
  $('share-description').textContent=item?'扫码可查看活动，并加入自己的行程。链接记录本次活动信息，不代表报名或席位确认。':'扫码进入首页，添加个人行程或创建活动。';
  $('share-url').value=url;$('open-share').href=url;feedback('share-feedback','');
  $('download-qr').disabled=true;$('share-qr').hidden=true;
  if(!$('share-dialog').open)$('share-dialog').showModal();
  try{await makeQR($('share-qr'),url);$('share-qr').hidden=false;$('download-qr').disabled=false;}
  catch{feedback('share-feedback','二维码生成失败，请复制分享链接；可缩短活动介绍后重试。',true);}
}
$('share-entry').onclick=()=>showShare(null);$('share-close').onclick=()=>$('share-dialog').close();
$('copy-share').onclick=async()=>{try{await navigator.clipboard.writeText($('share-url').value);feedback('share-feedback','链接已复制。');}catch{$('share-url').select();feedback('share-feedback','请复制已选中的链接。');}};
$('download-qr').onclick=()=>{const a=document.createElement('a');a.href=$('share-qr').toDataURL('image/png');a.download='one-more-person-qr.png';a.click();};
window.addEventListener('storage',event=>{if(event.key===storeKey)render();});
setMode('plans');
