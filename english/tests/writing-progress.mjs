import assert from 'node:assert/strict';
import {runLesson} from '../src/lib/lessons/pipeline.js';
import {writingGroups,setPath,partPrompt} from '../src/lib/lessons/writing-parts.mjs';
import {SINGLE_PROMPT,DUAL_PROMPT} from '../src/lib/lessons/writing-prompts.js';
for(const dual of [false,true]) {
 const job={id:'test',mode:'writing',images:dual?['image1','image2']:['image1'],result:{}};
 let extractions=0,active=0,peak=0,fail=true;const stages=[];
 const call=async(input,{stage})=>{
  if(stage==='extract'){extractions++;return {pages:[{kind:'sample',sourceText:'Exact source.\nSame order.',unclear:[]}]};}
  assert.equal(typeof input,'string');assert.ok(input.includes('Exact source.\\nSame order.'));assert.ok(!input.includes('image_url'));
  stages.push(stage);active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;
  if(stage==='part-3'&&fail)throw Error('injected failure');
  const fields=writingGroups(dual)[Number(stage.split('-')[1])-1],result={};
  for(const f of fields)setPath(result,f,f==='kind'?(dual?'dual':'sample'):f==='task'?null:f.endsWith('sections')?[]:f);
  return result;
 };
 await runLesson(job,call);assert.equal(job.status,'partial');assert.equal(peak,2);assert.equal(job.parts.length,4);assert.equal(job.parts.filter(p=>p.status==='completed').length,3);assert.equal(job.source.pages[0].sourceText,'Exact source.\nSame order.');
 const saved=JSON.stringify(job.result);assert.ok(saved.includes('title'));fail=false;stages.length=0;await runLesson(job,call);
 assert.equal(job.status,'completed');assert.equal(extractions,1);assert.deepEqual(stages,['part-3']);
 for(const fields of writingGroups(dual))assert.ok(partPrompt(dual?DUAL_PROMPT:SINGLE_PROMPT,fields).length<(dual?DUAL_PROMPT:SINGLE_PROMPT).length);
}
const bad={id:'bad',mode:'writing',images:['image'],result:{}};let calls=0;
await runLesson(bad,async()=>{calls++;return {pages:[{sourceText:'[unreadable]',unclear:['text']}]}});assert.equal(calls,1);assert.equal(bad.status,'failed');
console.log('PASS Writing four partitions, two workers, exact source, partial success, retry only failure, unreadable rejection');
