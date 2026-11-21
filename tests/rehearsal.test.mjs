import test from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import { mnemonicToAccount } from 'viem/accounts';
import { createRehearsalRoom, roles } from '../lib/rehearsal-room.mjs';
import { consentTypedData } from '../lib/live-protocol.mjs';
import { compile } from '../scripts/compile.mjs';

test('Shared rehearsal: three independent signatures, realtime state, withdrawal, atomic execution and replay', async () => {
  const connection=await hre.network.connect('local');
  try {
    const room=await createRehearsalRoom(connection.provider,compile());
    const accounts=roles.map((_,addressIndex)=>mnemonicToAccount('test test test test test test test test test test test junk',{addressIndex}));
    const observations=[[],[],[]];
    const stops=observations.map(list=>room.subscribe(s=>list.push(s.version)));
    await assert.rejects(room.act('charlie','approve'),/Only Alice and Bob/);
    await assert.rejects(room.act('bob','reset'),/Alice controls/);
    await Promise.all([room.act('alice','approve'),room.act('bob','approve')]);
    await room.act('alice','plan');
    const initial=room.state().snapshot.seats;
    await room.act('alice','execute');
    assert.equal(room.state().transactions.at(-1).status,'reverted');
    assert.deepEqual(room.state().snapshot.seats,initial);
    async function signature(index) {
      const s=room.state();return {contractAddress:s.pool.contractAddress,planHash:s.plan.planHash,signature:await accounts[index].signTypedData(consentTypedData(s.pool,s.plan,accounts[index].address,31337))};
    }
    const aliceSignature=await signature(0);
    await assert.rejects(room.act('bob','signature',aliceSignature),/does not belong/);
    await Promise.all(roles.map(async(role,i)=>room.act(role,'signature',await signature(i))));
    assert.equal(Object.keys(room.state().signatures).length,3);
    await room.act('bob','cancel');
    assert.deepEqual(room.state().snapshot.seats,initial);
    assert.equal(room.state().readiness.stage,'stale');
    await room.act('alice','execute');
    assert.equal(room.state().transactions.at(-1).status,'reverted');
    assert.deepEqual(room.state().snapshot.seats,initial);
    await room.act('alice','plan');
    assert.equal(Object.keys(room.state().signatures).length,0);
    await assert.rejects(room.act('alice','signature',aliceSignature),/Plan changed/);
    await Promise.all(roles.map(async(role,i)=>room.act(role,'signature',await signature(i))));
    await room.act('alice','execute');
    const completed=room.state();
    assert.equal(completed.readiness.stage,'completed');
    assert.deepEqual(completed.snapshot.seatOf,['2','3','1']);
    assert.equal(completed.transactions.at(-1).events.filter(e=>e.eventName==='SeatMoved').length,3);
    assert.equal(completed.transactions.at(-1).events.find(e=>e.eventName==='PlanExecuted').args.additionalPeople,'1');
    await room.act('charlie','execute');
    assert.equal(room.state().transactions.at(-1).status,'reverted');
    assert.deepEqual(room.state().snapshot.seatOf,['2','3','1']);
    assert.deepEqual(observations[0],observations[1]);assert.deepEqual(observations[1],observations[2]);
    await room.act('alice','reset');
    assert.equal(room.state().round,2);assert.deepEqual(room.state().snapshot.seatOf,['1','2','0']);
    assert.notEqual(room.state().pool.contractAddress,completed.pool.contractAddress);
    stops.forEach(fn=>fn());
  }finally{await connection.close();}
});
