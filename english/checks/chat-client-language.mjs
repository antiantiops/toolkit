import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST CHAT CLIENT LANGUAGE WIRING & ISOLATION ===');

// Setup mock sessionStorage before importing chat-request
const storageMap = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

// Setup mock fetch
let mockFetchHandler = null;
globalThis.fetch = async (...args) => {
  if (!mockFetchHandler) throw new Error('fetch called without handler');
  return mockFetchHandler(...args);
};

// 1. Source-bound component wiring verification (LessonChat.js)
console.log('--- 1. Testing LessonChat.js source wiring ---');
const lessonChatPath = path.resolve(process.cwd(), 'src/app/LessonChat.js');
const lessonChatSource = fs.readFileSync(lessonChatPath, 'utf8');

assert.match(
  lessonChatSource,
  /import\s*\{\s*useLanguage\s*\}\s*from\s*["']\.\/LanguageContext["']/,
  'LessonChat.js must import useLanguage from ./LanguageContext'
);
assert.match(
  lessonChatSource,
  /const\s*\{\s*targetLang\s*\}\s*=\s*useLanguage\(\)/,
  'LessonChat.js must destructure targetLang from useLanguage()'
);
assert.match(
  lessonChatSource,
  /pendingChat\(targetLang\)/,
  'LessonChat.js must pass targetLang to pendingChat'
);
assert.match(
  lessonChatSource,
  /targetLang,\s*requestId:/,
  'LessonChat.js requestChat payload must include targetLang'
);
assert.match(
  lessonChatSource,
  /\/api\/chat\?history=1&targetLang=/,
  'LessonChat.js must append targetLang to history query'
);

// 2. Import actual helper from chat-request.js (Never test copies of helper)
console.log('--- 2. Testing actual helper imports from chat-request.js ---');
const { pendingKey, pendingChat, requestChat } = await import('../src/app/chat-request.js');
const { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = await import('../src/lib/lookup/languages.mjs');

assert.equal(typeof pendingChat, 'function', 'pendingChat must be a function');
assert.equal(typeof requestChat, 'function', 'requestChat must be a function');
assert.equal(typeof pendingKey, 'function', 'pendingKey must be a function');

// 3. Test defaultvi & legacy key preservation
console.log('--- 3. Testing defaultvi & legacy key preservation ---');
assert.equal(pendingKey(), 'lesson-chat-pending-v1', 'default pendingKey() must be lesson-chat-pending-v1');
assert.equal(pendingKey('vi'), 'lesson-chat-pending-v1', 'pendingKey("vi") must be lesson-chat-pending-v1');
assert.equal(pendingKey(undefined), 'lesson-chat-pending-v1', 'pendingKey(undefined) must be lesson-chat-pending-v1');
assert.equal(pendingKey('VI'), 'lesson-chat-pending-v1', 'pendingKey("VI") must normalize to lesson-chat-pending-v1');

storageMap.clear();
storageMap.set('lesson-chat-pending-v1', JSON.stringify({ requestId: 'req-vi-legacy', messages: [{ role: 'user', content: 'test vi' }] }));
const viPending = pendingChat();
assert.equal(viPending?.requestId, 'req-vi-legacy', 'pendingChat() must read legacy key');
assert.equal(pendingChat('vi')?.requestId, 'req-vi-legacy', 'pendingChat("vi") must read legacy key');

// 4. Test nonvi suffix -locale
console.log('--- 4. Testing nonvi suffix -locale ---');
assert.equal(pendingKey('en'), 'lesson-chat-pending-v1-en');
assert.equal(pendingKey('ja'), 'lesson-chat-pending-v1-ja');
assert.equal(pendingKey('ko'), 'lesson-chat-pending-v1-ko');
assert.equal(pendingKey('zh-TW'), 'lesson-chat-pending-v1-zh-TW');
assert.equal(pendingKey('EN'), 'lesson-chat-pending-v1-en', 'pendingKey("EN") must normalize to lower-case en');
assert.equal(pendingKey('zh-tw'), 'lesson-chat-pending-v1-zh-TW', 'pendingKey("zh-tw") must normalize to zh-TW');

// 5. Test resume isolation across locales
console.log('--- 5. Testing resume isolation across locales ---');
storageMap.clear();
storageMap.set('lesson-chat-pending-v1', JSON.stringify({ requestId: 'vi-job-id', targetLang: 'vi' }));
storageMap.set('lesson-chat-pending-v1-en', JSON.stringify({ requestId: 'en-job-id', targetLang: 'en' }));
storageMap.set('lesson-chat-pending-v1-ja', JSON.stringify({ requestId: 'ja-job-id', targetLang: 'ja' }));

assert.equal(pendingChat('vi')?.requestId, 'vi-job-id');
assert.equal(pendingChat()?.requestId, 'vi-job-id');
assert.equal(pendingChat('en')?.requestId, 'en-job-id');
assert.equal(pendingChat('ja')?.requestId, 'ja-job-id');
assert.equal(pendingChat('ko'), null, 'ko must be null when not set');

// 6. Test invalid input handling before storage and network
console.log('--- 6. Testing invalid input handling before storage/network ---');
assert.equal(pendingKey('invalid_lang'), null);
assert.equal(pendingKey(12345), null);
assert.equal(pendingChat('invalid_lang'), null);
assert.equal(pendingChat(999), null);

let fetchCalled = false;
mockFetchHandler = async () => {
  fetchCalled = true;
  throw new Error('Network should not be called on invalid input');
};

const preStorageSize = storageMap.size;
await assert.rejects(
  async () => {
    await requestChat({ requestId: 'bad-req', targetLang: 'unsupported-lang', messages: [] });
  },
  { message: 'Ngôn ngữ không hợp lệ' },
  'requestChat must reject invalid targetLang before storage/network'
);
assert.equal(fetchCalled, false, 'Network must not be reached on invalid targetLang');
assert.equal(storageMap.size, preStorageSize, 'Storage must not be touched on invalid targetLang');

// 7. Test requestChat execution: POST normalized locale, reconnect retains same locale/id, correct removal
console.log('--- 7. Testing requestChat POST & completed lifecycle ---');
storageMap.clear();
const postCalls = [];
const getCalls = [];

mockFetchHandler = async (url, opts = {}) => {
  if (url === '/api/chat' && opts.method === 'POST') {
    const body = JSON.parse(opts.body);
    postCalls.push({ url, body });
    return new Response(JSON.stringify({ jobId: body.requestId, status: 'running' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.startsWith('/api/chat?jobId=')) {
    getCalls.push({ url, opts });
    return new Response(JSON.stringify({ status: 'completed', answer: 'Hello in English' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  throw new Error(`Unexpected fetch URL: ${url}`);
};

const resultEn = await requestChat({
  requestId: 'en-req-1234',
  targetLang: 'EN', // uppercase, should normalize to 'en'
  messages: [{ role: 'user', content: 'Explain this word' }],
  context: { mode: 'vocabulary' },
});

assert.equal(resultEn.status, 'completed');
assert.equal(resultEn.answer, 'Hello in English');
assert.equal(postCalls.length, 1);
assert.equal(postCalls[0].body.targetLang, 'en', 'POST must receive normalized targetLang "en"');
assert.equal(postCalls[0].body.requestId, 'en-req-1234');
assert.equal(getCalls.length, 1);
assert.equal(getCalls[0].url, '/api/chat?jobId=en-req-1234', 'Reconnect polling must retain same requestId');
assert.equal(storageMap.has('lesson-chat-pending-v1-en'), false, 'Key must be removed on completed');

// 8. Test requestChat failed status removal
console.log('--- 8. Testing requestChat failed status removal ---');
mockFetchHandler = async (url, opts = {}) => {
  if (url === '/api/chat' && opts.method === 'POST') {
    const body = JSON.parse(opts.body);
    return new Response(JSON.stringify({ jobId: body.requestId, status: 'running' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.startsWith('/api/chat?jobId=')) {
    return new Response(JSON.stringify({ status: 'failed', error: 'AI overloaded' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

await assert.rejects(
  async () => {
    await requestChat({
      requestId: 'fail-req',
      targetLang: 'ja',
      messages: [{ role: 'user', content: 'test' }],
    });
  },
  /AI overloaded/,
  'requestChat must throw on failed status'
);
assert.equal(storageMap.has('lesson-chat-pending-v1-ja'), false, 'Key must be removed on failed status');

// 9. Test HTTP 401/403/404/410 status removal
console.log('--- 9. Testing HTTP error removal (401/403/404/410) ---');
for (const statusCode of [401, 403, 404, 410]) {
  storageMap.clear();
  mockFetchHandler = async () => new Response(JSON.stringify({ error: 'Auth failed' }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await requestChat({
      requestId: `status-${statusCode}`,
      targetLang: 'ko',
      messages: [{ role: 'user', content: 'test' }],
    });
  } catch {
    // Expected to fail
  }
  assert.equal(storageMap.has('lesson-chat-pending-v1-ko'), false, `Key must be removed on HTTP ${statusCode}`);
}

// 10. Test resume isolation removal: completing en leaves vi intact
console.log('--- 10. Testing isolation integrity during completed removal ---');
storageMap.clear();
storageMap.set('lesson-chat-pending-v1', JSON.stringify({ requestId: 'vi-active', targetLang: 'vi' }));
storageMap.set('lesson-chat-pending-v1-en', JSON.stringify({ requestId: 'en-active', targetLang: 'en' }));

mockFetchHandler = async (url, opts = {}) => {
  if (opts.method === 'POST') {
    return new Response(JSON.stringify({ jobId: 'en-active', status: 'running' }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ status: 'completed', answer: 'Done' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

await requestChat({
  requestId: 'en-active',
  targetLang: 'en',
  messages: [{ role: 'user', content: 'resume en' }],
});

assert.equal(storageMap.has('lesson-chat-pending-v1-en'), false, 'Completed en must be removed');
assert.equal(storageMap.has('lesson-chat-pending-v1'), true, 'vi pending chat must remain untouched');
assert.equal(pendingChat('vi')?.requestId, 'vi-active', 'vi pending chat must still be restorable');

console.log('ALL TESTS PASSED: chat-client-language verification successful');
