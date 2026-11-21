// Observe one approved testnet fixture call. Signing stays inside the official Alchemy CLI.
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createPublicClient,http} from 'viem';
import {monadTestnet} from 'viem/chains';
const startedAt=new Date().toISOString(), start=performance.now();
const result=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/alchemy-file-call.mjs','.local-tools/challenge-run-call.json'],{env:process.env,windowsHide:true});
  let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
  child.on('error',reject);child.on('close',code=>{
    fs.writeFileSync('.local-tools/challenge-run-result.json',code===0?stdout:stderr);
    if(code!==0){reject(Error('Alchemy call failed; inspect the local result without sharing credentials'));return;}
    try{resolve(JSON.parse(stdout));}catch{reject(Error('CLI response was not JSON'));}
  });
});
const cliReturnedMs=Math.round(performance.now()-start),hashReturned=performance.now();
if(!/^0x[0-9a-f]{64}$/i.test(result.txHash??''))throw Error('CLI did not return a transaction hash');
const client=createPublicClient({chain:monadTestnet,transport:http('https://testnet-rpc.monad.xyz',{timeout:15000,retryCount:2}),pollingInterval:500});
if(await client.getChainId()!==10143)throw Error('Wrong chain');
const receipt=await client.waitForTransactionReceipt({hash:result.txHash,timeout:60000});
const hashToReceiptObservedMs=Math.round(performance.now()-hashReturned);
let final;
for(let attempt=0;attempt<60;attempt++){
  final=await client.getBlock({blockTag:'finalized'});
  if(final.number>=receipt.blockNumber)break;
  await new Promise(r=>setTimeout(r,500));
}
if(final.number<receipt.blockNumber)throw Error('Finality not observed');
const canonical=await client.getBlock({blockNumber:receipt.blockNumber});
if(canonical.hash!==receipt.blockHash||receipt.status!=='success')throw Error('Proof did not finalize successfully');
const data={schemaVersion:1,chainId:10143,mode:'observed-cli-testnet-call',startedAt,hash:result.txHash,cliReturnedMs,
  hashToReceiptObservedMs,hashToFinalizedObservedMs:Math.round(performance.now()-hashReturned),receiptBlock:receipt.blockNumber.toString(),receiptBlockHash:receipt.blockHash,finalizedBlock:final.number.toString(),
  note:'One observation from this computer. CLI duration includes startup, authorization, estimation, submission and any internal waiting. Subsequent timings start only when the CLI returned the hash; the transaction may already have finalized. RPC and polling delay are included. These are not signing-to-finality, consensus latency or TPS measurements.'};
fs.writeFileSync('research/validation/challenge-timings.json',JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(data,null,2));
