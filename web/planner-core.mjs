const text = (v, limit, label, required = false) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if ((required && !s) || s.length > limit) throw new Error(label + '请填写，且不超过 ' + limit + ' 个字符。');
  return s;
};
export function normalizeItem(input) {
  if (!input || typeof input !== 'object') throw new Error('活动内容无效。');
  const date = text(input.date, 10, '日期', true), start = text(input.start, 5, '开始时间', true), end = text(input.end, 5, '结束时间', true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '2020-01-01' || date > '2100-12-31' || new Date(date + 'T00:00:00Z').toISOString().slice(0,10) !== date) throw new Error('请选择有效日期。');
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(start) || !time.test(end) || end <= start) throw new Error('结束时间需要晚于开始时间，请选择同一天的时间段。');
  const id = text(input.id, 80, '标识', true);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('活动标识无效。');
  const capacity = input.capacity === undefined || input.capacity === '' ? 0 : Number(input.capacity);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 9999) throw new Error('计划人数应为 1–9999。');
  return {v:1,id,title:text(input.title,48,'名称',true),date,start,end,location:text(input.location,64,'地点'),organizer:text(input.organizer,32,'主办方'),description:text(input.description,160,'介绍'),capacity};
}
export function overlaps(a,b) { return a.date === b.date && a.start < b.end && b.start < a.end; }
export function encodeEvent(event) {
  const bytes = new TextEncoder().encode(JSON.stringify(normalizeItem(event)));
  return btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeEvent(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 2400 || !/^[\w-]+$/.test(encoded)) throw new Error('活动链接不完整或格式有误，请向分享者索取新链接。');
  try { const raw = Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)); const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)); if(value.v!==1)throw Error(); return normalizeItem(value); }
  catch { throw new Error('活动链接无法读取，请向分享者索取新链接。'); }
}
const escICS = s => String(s).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const stamp = (date,time) => new Date(date+'T'+time+':00+08:00').toISOString().replace(/[-:]/g,'').replace('.000','');
function fold(line) {
  let out='',part='',bytes=0;
  for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>73){out+=part+'\r\n ';part='';bytes=1;}part+=char;bytes+=size;}
  return out+part;
}
export function calendarFile(items, now = new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//One More Person//Planner//ZH','CALSCALE:GREGORIAN'];
  for(const raw of items){const e=normalizeItem(raw);lines.push('BEGIN:VEVENT','UID:'+e.id+'@one-more-person','DTSTAMP:'+now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART:'+stamp(e.date,e.start),'DTEND:'+stamp(e.date,e.end),'SUMMARY:'+escICS(e.title),'LOCATION:'+escICS(e.location),'DESCRIPTION:'+escICS(e.description),'END:VEVENT');}
  lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
