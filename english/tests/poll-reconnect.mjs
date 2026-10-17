import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/app/fetch-helper.js', import.meta.url), 'utf8');
const { pollLesson } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const originalTimer = global.setTimeout;
const storage = new Map([['writing-pending-job', 'test-job']]);
global.sessionStorage = { getItem: k => storage.get(k), removeItem: k => storage.delete(k) };
global.setTimeout = (fn, ms) => originalTimer(fn, ms >= 15000 ? ms : 0);
let calls = 0;
global.fetch = async () => { if (++calls <= 3) throw new TypeError('Failed to fetch'); return Response.json({ status: 'completed' }); };
const stages = [];
try {
  const result = await pollLesson('writing', {}, data => stages.push(data.stage));
  assert.equal(result.status, 'completed');
  assert.ok(stages.includes('reconnecting'));
  assert.equal(calls, 4);
  assert.equal(storage.size, 0);
  console.log('PASS mobile disconnect recovery retains same job and completes');
} finally { global.setTimeout = originalTimer; }
