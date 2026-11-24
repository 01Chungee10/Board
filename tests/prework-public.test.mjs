import assert from 'node:assert/strict';
import test from 'node:test';
import {PREWORK_DOCUMENT} from '../app/src/prework-data.js';

test('public prework data contains exactly the two approved topics and tags', () => {
  assert.deepEqual(PREWORK_DOCUMENT.sections.map(({id}) => id), ['ai-dx-ax', 'strategy']);
  assert.deepEqual(PREWORK_DOCUMENT.tags, ['AI·DX·AX', '경영방향']);
  assert.equal(PREWORK_DOCUMENT.sections.flatMap(({entries}) => entries).length, 4);
});
