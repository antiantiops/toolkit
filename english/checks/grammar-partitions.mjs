import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runLesson } from '../src/lib/lessons/pipeline.js';
import { grammarGroups, partPrompt, setPath } from '../src/lib/lessons/writing-parts.mjs';
import { PROMPT } from '../src/lib/lessons/grammar-prompts.js';
import { SINGLE_PROMPT, DUAL_PROMPT } from '../src/lib/lessons/writing-prompts.js';

const groups = grammarGroups();
assert.equal(groups.length, 4);
const schema = JSON.parse(PROMPT.slice(PROMPT.indexOf('{'), PROMPT.lastIndexOf('}') + 1));
const flatFields = groups.flat();
assert.equal(new Set(flatFields).size, flatFields.length);
assert.deepEqual(new Set(flatFields), new Set(Object.keys(schema)));
assert.equal(flatFields.length, 11);

for (const [idx, fields] of groups.entries()) {
  const prompt = partPrompt(PROMPT, fields);
  assert.ok(prompt.length < PROMPT.length, `Grammar partition ${idx + 1} shorter than PROMPT`);
  assert.ok(prompt.includes('Rules: preserve facts/examples from image'), 'Grammar rules preserved');
  assert.ok(prompt.includes('Generate ONLY this partition'));
  const selected = JSON.parse(prompt.slice(prompt.lastIndexOf('\n') + 1));
  assert.deepEqual(Object.keys(selected), fields);
}
const p1 = partPrompt(PROMPT, groups[0]);
assert.ok(!p1.includes('"commonMistakes"'));
assert.ok(!p1.includes('"checkYourself"'));
assert.ok(partPrompt(SINGLE_PROMPT, ['kind', 'title']).length < SINGLE_PROMPT.length);
assert.ok(partPrompt(DUAL_PROMPT, ['kind', 'title']).length < DUAL_PROMPT.length);

const job = { id: 'g-test', mode: 'grammar', images: ['img1'], result: {} };
let extracts = 0, active = 0, peak = 0, fail = true;
const stages = [];
const call = async (input, { stage, timeoutMs }) => {
  if (stage === 'extract') {
    extracts++;
    return { pages: [{ kind: 'grammar', topic: 'Modals', facts: ['can + V'], requirements: [], wordBank: [] }] };
  }
  assert.equal(typeof input, 'string');
  assert.equal(timeoutMs, 180000);
  assert.ok(input.includes('can + V'));
  stages.push(stage);
  active++;
  peak = Math.max(peak, active);
  await new Promise(r => setTimeout(r, 5));
  active--;
  if (stage === 'part-3' && fail) throw Error('injected timeout');
  const fields = groups[Number(stage.split('-')[1]) - 1];
  const res = { speech: [{ text: `s-${stage}`, segments: [] }] };
  for (const f of fields) setPath(res, f, f === 'rules' ? [] : f);
  return res;
};

await runLesson(job, call);
assert.equal(job.status, 'partial');
assert.equal(peak, 2);
assert.equal(job.parts.length, 4);
assert.equal(job.parts.filter(p => p.status === 'completed').length, 3);
assert.equal(job.source.pages[0].topic, 'Modals');

fail = false;
stages.length = 0;
await runLesson(job, call);
assert.equal(job.status, 'completed');
assert.equal(extracts, 1);
assert.deepEqual(stages, ['part-3']);
assert.equal(job.result.speech.length, 4);

const routesSrc = fs.readFileSync('src/lib/lessons/routes.js', 'utf8');
assert.ok(routesSrc.includes('partialGrammar'));
assert.ok(routesSrc.includes('elapsedMs'));
const progressSrc = fs.readFileSync('src/app/GrammarProgress.js', 'utf8');
assert.ok(progressSrc.includes('data-grammar-progress'));
assert.ok(progressSrc.split('\n').length <= 45);
const pageSrc = fs.readFileSync('src/app/page.js', 'utf8');
assert.ok(pageSrc.includes('gJob.progress?.total || 4'));
assert.ok(pageSrc.includes('<GrammarProgress job={gJob} />'));
assert.ok((pageSrc.match(/setGJob\(null\)/g) || []).length >= 2);

console.log('PASS Grammar four partitions, two workers, source/progress exposure, partial retry');
