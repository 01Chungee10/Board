import {cp,copyFile,mkdir} from 'node:fs/promises';
// Stage the Vite build as /Board/preview.html without replacing the existing live site.
await copyFile('dist/index.html','preview.html');
await mkdir('brand',{recursive:true});
await cp('dist/assets','assets',{recursive:true,force:true});
await cp('dist/brand','brand',{recursive:true,force:true});
await copyFile('dist/favicon.svg','favicon.svg');
console.log('Staged: preview.html, brand/, assets/. Existing index.html unchanged.');
