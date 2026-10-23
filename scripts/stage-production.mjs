import {copyFile,mkdir,access} from 'node:fs/promises';
await mkdir('legacy',{recursive:true});
try {await access('legacy/board-original-20261023.html');}catch {await copyFile('index.html','legacy/board-original-20261023.html');}
await copyFile('dist/index.html','index.html');
console.log('Staged new CEO–CL production index.html; previous landing preserved under legacy/.');
