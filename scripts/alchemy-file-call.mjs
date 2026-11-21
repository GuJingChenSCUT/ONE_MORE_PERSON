// Preserve the official CLI/session signer; load long public calldata without Windows' command-line length limit.
// This file does not read, import, or log any wallet credentials.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const file=path.resolve(process.argv[2]??'');
const argv=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(argv)||argv.some(x=>typeof x!=='string')||!argv.includes('monad-testnet')||!argv.includes('session')) throw new Error('Expected explicit testnet/session CLI arguments');
const cli=path.resolve('.local-tools/alchemy-cli/node_modules/@alchemy/cli/dist/index.js');
process.argv=[process.execPath,cli,...argv];
await import(pathToFileURL(cli).href);
