import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicAssets} from '../lib/web-assets.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const required=['index.html','about.html','event.html','zh.html','live.html','break.html','pitch.html','demo.html','alice.html','bob.html','charlie.html','demo-guide.html','demo.js','demo-state.mjs','demo.css','role-menu.js','role-menu.css','planner.js','planner.css','planner-core.mjs','planner-store.mjs','qr.bundle.js','entry-qr.png','live.bundle.js','break.bundle.js','live-artifact.json'];
for(const name of required)if(!fs.existsSync(path.join(root,name)))throw Error('Missing required web asset: '+name);
let checked=0;
for(const file of publicAssets.filter(x=>x.endsWith('.html'))){
  if(!fs.existsSync(path.join(root,file)))continue;
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"<>]+)"/g)){
    const url=m[1];if(/^(?:https?:|data:|mailto:)/.test(url)||url.startsWith('#'))continue;
    const [target,fragment]=url.split('#');const base=target.split('?')[0];
    if(!publicAssets.includes(base)||!fs.existsSync(path.join(root,base)))throw Error(`${file} links to an unserved asset: ${url}`);
    if(fragment&&base.endsWith('.html')){
      const destination=fs.readFileSync(path.join(root,base),'utf8');
      if(!destination.includes(`id="${fragment}"`))throw Error(`${file} links to a missing section: ${url}`);
    }
    checked++;
  }
}
// These strings would indicate a local-only test harness or a secret accidentally shipped.
for(const name of publicAssets){
  const file=path.join(root,name);if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8');
  for(const prohibited of ['test test test test test test test test test test test junk','127.0.0.1:4178','mojo_claim_','BEGIN PRIVATE KEY','harness-provider.js']){
    if(text.includes(prohibited))throw Error(`Private/local-only material in ${name}`);
  }
}
console.log(JSON.stringify({requiredPages:required.filter(x=>x.endsWith('.html')).length,localLinksChecked:checked,publicAssets:publicAssets.filter(x=>fs.existsSync(path.join(root,x))).length,privateHarnessExcluded:true}));
