import test from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import { createPublicClient, createWalletClient, custom, defineChain, zeroAddress, keccak256, toBytes, encodeAbiParameters, concat, decodeEventLog } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { compile } from '../scripts/compile.mjs';
import { matchesRuntime, verifyDeployment } from '../lib/deployment.mjs';

const artifact = compile();
const connection = await hre.network.connect('local');
const provider = connection.provider;
const chain = defineChain({ id: 31337, name: 'Local EVM only', nativeCurrency: { name: 'Test', symbol: 'TEST', decimals: 18 }, rpcUrls: { default: { http: ['http://127.0.0.1'] } } });
// Public Hardhat fixture phrase, exclusively for the in-process test chain.
const accounts = Array.from({length:7},(_,addressIndex)=>mnemonicToAccount('test test test test test test test test test test test junk',{addressIndex}));
const wallets = accounts.map(account => createWalletClient({ account, chain, transport: custom(provider) }));
const publicClient = createPublicClient({ chain, transport: custom(provider), cacheTime: 0, pollingInterval: 10 });
const [hostA, hostB, alice, bob, carol, dave] = accounts;
const types = { Consent: [
  { name: 'planHash', type: 'bytes32' }, { name: 'participant', type: 'address' },
  { name: 'fromSeat', type: 'uint256' }, { name: 'toSeat', type: 'uint256' },
  { name: 'nonce', type: 'uint256' }, { name: 'validUntil', type: 'uint256' },
] };
const read = (address, functionName, args = []) => publicClient.readContract({ address, abi: artifact.abi, functionName, args });
async function write(address, wallet, functionName, args = []) {
  const hash = await wallet.writeContract({ address, abi: artifact.abi, functionName, args, gas: 2_000_000n });
  return publicClient.waitForTransactionReceipt({ hash });
}
async function fixture({ approve = true, masks = [7n,7n,7n,7n] } = {}) {
  const closesAt = (await publicClient.getBlock()).timestamp + 3600n;
  const hash = await wallets[0].deployContract({ abi: artifact.abi, bytecode: artifact.bytecode,
    args: [hostA.address, hostB.address, closesAt, keccak256(toBytes('fixed, fictitious test seats')),
      [alice.address, bob.address, zeroAddress], [alice.address,bob.address,carol.address,dave.address], masks], gas: 6_000_000n });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, 'success');
  const address = receipt.contractAddress;
  if (approve) {
    const digest = await read(address, 'configHash');
    assert.equal((await write(address, wallets[0], 'approvePool', [digest])).status, 'success');
    assert.equal((await write(address, wallets[1], 'approvePool', [digest])).status, 'success');
  }
  const moves = [
    { participant: alice.address, fromSeat: 1n, toSeat: 2n, nonce: 0n },
    { participant: bob.address, fromSeat: 2n, toSeat: 3n, nonce: 0n },
    { participant: carol.address, fromSeat: 0n, toSeat: 1n, nonce: 0n },
  ];
  return { address, moves, validUntil: closesAt - 60n, deploymentBlock: receipt.blockNumber };
}
function offchainPlanHash(moves) {
  const typeHash = keccak256(toBytes('Move(address participant,uint256 fromSeat,uint256 toSeat,uint256 nonce)'));
  return keccak256(concat(moves.map(m => keccak256(encodeAbiParameters(
    [{type:'bytes32'},{type:'address'},{type:'uint256'},{type:'uint256'},{type:'uint256'}],
    [typeHash,m.participant,m.fromSeat,m.toSeat,m.nonce]
  )))));
}
async function signatures(f, overrides = {}) {
  const planHash = offchainPlanHash(f.moves);
  assert.equal(planHash, await read(f.address,'hashPlan',[f.moves]));
  return Promise.all(f.moves.map(m => accounts.find(a => a.address.toLowerCase() === m.participant.toLowerCase()).signTypedData({
    domain: { name:'OneMorePerson', version:'0.2', chainId:31337, verifyingContract:f.address, ...overrides },
    types, primaryType:'Consent', message:{ planHash, ...m, validUntil:f.validUntil }
  })));
}
async function snapshot(address) {
  return { seats: await read(address,'getSeats'), nonces: await Promise.all([alice,bob,carol,dave].map(a=>read(address,'nonces',[a.address]))) };
}
async function rejectedUnchanged(f, sigs) {
  const before = await snapshot(f.address);
  const receipt = await write(f.address, wallets[6], 'execute', [f.moves,f.validUntil,sigs]);
  assert.equal(receipt.status,'reverted');
  assert.equal(receipt.logs.length,0);
  assert.deepEqual(await snapshot(f.address),before);
}

