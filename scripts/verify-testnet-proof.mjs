import fs from 'node:fs';
import {createPublicClient,http,encodeDeployData,decodeFunctionData,parseAbi,decodeEventLog,keccak256,getContractAddress,encodeAbiParameters,toHex} from 'viem';
import {monadTestnet} from 'viem/chains';
import {compileProof} from './compile-proof.mjs';
import {matchesRuntime} from '../lib/deployment.mjs';
import {verifyEvidence} from '../lib/replay.mjs';
import {getLogsBounded} from '../lib/log-ranges.mjs';
const demand=(condition,message)=>{if(!condition)throw new Error(message);};
const same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
const stringify=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';
async function main(){
const plan=JSON.parse(fs.readFileSync('research/validation/testnet-proof-plan.json','utf8'));
const deploymentHash=process.argv[2],proofHash=process.argv[3];
demand(/^0x[\da-f]{64}$/i.test(deploymentHash??''),'Pass the deployment transaction hash');
const baseTransport=http(process.env.MONAD_RPC_URL||'https://testnet-rpc.monad.xyz',{timeout:20000,retryCount:2});
// Some public gateways drop concurrent requests; queue reads without changing their block tags.
const transport=options=>{const base=baseTransport(options);let queue=Promise.resolve();return {...base,request:(...args)=>{const next=queue.then(()=>base.request(...args));queue=next.catch(()=>{});return next;}};};
const client=createPublicClient({chain:monadTestnet,transport});
demand(await client.getChainId()===10143 && plan.chainId===10143,'Expected Monad Testnet');
const artifacts=compileProof(),fixtureArtifact=artifacts.RelayProofFixture;
const [receipt,transaction,finalized,factoryCode]=await Promise.all([client.getTransactionReceipt({hash:deploymentHash}),client.getTransaction({hash:deploymentHash}),client.getBlock({blockTag:'finalized'}),client.getBytecode({address:plan.factory})]);
demand(receipt.status==='success' && receipt.blockNumber<=finalized.number,'Deployment is not finalized successfully');
demand(same(transaction.to,plan.factory)&&same(transaction.from,plan.controller),'Unexpected deployment sender or factory');
demand(keccak256(factoryCode??'0x')===plan.factoryCodeHash,'Unexpected factory runtime');
const factoryAbi=parseAbi(['function deployCreate2(bytes32,bytes) payable returns(address)','event ContractCreation(address indexed newContract,bytes32 indexed salt)']);
const call=decodeFunctionData({abi:factoryAbi,data:transaction.input});
const initCode=encodeDeployData({abi:fixtureArtifact.abi,bytecode:fixtureArtifact.bytecode,args:[plan.controller]});
const guardedSalt=keccak256(encodeAbiParameters([{type:'uint256'},{type:'bytes32'}],[10143n,plan.salt]));
demand(call.functionName==='deployCreate2'&&call.args[0]===plan.salt&&call.args[1]===initCode,'Deployment calldata differs from compiled fixture');
demand(guardedSalt===plan.guardedSalt&&keccak256(initCode)===plan.initCodeHash,'Deployment plan hashes disagree');
const fixture=getContractAddress({opcode:'CREATE2',from:plan.factory,salt:guardedSalt,bytecode:initCode});
demand(same(fixture,plan.predicted),'Predicted address mismatch');
const created=receipt.logs.filter(l=>same(l.address,plan.factory)).map(l=>decodeEventLog({abi:factoryAbi,data:l.data,topics:l.topics}));
demand(created.some(e=>same(e.args.newContract,fixture)&&e.args.salt===guardedSalt),'Missing matching CreateX event');
const readFixture=(name,blockNumber=finalized.number)=>client.readContract({address:fixture,abi:fixtureArtifact.abi,functionName:name,blockNumber});
const [fixtureCode,controller,relay,secondHost,lin,chen,yu,deadline]=await Promise.all([client.getBytecode({address:fixture,blockNumber:finalized.number}),...['controller','relay','secondHost','lin','chen','yu','deadline'].map(n=>readFixture(n))]);
demand(matchesRuntime(fixtureCode,fixtureArtifact)&&same(controller,plan.controller),'Fixture bytecode or controller mismatch');
const fixtureEvents=receipt.logs.filter(l=>same(l.address,fixture)).map(l=>decodeEventLog({abi:fixtureArtifact.abi,data:l.data,topics:l.topics}));
demand(fixtureEvents.some(e=>e.eventName==='FictionalFixture'&&same(e.args.relay,relay)&&same(e.args.controller,controller)),'Missing fixture provenance event');
const relayCode=await client.getBytecode({address:relay,blockNumber:finalized.number});
demand(matchesRuntime(relayCode,artifacts.SafeSeatRelay),'Product contract runtime mismatch');
const readRelay=name=>client.readContract({address:relay,abi:artifacts.SafeSeatRelay.abi,functionName:name,blockNumber:finalized.number});
const [hostA,hostB,closesAt,termsHash]=await Promise.all(['hostA','hostB','closesAt','termsHash'].map(readRelay));
demand(same(hostA,fixture)&&same(hostB,secondHost)&&closesAt===deadline&&termsHash===keccak256(toHex('FICTIONAL TEST FIXTURE; ONE CONTROLLER; NO REAL SEATS')),'Fixture configuration mismatch');
for(const actor of [secondHost,lin,chen,yu]){
  const [code,owner]=await Promise.all([client.getBytecode({address:actor,blockNumber:finalized.number}),client.readContract({address:actor,abi:artifacts.ProofActor.abi,functionName:'controller',blockNumber:finalized.number})]);
  demand(matchesRuntime(code,artifacts.ProofActor)&&same(owner,fixture),'Fictional actor configuration mismatch');
}
const deployment={schemaVersion:1,chainId:10143,mode:'fictional-testnet-proof',verifiedAt:new Date().toISOString(),deploymentMethod:'createx-fixture',controller,fixture,relay,secondHost,lin,chen,yu,deadline,
  deploymentHash,deploymentBlock:receipt.blockNumber,deploymentGasLimit:transaction.gas,deploymentGasUsed:receipt.gasUsed,effectiveGasPrice:receipt.effectiveGasPrice,
  finalizedBlock:finalized.number,finalizedBlockHash:finalized.hash,fixtureRuntimeHash:keccak256(fixtureCode),relayRuntimeHash:keccak256(relayCode),
  warning:'Single controller and fictional contract-wallet actors; not independent human signatures, real seats, or a throughput benchmark.'};
fs.writeFileSync('config/testnet-proof.json',stringify(deployment));
fs.writeFileSync('.local-tools/proof-run-call.json',JSON.stringify(['--json','--no-interactive','evm','contract','call',fixture,'runProof()','--signer','session','-n','monad-testnet']));
if(proofHash){
  const [proofReceipt,proofTx]=await Promise.all([client.getTransactionReceipt({hash:proofHash}),client.getTransaction({hash:proofHash})]);
  demand(proofReceipt.status==='success'&&proofReceipt.blockNumber<=finalized.number,'Proof transaction is not finalized successfully');
  demand(same(proofTx.from,controller)&&same(proofTx.to,fixture)&&decodeFunctionData({abi:fixtureArtifact.abi,data:proofTx.input}).functionName==='runProof','Unexpected proof transaction');
  const proofEvents=proofReceipt.logs.filter(l=>same(l.address,fixture)).map(l=>decodeEventLog({abi:fixtureArtifact.abi,data:l.data,topics:l.topics}));
  const rejected=proofEvents.filter(e=>e.eventName==='RejectionProved');
  demand(rejected.length===2&&rejected.some(e=>e.args.reason===keccak256(toHex('missing consent')))&&rejected.some(e=>e.args.reason===keccak256(toHex('replay'))),'Missing inner rejection proof');
  demand(proofEvents.some(e=>e.eventName==='ProofCompleted'&&e.args.assignedBefore===2n&&e.args.assignedAfter===3n),'Missing 2-to-3 completion proof');
  const events=[];
  for(let from=receipt.blockNumber;from<=proofReceipt.blockNumber;from+=500n){const to=from+499n>proofReceipt.blockNumber?proofReceipt.blockNumber:from+499n;
    const logs=await getLogsBounded(client,{address:relay,fromBlock:from,toBlock:to});
    events.push(...logs.map(l=>({...decodeEventLog({abi:artifacts.SafeSeatRelay.abi,data:l.data,topics:l.topics}),transactionHash:l.transactionHash,blockNumber:l.blockNumber,logIndex:l.logIndex})));}
  const finalSeats=await client.readContract({address:relay,abi:artifacts.SafeSeatRelay.abi,functionName:'getSeats',blockNumber:proofReceipt.blockNumber});
  const completed=await readFixture('completed',proofReceipt.blockNumber);demand(completed,'Fixture not completed');
  const evidence=JSON.parse(stringify({schemaVersion:1,mode:'monad-testnet',chainId:10143,fixtureType:'single-controller-fictional-actors',generatedAt:new Date().toISOString(),contractAddress:relay,
    deployment,proofHash,proofBlock:proofReceipt.blockNumber,proofBlockHash:proofReceipt.blockHash,proofGasLimit:proofTx.gas,proofGasUsed:proofReceipt.gasUsed,proofEffectiveGasPrice:proofReceipt.effectiveGasPrice,
    fromBlock:receipt.blockNumber,toBlock:proofReceipt.blockNumber,finalSeats,events,proofEvents,warning:deployment.warning}));
  const replay=verifyEvidence(evidence);demand(replay.assignedPeople===3&&replay.additionalPeople===1&&replay.executedPlans===1,'Unexpected replay result');
  fs.writeFileSync('research/validation/monad-proof-evidence.json',stringify(evidence));
  console.log(stringify({deploymentVerified:true,proofVerified:true,...replay,relay,fixture,deploymentHash,proofHash}));
}else console.log(stringify({deploymentVerified:true,proofVerified:false,relay,fixture,deploymentHash,finalizedBlock:finalized.number}));
}
main().catch(error=>{const reasons=[];for(let e=error;e&&reasons.length<5;e=e.cause)reasons.push({name:e.name,message:(e.shortMessage??e.message??'').split('\n')[0],details:String(e.details??'').replace(/https?:\/\/\S+/g,'[RPC endpoint]'),code:e.code});console.error(JSON.stringify(reasons));process.exitCode=1;});
