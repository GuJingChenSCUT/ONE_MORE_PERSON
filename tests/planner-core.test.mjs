import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeItem,encodeEvent,decodeEvent,overlaps,calendarFile} from '../web/planner-core.mjs';
const sample={id:'event-1',title:'周末陶艺 🏺',date:'2026-11-22',start:'14:00',end:'16:00',location:'广州创作空间',organizer:'创作社',description:'一次轻松的周末相聚。',capacity:20};
test('Share link round-trips Chinese and emoji without a backend, rejecting malformed or unknown payloads',()=>{
  assert.deepEqual(decodeEvent(encodeEvent(sample)),normalizeItem(sample));
  assert.throws(()=>decodeEvent('%%%'));
  assert.throws(()=>decodeEvent('a'.repeat(2401)));
  assert.throws(()=>decodeEvent(btoa(JSON.stringify({...sample,v:2}))));
  assert.throws(()=>decodeEvent(btoa('{}')));
  const max={...sample,title:'字'.repeat(48),location:'地'.repeat(64),organizer:'人'.repeat(32),description:'文'.repeat(160)};
  assert.ok(encodeEvent(max).length<2200);
});
test('Schedule validation rejects impossible dates and reversed times; adjacent activities do not conflict',()=>{
  for(const changes of [{date:'2026-02-30'},{date:'2026-13-01'},{end:'13:59'},{start:'24:00'},{capacity:1.5},{id:'../evil'},{title:''}])assert.throws(()=>normalizeItem({...sample,...changes}));
  assert.equal(overlaps(sample,{...sample,start:'16:00',end:'17:00'}),false);
  assert.equal(overlaps(sample,{...sample,start:'15:59',end:'17:00'}),true);
  assert.equal(overlaps(sample,{...sample,date:'2026-11-23'}),false);
});
test('Calendar exports Beijing time as UTC and escapes injected lines while preserving UTF-8 folding',()=>{
  const content=calendarFile([{...sample,description:'一'.repeat(100)+'\rATTENDEE:bad\nnotes;comma,slash\\'}],new Date('2026-11-21T00:00:00Z'));
  assert.ok(content.includes('DTSTART:20261122T060000Z\r\n'));
  assert.ok(content.includes('DTEND:20261122T080000Z\r\n'));
  assert.ok(!content.includes('\rATTENDEE:'));
  assert.ok(!content.includes('\nATTENDEE:'));
  assert.ok(content.includes('\\nATTENDEE:'));
  for(const line of content.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
  assert.ok(content.endsWith('END:VCALENDAR\r\n'));
});
