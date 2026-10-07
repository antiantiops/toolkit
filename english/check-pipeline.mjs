import assert from 'node:assert/strict';
import { runPipeline, progress } from './src/lib/vocabulary/pipeline.js';
const job = { id: 'test', entries: [], words: [], batches: [] };
let extraction = 0, active = 0, peak = 0, fail = true;
const calls = [];
const call = async (input, {stage}) => {
 if (stage === 'extract') { extraction++; return Array.from({length: 7}, (_, i) => ({word: `word${i}`, synonyms: '', antonyms: ''})); }
 calls.push(stage); active++; peak = Math.max(peak, active);
 await new Promise(r => setTimeout(r, 5)); active--;
 if (stage === 'batch-2' && fail) throw new Error('test timeout');
 const entries = JSON.parse(input.split('\nInput: ')[1]);
 return entries.map(e => ({word: e.word, meaning: 'nghĩa', synonyms: 'invented'}));
};
await runPipeline(job, {call, image: 'data:test', persist: () => {}});
assert.equal(job.status, 'partial'); assert.equal(progress(job).completed, 4); assert.equal(peak, 2);
assert.equal(job.words[0].synonyms, '');
fail = false; calls.length = 0;
await runPipeline(job, {call, image: 'data:test', persist: () => {}});
assert.equal(extraction, 1); assert.deepEqual(calls, ['batch-2']); assert.equal(job.status, 'completed'); assert.equal(progress(job).completed, 7);
console.log('PASS: batches, concurrency, partial results, retry only failures, extraction reused');
