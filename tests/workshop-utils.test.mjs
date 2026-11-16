import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidQuestion,makeQuestionTitle,attachReplies,attachReactions,sortQuestions} from '../app/src/workshop-utils.js';

test('four characters or longer can be posted without identity fields',()=>{
  assert.equal(isValidQuestion('질문이요'),true);
  assert.equal(isValidQuestion('왜 그런가요?'),true);
  assert.equal(isValidQuestion('가?'),false);
});
test('emoji count mirrors PostgreSQL code-point length',()=>{
  assert.equal(isValidQuestion('😀😀'),false);
  assert.equal(isValidQuestion('😀😀😀😀'),true);
  assert.equal(makeQuestionTitle('😀'.repeat(140)).length,240);
});
test('whitespace is not an acceptable question',()=>{
  assert.equal(isValidQuestion(' '.repeat(40)),false);
  assert.equal(isValidQuestion('\n\n  '),false);
  assert.equal(isValidQuestion(null),false);
});
test('question accepts the database upper character limit',()=>{
  assert.equal(isValidQuestion('가'.repeat(3000)),true);
  assert.equal(isValidQuestion('가'.repeat(3001)),false);
});
test('required title comes from the sole question input',()=>{
  assert.equal(makeQuestionTitle(' 질문에\n관한 제안  '),'질문에 관한 제안');
  assert.equal(makeQuestionTitle('가'.repeat(320)).length,120);
});
test('title generation does not add identifying content',()=>{
  assert.equal(makeQuestionTitle('  조직문화 질문   '),'조직문화 질문');
});
test('responses are grouped under exactly their original question',()=>{
  const result=attachReplies([{id:'a',content:'질문A'},{id:'b',content:'질문B'}],[{id:'reply',post_id:'b',author_role:'ceo',content:'CEO 답변'}]);
  assert.equal(result[0].replies.length,0);
  assert.equal(result[1].replies.length,1);
  assert.equal(result[1].replies[0].author_role,'ceo');
});
test('unrelated replies are not attached to questions',()=>{
  const result=attachReplies([{id:'a'}],[{id:'foreign',post_id:'different',content:'unrelated'}]);
  assert.deepEqual(result[0].replies,[]);
});
test('empty timeline is handled without placeholder fake posts',()=>{
  assert.deepEqual(attachReplies([],[]),[]);
});


test('all questions expose their aggregate reaction counts, including zero',()=>{
  const posts=[{id:'a',reaction_count:7},{id:'b',reaction_count:0},{id:'c'}];
  const result=attachReactions(posts,[]);
  assert.deepEqual(result.map(p=>[p.reaction_count,p.reacted]),[[7,false],[0,false],[0,false]]);
});
test('a viewer sees only their own liked status, not the identities of other voters',()=>{
  const posts=[{id:'a',reaction_count:3},{id:'b',reaction_count:9}];
  const result=attachReactions(posts,[{post_id:'b'}]);
  assert.deepEqual(result.map(p=>p.reacted),[false,true]);
  assert.equal(Object.hasOwn(result[0],'user_id'),false);
  assert.equal(result[1].reaction_count,9);
});
test('duplicate reaction records never inflate the server aggregate',()=>{
  const result=attachReactions([{id:'a',reaction_count:2}],[{post_id:'a'},{post_id:'a'}]);
  assert.equal(result[0].reaction_count,2);
  assert.equal(result[0].reacted,true);
});

test('popular order uses aggregate counts and newest timestamp to break ties',()=>{
  const posts=[
    {id:'newest',created_at:'2026-11-16T03:00:00Z',reaction_count:0},
    {id:'popular-old',created_at:'2026-11-15T01:00:00Z',reaction_count:9},
    {id:'popular-new',created_at:'2026-11-16T01:00:00Z',reaction_count:9}
  ];
  assert.deepEqual(sortQuestions(posts,'popular').map(p=>p.id),['popular-new','popular-old','newest']);
  assert.deepEqual(sortQuestions(posts,'newest').map(p=>p.id),['newest','popular-new','popular-old']);
  assert.deepEqual(posts.map(p=>p.id),['newest','popular-old','popular-new']);
});

test('identical count and timestamp have a stable order after realtime snapshots',()=>{
  const posts=[{id:'b',created_at:'2026-11-16T01:00:00Z',reaction_count:2},{id:'a',created_at:'2026-11-16T01:00:00Z',reaction_count:2}];
  assert.deepEqual(sortQuestions(posts,'popular').map(p=>p.id),['a','b']);
  assert.deepEqual(sortQuestions([...posts].reverse(),'popular').map(p=>p.id),['a','b']);
  assert.deepEqual(sortQuestions([]),[]);
});