test('Atomic seat relay — deployed bytecode on local EVM (not a Monad benchmark)', async t => {
  try {
    await t.test('runtime attestation matches deployed code and refuses local EVM as Monad', async () => {
      const f = await fixture();
      assert.equal(matchesRuntime(await publicClient.getBytecode({ address: f.address }), artifact), true);
      assert.equal(matchesRuntime('0x00', artifact), false);
      await assert.rejects(verifyDeployment(publicClient, { chainId: 10143, contractAddress: f.address }, artifact), /Expected Monad Testnet/);
    });
    await t.test('both hosts must approve the exact immutable pool', async () => {
      const f=await fixture({approve:false});
      await rejectedUnchanged(f,await signatures(f));
      assert.equal((await write(f.address,wallets[2],'approvePool',[await read(f.address,'configHash')])).status,'reverted');
      assert.equal((await write(f.address,wallets[0],'approvePool',[keccak256(toBytes('wrong'))])).status,'reverted');
    });
    await t.test('three-person vacancy chain adds one attendee and replays independently from events', async () => {
      const f=await fixture();
      const receipt=await write(f.address,wallets[6],'execute',[f.moves,f.validUntil,await signatures(f)]);
      assert.equal(receipt.status,'success');
      assert.deepEqual((await read(f.address,'getSeats')).map(x=>x.toLowerCase()),[carol,alice,bob].map(x=>x.address.toLowerCase()));
      const logs=await publicClient.getLogs({address:f.address,fromBlock:f.deploymentBlock,toBlock:receipt.blockNumber});
      const replay=[];
      const batches=new Map();
      for (const log of logs) {
        const event=decodeEventLog({abi:artifact.abi,data:log.data,topics:log.topics});
        if(event.eventName==='SeatSeeded') replay[Number(event.args.seat)-1]=event.args.holder;
        if(event.eventName==='SeatMoved') {
          if(!batches.has(log.transactionHash)) batches.set(log.transactionHash,[]);
          batches.get(log.transactionHash).push(event.args);
        }
      }
      for(const moves of batches.values()) {
        for(const m of moves) if(m.fromSeat) replay[Number(m.fromSeat)-1]=zeroAddress;
        for(const m of moves) replay[Number(m.toSeat)-1]=m.participant;
      }
      assert.deepEqual(replay,await read(f.address,'getSeats'));
      const executed=receipt.logs.map(log=>decodeEventLog({abi:artifact.abi,data:log.data,topics:log.topics})).find(e=>e.eventName==='PlanExecuted');
      assert.equal(executed.args.additionalPeople,1n);
    });
    await t.test('one missing signature rolls back every seat and every nonce', async () => {
      const f=await fixture();const sigs=await signatures(f);sigs[1]='0x';await rejectedUnchanged(f,sigs);
    });
    await t.test('onchain cancellation invalidates an earlier signed bundle', async () => {
      const f=await fixture();const sigs=await signatures(f);
      assert.equal((await write(f.address,wallets[3],'cancelConsent')).status,'success');
      await rejectedUnchanged(f,sigs);
    });
    await t.test('deadline is strict; a transaction at validUntil is expired', async () => {
      const f=await fixture();f.validUntil=(await publicClient.getBlock()).timestamp;
      await rejectedUnchanged(f,await signatures(f));
    });
    await t.test('target occupancy requires the existing owner to be in the same plan', async () => {
      const f=await fixture();f.moves=[f.moves[2]];await rejectedUnchanged(f,await signatures(f));
    });
    await t.test('a signature cannot cross deployments or chains', async () => {
      const f=await fixture();const other=await fixture();
      await rejectedUnchanged(f,await signatures(f,{verifyingContract:other.address}));
      await rejectedUnchanged(f,await signatures(f,{chainId:10143}));
    });
    await t.test('duplicate targets and participants are rejected', async () => {
      let f=await fixture();f.moves[1].toSeat=2n;await rejectedUnchanged(f,await signatures(f));
      f=await fixture();f.moves=[f.moves[0],{...f.moves[0],toSeat:3n}];await rejectedUnchanged(f,await signatures(f));
    });
    await t.test('eligibility limits still apply to a unanimously signed plan', async () => {
      const f=await fixture({masks:[3n,2n,1n,7n]});await rejectedUnchanged(f,await signatures(f));
    });
    await t.test('changing any move invalidates the bundle signatures', async () => {
      const f=await fixture();const sigs=await signatures(f);f.moves[2].participant=dave.address;await rejectedUnchanged(f,sigs);
    });
    await t.test('a successful plan cannot execute again', async () => {
      const f=await fixture();const sigs=await signatures(f);
      assert.equal((await write(f.address,wallets[6],'execute',[f.moves,f.validUntil,sigs])).status,'success');
      await rejectedUnchanged(f,sigs);
    });
    await t.test('a two-person cycle swaps seats without pretending to add an attendee', async () => {
      const f=await fixture();f.moves=f.moves.slice(0,2);f.moves[1].toSeat=1n;
      const receipt=await write(f.address,wallets[6],'execute',[f.moves,f.validUntil,await signatures(f)]);
      assert.equal(receipt.status,'success');
      assert.deepEqual((await read(f.address,'getSeats')).map(x=>x.toLowerCase()),[bob.address,alice.address,zeroAddress].map(x=>x.toLowerCase()));
      const e=receipt.logs.map(l=>decodeEventLog({abi:artifact.abi,data:l.data,topics:l.topics})).find(e=>e.eventName==='PlanExecuted');
      assert.equal(e.args.additionalPeople,0n);
    });
  } finally { await connection.close(); }
});
