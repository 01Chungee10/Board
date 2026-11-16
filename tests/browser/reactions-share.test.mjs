import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';

const root=fileURLToPath(new URL('../../',import.meta.url));
const owner=process.env.AGENT_BROWSER_OWNER;
if(!owner)throw new Error('Set AGENT_BROWSER_OWNER to the actual agent/thread identity before launching browser QA.');
const harness=process.env.BROWSER_SESSION_GUARD||path.join(os.homedir(),'AI-Interop/runtime/browser-session-guard/browser_guard.py');
const port=5197;
const url='http://127.0.0.1:'+port+'/Board/';
const evidence=path.join(root,'docs/qa/workshop-20261116');
const dev=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--config','tests/mock-vite.config.mjs','--port',String(port),'--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
let serverOutput='';
let guard;
let guardOutput='';
let guardError='';
for(const stream of [dev.stdout,dev.stderr])stream.on('data',chunk=>{serverOutput=(serverOutput+chunk).slice(-5000);});
async function ready(){
  for(let attempt=0;attempt<70;attempt++){
    if(dev.exitCode!==null)throw new Error('Local-only Vite server exited: '+serverOutput);
    try{if((await fetch(url)).ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('Local-only Vite server did not start: '+serverOutput);
}
async function stopServer(){
  if(dev.exitCode!==null)return;
  dev.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve=>dev.once('exit',resolve)),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Owned Vite process did not confirm shutdown')),5000).unref())
  ]);
}
try{
  await ready();
  await mkdir(evidence,{recursive:true});
  guard=spawn('/usr/bin/python3',['-B',path.join(root,'tests/browser/run_guarded_check.py'),'--harness',harness,'--owner',owner,'--code-file',path.join(root,'tests/browser/reading-features.guard.js')],{cwd:root,stdio:['ignore','pipe','pipe']});
  guard.stdout.on('data',chunk=>{guardOutput+=chunk;process.stdout.write(chunk);});
  guard.stderr.on('data',chunk=>{guardError+=chunk;process.stderr.write(chunk);});
  const code=await new Promise((resolve,reject)=>{guard.once('error',reject);guard.once('exit',resolve);});
  if(code!==0)throw new Error('Guarded browser QA failed with exit '+code);
  if(/^### Error/m.test(guardOutput)||! /"status"\s*:\s*"BOARD_UI_QA_PASSED"/.test(guardOutput))throw new Error('Browser command did not return a successful result');
  const receiptPath=guardError.match(/Browser cleanup verified: ([^\r\n]+)/)?.[1];
  if(!receiptPath)throw new Error('Missing browser cleanup receipt');
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  if(receipt.state!=='clean'||receipt.remaining_pids.length!==0)throw new Error('Browser cleanup not verified');
  await writeFile(path.join(evidence,'qa-result.json'),JSON.stringify({status:'passed',checked_at:new Date().toISOString(),browser_cleanup:{state:receipt.state,remaining_pids:receipt.remaining_pids},widths:[320,390,800,1200,1440,1920],scope:['responsive-columns','newest-and-popular-order','tie-order','native-dialog-full-text','keyboard-focus','reaction-sync','qr-regression']},null,2)+'\n');
  console.log('PASS Board UI QA; owned browser cleanup verified.');
}finally{
  await stopServer();
}
