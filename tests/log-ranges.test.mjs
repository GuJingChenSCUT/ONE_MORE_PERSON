import test from 'node:test';
import assert from 'node:assert/strict';
import {getLogsBounded} from '../lib/log-ranges.mjs';
test('provider range splitting preserves every block once and keeps the address filter',async()=>{
  const client={async getLogs({fromBlock,toBlock,address}){
    assert.equal(address,'fixture');
    if(toBlock-fromBlock>2n)throw Object.assign(new Error('range'),{details:'block range too large'});
    return Array.from({length:Number(toBlock-fromBlock+1n)},(_,i)=>fromBlock+BigInt(i));
  }};
  assert.deepEqual(await getLogsBounded(client,{address:'fixture',fromBlock:4n,toBlock:14n}),Array.from({length:11},(_,i)=>BigInt(i+4)));
});
test('authentication, outage and single-block errors are never treated as empty history',async()=>{
  for(const [message,fromBlock,toBlock] of [['HTTP 403',0n,20n],['timeout',0n,20n],['block range too large',1n,1n]]){
    const error=new Error(message);await assert.rejects(getLogsBounded({getLogs:async()=>{throw error;}},{fromBlock,toBlock}),e=>e===error);
  }
});
