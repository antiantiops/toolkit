import assert from 'node:assert/strict';
import { callJson } from '../src/lib/lessons/ai.js';
const original = globalThis.fetch;
const content = [{ type: 'text', text: 'Read source exactly' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,eA==' } }];
try {
  for (const [finish, fallback, model, expected] of [
    ['recitation', 'cx/gpt-6-luna[1m]', 'ag/gemini-3.8-flash-high', 2],
    ['stop', 'cx/gpt-6-luna[1m]', 'ag/gemini-3.8-flash-high', 1],
    ['recitation', undefined, 'ag/gemini-3.8-flash-high', 1],
    ['recitation', 'cx/gpt-6-luna[1m]', 'cx/gpt-6-luna[1m]', 1],
  ]) {
    const calls = [];
    globalThis.fetch = async (_, options) => {
      calls.push(JSON.parse(options.body));
      return Response.json({ choices: [{ finish_reason: calls.length === 1 ? finish : 'stop', message: { content: calls.length === 1 && finish === 'recitation' ? '' : '{"pages":[{"sourceText":"original"}]}' } }] });
    };
    if (finish === 'recitation' && expected === 1) await assert.rejects(callJson(content, { shape: 'object', model, fallbackModel: fallback }), /recitation/);
    else assert.equal((await callJson(content, { shape: 'object', model, fallbackModel: fallback })).pages[0].sourceText, 'original');
    assert.equal(calls.length, expected);
    if (expected === 2) {
      assert.equal(calls[1].model, fallback);
      assert.deepEqual(calls[1].messages, calls[0].messages);
    }
  }
  console.log('lesson fallback checks passed');
} finally { globalThis.fetch = original; }
