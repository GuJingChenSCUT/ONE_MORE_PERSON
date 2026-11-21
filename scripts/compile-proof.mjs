import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function compileProof() {
  const name = 'contracts/demo/RelayProofFixture.sol';
  const sources = {[name]:{content:fs.readFileSync(path.join(root,name),'utf8')}};
  const input = {language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'cancun',
    outputSelection:{'*':{'*':['abi','metadata','evm.bytecode.object','evm.deployedBytecode.object','evm.deployedBytecode.immutableReferences']}}}};
  const result = JSON.parse(solc.compile(JSON.stringify(input),{import: name => {
    const file = path.resolve(root,name.startsWith('@')?'node_modules':'',name);
    if(!file.startsWith(root+path.sep)) return {error:'Out-of-project import'};
    try {const content=fs.readFileSync(file,'utf8');sources[name]={content};return {contents:content};}
    catch {return {error:`Missing import ${name}`};}
  }}));
  const errors=(result.errors??[]).filter(e=>e.severity==='error');
  if(errors.length)throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
  const artifacts={};
  for(const [file,contracts] of Object.entries(result.contracts))for(const [contractName,c]of Object.entries(contracts)){
    if(!['RelayProofFixture','SafeSeatRelay','ProofActor'].includes(contractName))continue;
    artifacts[contractName]={contractName:`${file}:${contractName}`,abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,
      runtimeBytecode:`0x${c.evm.deployedBytecode.object}`,immutableReferences:c.evm.deployedBytecode.immutableReferences,
      compiler:solc.version(),standardJsonInput:input,metadata:JSON.parse(c.metadata)};
  }
  return artifacts;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const artifacts=compileProof();fs.mkdirSync(path.join(root,'contracts/artifacts'),{recursive:true});
  fs.writeFileSync(path.join(root,'contracts/artifacts/RelayProofFixture.json'),JSON.stringify(artifacts,null,2));
  console.log(JSON.stringify({compiled:Object.keys(artifacts),sourceCount:Object.keys(artifacts.SafeSeatRelay.standardJsonInput.sources).length,deployed:false}));
}
