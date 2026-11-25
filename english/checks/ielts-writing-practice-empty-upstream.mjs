import assert from 'node:assert/strict';
import { callJson } from '../src/lib/lessons/ai.js';

const origFetch = globalThis.fetch;
const origKey = process.env.NINEROUTER_KEY;
const origInfo = console.info;

const logs = [];
console.info = (...args) => logs.push(args.join(' '));
process.env.NINEROUTER_KEY = 'secret-key-12345';

const mockResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  async text() { return body; },
});

try {
  // 1. 500 empty -> reject matching 9router HTTP 500 / Empty upstream response
  globalThis.fetch = async () => mockResponse(500, '');
  await assert.rejects(
    () => callJson('prompt', { requestId: 'req-1', stage: 'ielts-writing-practice-sample', shape: 'object' }),
    err => {
      assert.doesNotMatch(err.message, /SyntaxError/i);
      assert.match(err.message, /9router HTTP 500: Empty upstream response/);
      return true;
    },
  );

  // 2. 500 HTML -> reject HTTP 500 no SyntaxError
  globalThis.fetch = async () => mockResponse(502, '<html><body><h1>502 Bad Gateway</h1></body></html>');
  await assert.rejects(
    () => callJson('prompt', { requestId: 'req-2', stage: 'ielts-writing-practice-sample', shape: 'object' }),
    err => {
      assert.doesNotMatch(err.message, /SyntaxError/i);
      assert.match(err.message, /9router HTTP 502:.*502 Bad Gateway/);
      return true;
    },
  );

  // 3. 500 with bearer/token -> redacted in error & log
  globalThis.fetch = async () => mockResponse(500, 'auth failed Bearer abcdef123456 token=xyz987 secret-key-12345');
  await assert.rejects(
    () => callJson('prompt', { requestId: 'req-3', stage: 'ielts-writing-practice-sample', shape: 'object' }),
    err => {
      assert.match(err.message, /9router HTTP 500:/);
      assert.doesNotMatch(err.message, /abcdef123456|xyz987|secret-key-12345/);
      return true;
    },
  );

  // 4. valid 200 -> expected parsed object
  globalThis.fetch = async () => mockResponse(200, JSON.stringify({
    choices: [{ message: { content: '```json\n{"band": 7.5, "essay": "sample text"}\n```' }, finish_reason: 'stop' }],
  }));
  const parsed = await callJson('prompt', { requestId: 'req-4', stage: 'ielts-writing-practice-sample', shape: 'object' });
  assert.deepEqual(parsed, { band: 7.5, essay: 'sample text' });

  // 5. invalid 200 -> 9router invalid JSON response
  globalThis.fetch = async () => mockResponse(200, '<html>login required</html>');
  await assert.rejects(
    () => callJson('prompt', { requestId: 'req-5', stage: 'ielts-writing-practice-sample', shape: 'object' }),
    err => {
      assert.doesNotMatch(err.message, /SyntaxError/i);
      assert.match(err.message, /9router invalid JSON response:/);
      return true;
    },
  );

  const joinedLogs = logs.join('\n');
  assert.doesNotMatch(joinedLogs, /abcdef123456|xyz987|secret-key-12345/);
} finally {
  globalThis.fetch = origFetch;
  console.info = origInfo;
  if (origKey === undefined) delete process.env.NINEROUTER_KEY;
  else process.env.NINEROUTER_KEY = origKey;
}

console.log('OK: ielts-writing-practice-empty-upstream');
