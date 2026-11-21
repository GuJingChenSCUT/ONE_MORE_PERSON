import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const sandbox={};vm.runInNewContext(fs.readFileSync(new URL('../web/relay.js',import.meta.url),'utf8'),sandbox);
const model=sandbox.SeatRelay;
const plain=x=>JSON.parse(JSON.stringify(x));
test('the exact browser model preserves original seats on refusal, cancellation and expiry',()=>{
  const s=model.createState();const original=plain(s);const p=model.planFor(s);
  assert.equal(model.execute(s,p,{}).ok,false);assert.deepEqual(plain(s),original);
  const consent={lin:true,chen:true,yu:true};
  const cancelled=model.cancel(s,'chen');const fail=model.execute(cancelled,p,consent);
  assert.equal(fail.ok,false);assert.deepEqual(plain(fail.state.seats),original.seats);
  const expired=plain(s);expired.now=expired.deadline;assert.equal(model.execute(expired,p,consent).ok,false);
  const success=model.execute(s,p,consent);assert.equal(success.additional,1);assert.deepEqual(plain(success.state.seats),['yu','lin','chen']);
  assert.deepEqual(plain(s),original);
});
test('no-gain cycle and no-solution scenario are represented honestly',()=>{
  const s=model.createState('cycle');const result=model.execute(s,model.planFor(s),{lin:true,chen:true});
  assert.equal(result.ok,true);assert.equal(result.additional,0);
  assert.equal(model.planFor(model.createState('full')),null);
});
