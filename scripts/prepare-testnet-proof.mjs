import fs from 'node:fs';
import {createPublicClient,http,encodeDeployData,encodeAbiParameters,keccak256,toHex,getContractAddress,isAddress,parseAbi} from 'viem';
import {monadTestnet} from 'viem/chains';
import {compileProof} from './compile-proof.mjs';

const controller=process.argv[2];
if(!isAddress(controller??'')) throw new Error('Pass the approved session wallet address');
const client=createPublicClient({chain:monadTestnet,transport:http('https://testnet-rpc.monad.xyz',{timeout:20000,retryCount:1})});
if(await client.getChainId()!==10143) throw new Error('Expected Monad Testnet');
const factory='0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed';
const factoryCode=await client.getBytecode({address:factory});
const factoryCodeHash=keccak256(factoryCode??'0x');
if(factoryCodeHash!=='0xbd8a7ea8cfca7b4e5f5041d7d4b17bc317c5ce42cfbc42066a00cf26b43eb53f') throw new Error('Unexpected CreateX runtime');
const artifacts=compileProof();
fs.mkdirSync('contracts/artifacts',{recursive:true});
fs.writeFileSync('contracts/artifacts/RelayProofFixture.json',JSON.stringify(artifacts,null,2));
const initCode=encodeDeployData({abi:artifacts.RelayProofFixture.abi,bytecode:artifacts.RelayProofFixture.bytecode,args:[controller]});
// CreateX _guard: zero address prefix + cross-chain flag 0x01 => keccak256(chainId, salt).
const salt='0x'+'00'.repeat(20)+'01'+keccak256(toHex('OneMorePerson:fictional-proof:v0.2:'+controller.toLowerCase())).slice(2,24);
const guardedSalt=keccak256(encodeAbiParameters([{type:'uint256'},{type:'bytes32'}],[10143n,salt]));
const initCodeHash=keccak256(initCode);
const predicted=getContractAddress({opcode:'CREATE2',from:factory,salt:guardedSalt,bytecode:initCode});
const abi=parseAbi(['function computeCreate2Address(bytes32,bytes32) view returns (address)','function deployCreate2(bytes32,bytes) payable returns (address)']);
const computed=await client.readContract({address:factory,abi,functionName:'computeCreate2Address',args:[guardedSalt,initCodeHash]});
if(predicted.toLowerCase()!==computed.toLowerCase()) throw new Error('CREATE2 prediction mismatch');
const existing=await client.getBytecode({address:predicted});
if(existing && existing!=='0x') throw new Error('Contract already exists; verify existing deployment instead of redeploying');
const simulation=await client.simulateContract({account:controller,address:factory,abi,functionName:'deployCreate2',args:[salt,initCode]});
if(simulation.result.toLowerCase()!==predicted.toLowerCase()) throw new Error('CreateX guard simulation mismatch');
const gas=await client.estimateContractGas({account:controller,address:factory,abi,functionName:'deployCreate2',args:[salt,initCode]});
const [balance,gasPrice]=await Promise.all([client.getBalance({address:controller}),client.getGasPrice()]);
if(gas>15000000n || balance<gas*gasPrice*2n) throw new Error('Deployment exceeds bounded estimate or balance');
const plan={schemaVersion:1,generatedAt:new Date().toISOString(),mode:'fictional-testnet-proof',chainId:10143,controller,factory,factoryCodeHash,
  salt,guardedSalt,predicted,initCodeHash,gasEstimate:gas.toString(),gasPrice:gasPrice.toString(),balance:balance.toString(),deployed:false,
  compiler:artifacts.RelayProofFixture.compiler,warning:'All actors are controlled by one fixture; not independent humans or real institutional seats.'};
fs.writeFileSync('research/validation/testnet-proof-plan.json',JSON.stringify(plan,null,2)+'\n');
fs.mkdirSync('.local-tools',{recursive:true});
fs.writeFileSync('.local-tools/proof-deploy-call.json',JSON.stringify(['--json','--no-interactive','evm','contract','call',factory,'deployCreate2(bytes32,bytes)','--args',JSON.stringify([salt,initCode]),'--signer','session','-n','monad-testnet']));
console.log(JSON.stringify(plan,null,2));
