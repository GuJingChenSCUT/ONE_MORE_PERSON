import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin='http://127.0.0.1:4180';
async function running() {
  try { const r=await fetch(`${origin}/api/state`,{signal:AbortSignal.timeout(1000)}); const data=await r.json(); if(data.mode!=='local-evm-rehearsal'||data.chainId!==31337) throw new Error('Port 4180 belongs to another application'); return true; }
  catch(error){ if(error.message.includes('another application')) throw error; return false; }
}
if(!await running()) {
  const logDir=path.join(root,'.local-tools/rehearsal');fs.mkdirSync(logDir,{recursive:true});
  const log=fs.openSync(path.join(logDir,'server.log'),'a');
  const child=spawn(process.execPath,['scripts/serve-rehearsal.mjs'],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log,log]});
  child.on('error',error=>{console.error(error.message);process.exitCode=1;});child.unref();fs.closeSync(log);
  let ready=false;
  for(let n=0;n<30;n++){if(await running()){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,500));}
  if(!ready)throw new Error('Room did not start. Check .local-tools/rehearsal/server.log');
}
const urls=['alice','bob','charlie'].map(role=>`${origin}/?role=${role}`);
if(!process.argv.includes('--no-open')) {
  if(process.platform!=='win32')console.log('Open the links below in your browser.');
  else for(const url of urls){const browser=spawn('explorer.exe',[url],{detached:true,windowsHide:true,stdio:'ignore'});browser.unref();}
}
console.log(`Ready. The local room stays running after this window closes.\n${urls.join('\n')}\nRead docs/three-page-demo.md for the exact live rundown.`);
