import test from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import {createPublicClient,createWalletClient,custom,defineChain,decodeEventLog} from 'viem';
import {mnemonicToAccount} from 'viem/accounts';
import {compileProof} from '../scripts/compile-proof.mjs';
import {replaySeats} from '../lib/replay.mjs';

test('test-only ERC-1271 actors prove inner rollback and an unchanged product contract',async()=>{
  const c=await hre.network.connect('local');
  try{
    const chain=defineChain({id:31337,name:'Local only',nativeCurrency:{name:'Test',symbol:'TEST',decimals:18},rpcUrls:{default:{http:['http://127.0.0.1']}}});
    const account=mnemonicToAccount('test test test test test test test test test test test junk');
    const wallet=createWalletClient({account,chain,transport:custom(c.provider)});
    const client=createPublicClient({chain,transport:custom(c.provider),pollingInterval:10,cacheTime:0});
    const artifacts=compileProof(); const fixture=artifacts.RelayProofFixture;
    const deployment=await client.waitForTransactionReceipt({hash:await wallet.deployContract({abi:fixture.abi,bytecode:fixture.bytecode,args:[account.address],gas:12_000_000n})});
    assert.equal(deployment.status,'success');const address=deployment.contractAddress;
    const relay=await client.readContract({address,abi:fixture.abi,functionName:'relay'});
    const receipt=await client.waitForTransactionReceipt({hash:await wallet.writeContract({address,abi:fixture.abi,functionName:'runProof',gas:3_000_000n})});
    assert.equal(receipt.status,'success');
    const evidence=receipt.logs.filter(l=>l.address.toLowerCase()===address.toLowerCase()).map(l=>decodeEventLog({abi:fixture.abi,data:l.data,topics:l.topics}));
    assert.equal(evidence.filter(e=>e.eventName==='RejectionProved').length,2);
    assert.equal(evidence.find(e=>e.eventName==='ProofCompleted').args.assignedAfter,3n);
    const logs=await client.getLogs({address:relay,fromBlock:deployment.blockNumber,toBlock:receipt.blockNumber});
    const events=logs.map(l=>({...decodeEventLog({abi:artifacts.SafeSeatRelay.abi,data:l.data,topics:l.topics}),transactionHash:l.transactionHash}));
    const result=replaySeats(events);
    const seats=await client.readContract({address:relay,abi:artifacts.SafeSeatRelay.abi,functionName:'getSeats'});
    assert.deepEqual(result.seats,seats.map(a=>a.toLowerCase()));
    assert.equal(result.batches.length,1);assert.equal(result.batches[0].additionalPeople,1);
  }finally{await c.close();}
});
