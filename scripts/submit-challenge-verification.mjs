import fs from 'node:fs';
import {encodeAbiParameters,keccak256,toHex,zeroAddress} from 'viem';
import {compileChallenge} from './compile-challenge.mjs';
const config=JSON.parse(fs.readFileSync('config/challenge-proof.json','utf8'));
if(config.chainId!==10143||config.mode!=='fictional-testnet-proof')throw new Error('Only the verified testnet fixture may be submitted');
const artifacts=compileChallenge();
const targets=[
  ['RelayChallengeFixture',config.fixture,[config.controller]],
  ['SafeSeatRelay',config.relay,[config.fixture,config.secondHost,BigInt(config.deadline),keccak256(toHex('FICTIONAL WITHDRAWAL CHALLENGE; ONE CONTROLLER; NO REAL SEATS')),[config.lin,config.chen,zeroAddress],[config.lin,config.chen,config.yu],[3n,6n,1n]]],
  ['ChallengeActor',config.lin,[]]
];
const results=[];
for(const [name,address,args] of targets){
  const a=artifacts[name];
  const body={chainId:10143,contractAddress:address,contractName:a.contractName,compilerVersion:'v'+a.compiler.split('.Emscripten')[0],standardJsonInput:a.standardJsonInput,foundryMetadata:a.metadata,
    constructorArgs:encodeAbiParameters(a.abi.find(x=>x.type==='constructor')?.inputs??[],args).slice(2)};
  if(process.argv.includes('--prepare-only')){fs.writeFileSync(`.local-tools/verify-${name}.json`,JSON.stringify(body));continue;}
  try{
    const response=await fetch('https://agents.devnads.com/v1/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(50000)});
    const text=await response.text();let result;try{result=JSON.parse(text);}catch{result={message:text.slice(0,1000)};}
    const item={name,address,httpStatus:response.status,result};results.push(item);console.log(JSON.stringify(item));
  }catch(error){const item={name,address,error:error.message};results.push(item);console.log(JSON.stringify(item));}
  fs.writeFileSync('research/validation/challenge-explorer-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),chainId:10143,results},null,2)+'\n');
}
