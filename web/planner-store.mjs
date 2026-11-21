import {normalizeItem} from './planner-core.mjs';
export const storeKey='omp-planner-v1';
export function readPlanner() {
  const raw=localStorage.getItem(storeKey);
  if(!raw)return {v:1,plans:[],events:[]};
  const s=JSON.parse(raw);
  if(s.v!==1||!Array.isArray(s.plans)||!Array.isArray(s.events))throw new Error('本机数据无法读取。请保留浏览器数据并联系项目维护者。');
  return {v:1,plans:s.plans.map(normalizeItem),events:s.events.map(normalizeItem)};
}
export async function updatePlanner(change) {
  const write=()=>{const s=readPlanner();change(s);if(s.plans.length>300||s.events.length>100)throw new Error('本机记录已达上限，请先导出并整理。');localStorage.setItem(storeKey,JSON.stringify(s));return s;};
  return navigator.locks ? navigator.locks.request(storeKey,write) : write();
}
