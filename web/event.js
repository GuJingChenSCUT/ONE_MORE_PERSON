import {decodeEvent,overlaps,calendarFile} from './planner-core.mjs';
import {readPlanner,updatePlanner,storeKey} from './planner-store.mjs';
import {initRoleMenu} from './role-menu.js';
const $=id=>document.getElementById(id);
let event,busy=false;
initRoleMenu();
function renderJoined(){
  if(!event)return;
  try{const s=readPlanner(),joined=s.plans.some(p=>p.id===event.id);$('join-plan').disabled=joined||busy;$('join-plan').textContent=joined?'已加入我的行程':'加入我的行程';}
  catch{$('event-feedback').textContent='当前浏览器无法保存行程，你仍可下载日历文件。';$('join-plan').disabled=true;}
}
function load(){
  try{
    event=decodeEvent(new URLSearchParams(location.hash.slice(1)).get('e'));
    document.title=event.title+' · 多一个人';$('event-title').textContent=event.title;
    $('event-time').textContent=event.date+' · '+event.start+'–'+event.end;$('event-location').textContent=event.location||'待主办方确认';
    $('event-organizer').textContent=event.organizer||'未填写';$('event-capacity').textContent=event.capacity?event.capacity+' 人':'未填写';
    $('event-description').textContent=event.description||'主办方暂未添加活动介绍。';$('event-details').hidden=false;$('event-error').textContent='';$('event-feedback').textContent='';renderJoined();
  }catch(error){event=null;$('event-title').textContent='暂时无法打开这场活动';$('event-error').textContent=error.message;$('event-details').hidden=true;}
}
$('join-plan').onclick=async()=>{
  if(!event||busy)return;busy=true;renderJoined();
  try{const item=event;const state=await updatePlanner(s=>{if(!s.plans.some(p=>p.id===item.id))s.plans.push(item);});const conflicts=state.plans.filter(x=>x.id!==item.id&&overlaps(x,item));$('event-feedback').textContent='已加入当前浏览器的个人行程。'+(conflicts.length?' 与 '+conflicts.map(x=>x.title).join('、')+' 时间重叠，请留意。':'');}
  catch(error){$('event-feedback').textContent=error.message;}
  finally{busy=false;renderJoined();}
};
$('save-calendar').onclick=()=>{if(!event)return;const url=URL.createObjectURL(new Blob([calendarFile([event])],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='one-more-person-event.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('copy-event').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('event-feedback').textContent='邀请链接已复制。';}catch{$('event-feedback').textContent='请复制浏览器地址栏中的完整链接。';}};
window.addEventListener('hashchange',load);window.addEventListener('storage',e=>{if(e.key===storeKey)renderJoined();});load();
