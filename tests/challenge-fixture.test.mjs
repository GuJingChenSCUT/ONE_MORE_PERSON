import test from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import {createPublicClient,createWalletClient,custom,defineChain,decodeEventLog,keccak256,toHex} from 'viem';
import {mnemonicToAccount} from 'viem/accounts';
import {compileChallenge} from '../scripts/compile-challenge.mjs';
test('withdrawal challenge preserves seats on old-plan rejection and requires fresh consent',async()=>{
  const connection=await hre.network.connect('local');
  try {
    const chain=defineChain({id:31337,name:'isolated local test',nativeCurrency:{name:'Test',symbol:'TEST',decimals:18},rpcUrls:{default:{http:['http://127.0.0.1']}}});
    const account=mnemonicToAccount('test test test test test test test test test test test junk');
    const wallet=createWalletClient({account,chain,transport:custom(connection.provider)});
    const client=createPublicClient({chain,transport:custom(connection.provider)});
    const a=compileChallenge();
    const deployed=await client.waitForTransactionReceipt({hash:await wallet.deployContract({abi:a.RelayChallengeFixture.abi,bytecode:a.RelayChallengeFixture.bytecode,args:[account.address],gas:6500000n})});
    assert.equal(deployed.status,'success');
    const address=deployed.contractAddress;
    const proof=await client.waitForTransactionReceipt({hash:await wallet.writeContract({address,abi:a.RelayChallengeFixture.abi,functionName:'runProof',gas:1500000n})});
    assert.equal(proof.status,'success');
    const events=proof.logs.filter(l=>l.address.toLowerCase()===address.toLowerCase()).map(l=>decodeEventLog({abi:a.RelayChallengeFixture.abi,data:l.data,topics:l.topics}));
    const rejection=events.filter(e=>e.eventName==='RejectionProved');
    assert.equal(rejection.length,3);
    assert.ok(rejection.some(e=>e.args.reason===keccak256(toHex('withdrawn consent'))));
    const withdrawal=events.find(e=>e.eventName==='WithdrawalProved');
    assert.equal(withdrawal.args.oldNonce,0n);assert.equal(withdrawal.args.newNonce,1n);
    assert.equal(withdrawal.args.seatsHash,rejection[0].args.seatsHash);
    const relay=await client.readContract({address,abi:a.RelayChallengeFixture.abi,functionName:'relay'});
    const nonce=await client.readContract({address:relay,abi:a.SafeSeatRelay.abi,functionName:'nonces',args:[withdrawal.args.participant]});
    assert.equal(nonce,2n);
    const replay=await client.waitForTransactionReceipt({hash:await wallet.writeContract({address,abi:a.RelayChallengeFixture.abi,functionName:'runProof',gas:1500000n})});
    assert.equal(replay.status,'reverted');
  }finally{await connection.close();}
});
