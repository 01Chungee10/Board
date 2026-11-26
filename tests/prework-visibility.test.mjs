import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {PREWORK_DOCUMENT} from '../app/src/prework-data.js';

const appSource=readFileSync(new URL('../app/src/App.jsx',import.meta.url),'utf8');

test('prework section is fully hidden while its source remains restorable',()=>{
  assert.match(appSource,/const SHOW_PREWORK_SECTION = false;/);
  assert.match(appSource,/\{SHOW_PREWORK_SECTION&&<PreworkSection\b/);
  assert.equal(PREWORK_DOCUMENT.title,'CL → CEO 사전질문 및 현업검토의견');
  assert.deepEqual(PREWORK_DOCUMENT.sections.map(topic=>topic.id),['ai-dx-ax','strategy']);
  assert.ok(PREWORK_DOCUMENT.sections.every(topic=>topic.entries.length>0));
});
