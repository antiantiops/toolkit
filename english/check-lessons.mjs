import assert from 'node:assert/strict';
import { runLesson } from './src/lib/lessons/pipeline.js';
for (const mode of ['grammar','writing']) {
 const job = {id:'test', mode, images:['data:test'], result:{}};
 let extracts=0, fail=true; const calls=[];
 const call=async (input,{stage}) => {
  if(stage==='extract'){ extracts++; return {pages:[{kind:mode, facts:['test']}]}; }
  calls.push(stage);
  if(stage==='part-2' && fail) throw new Error('timeout');
  const fields=input.split('top-level fields: ')[1].split('. Do not')[0].split(', ');
  return Object.fromEntries(fields.map(f=>[f, f==='kind'?'sample':f]));
 };
 await runLesson(job,call); assert.equal(job.status,'partial'); assert.equal(job.parts[0].status,'completed');
 fail=false; calls.length=0; await runLesson(job,call);
 assert.equal(job.status,'completed'); assert.equal(extracts,1); assert.deepEqual(calls,['part-2']);
}
console.log('PASS: grammar/writing extraction reuse, split parts, retry failed part only');
