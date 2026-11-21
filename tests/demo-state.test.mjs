import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRoom, changeRoom } from '../web/demo-state.mjs';
test('Three-page simulation: withdrawal preserves seats, fresh consent succeeds, replay and wrong roles fail',()=>{
 let s=initialRoom();const act=(r,a,seen={round:s.round,plan:s.plan})=>{s=changeRoom(s,r,a,seen);};
 assert.throws(()=>act('charlie','host'));act('alice','host');act('bob','host');act('alice','plan');act('alice','execute');assert.deepEqual(s.seats,['alice','bob',null]);
 for(const r of ['alice','bob','charlie'])act(r,'agree');act('bob','withdraw');act('alice','execute');assert.equal(s.result.kind,'rejected');assert.deepEqual(s.seats,['alice','bob',null]);
 const old={round:s.round,plan:s.plan};act('alice','plan');assert.throws(()=>act('bob','agree',old));for(const r of ['alice','bob','charlie'])act(r,'agree');assert.throws(()=>act('bob','execute'));act('alice','execute');assert.deepEqual(s.seats,['charlie','alice','bob']);act('alice','execute');assert.equal(s.result.kind,'rejected');assert.deepEqual(s.seats,['charlie','alice','bob']);
 const staleRound={round:s.round,plan:s.plan};act('bob','reset');assert.throws(()=>act('bob','host',staleRound));assert.deepEqual(s.seats,['alice','bob',null]);assert.equal(s.round,2);
 assert.deepEqual(s.hosts,[false,false]);assert.deepEqual(s.consents,[]);assert.deepEqual(s.history,[]);assert.equal(s.plan,0);assert.equal(s.phase,'hosts');assert.equal(s.result,null);
 act('alice','host');act('charlie','reset');assert.deepEqual(s.hosts,[false,false]);assert.equal(s.round,3);
});
