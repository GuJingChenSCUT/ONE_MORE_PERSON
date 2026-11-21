import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
const port=Number(process.env.PORT||4173);
const allowed=new Set(['index.html','relay.js','app.js','styles.css','evidence.js']);
const evidence=new Set(['network.json','local-demo.json']);
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const file=allowed.has(name)?path.join(root,name):name==='replay.mjs'?path.resolve(root,'../lib/replay.mjs'):name.startsWith('evidence/')&&evidence.has(name.slice(9))?path.resolve(root,'../research/validation',name.slice(9)):null;
  if(!file||!fs.existsSync(file)){res.writeHead(404);res.end('Not found');return;}
  const mime=name.endsWith('.js')||name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.json')?'application/json':'text/html';
  res.writeHead(200,{'content-type':mime+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(fs.readFileSync(file));
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
