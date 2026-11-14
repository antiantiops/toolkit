import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';
import { writingPreferences } from '../src/lib/writing-prompt.mjs';
import { languageInstruction } from '../src/lib/lessons/language.mjs';

console.log('=== TEST WRITING MULTILINGUAL TARGETLANG SUPPORT ===');

const allLangs = ['vi', 'en', 'ja', 'ko', 'zh-TW'];

function extractCodeWithoutImports(sourcePath) {
  const fullCode = fs.readFileSync(sourcePath, 'utf8');
  return fullCode
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+(async\s+function|function|const|let|var)\s+/gm, '$1 ');
}

// ---------------------------------------------------------------------------
// 1. writing-model/route.js
// ---------------------------------------------------------------------------
console.log('\n--- 1. Testing writing-model route ---');

const modelRouteSource = extractCodeWithoutImports(
  path.resolve(process.cwd(), 'src/app/api/writing-model/route.js')
);

function createMockModelContext({ fetchImpl, saveSessionImpl, owner = 'test-owner-model' } = {}) {
  const fakeNextResponse = {
    json(data, init = {}) {
      return {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        async json() {
          return data;
        },
      };
    },
  };

  const context = {
    NextResponse: fakeNextResponse,
    cacheOwner: () => owner,
    saveSession: saveSessionImpl || (() => {}),
    writingPreferences,
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    languageInstruction,
    fetch: fetchImpl,
    AbortSignal,
    URL,
    JSON,
    Array,
    String,
    Error,
    console,
    process: {
      env: {
        NINEROUTER_URL: 'http://test-ai:20128',
        NINEROUTER_KEY: 'test-key',
        NINEROUTER_MODEL: 'test-model',
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(`${modelRouteSource}\n; globalThis.POST = POST;`, context);
  return { POST: context.POST };
}

// 1.1 Invalid targetLang -> 400 before AI
{
  let calledAi = false;
  const { POST } = createMockModelContext({
    fetchImpl: async () => {
      calledAi = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  const res = await POST({
    headers: new Map(),
    async json() {
      return {
        task: { scenario: 'test scenario' },
        targetLang: 'invalid_locale',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(calledAi, false, 'AI must not be called on invalid targetLang');
}

// 1.2 Invalid CEFR level -> 400 before AI
{
  let calledAi = false;
  const { POST } = createMockModelContext({
    fetchImpl: async () => {
      calledAi = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  const res = await POST({
    headers: new Map(),
    async json() {
      return {
        task: { scenario: 'test scenario' },
        level: 'INVALID_LEVEL',
        targetLang: 'en',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Trình độ CEFR không hợp lệ');
  assert.equal(calledAi, false, 'AI must not be called on invalid CEFR');
}

// 1.3 Valid requests: vi (default/omitted) and all 5 locales
for (const testCase of ['omitted', ...allLangs]) {
  const lang = testCase === 'omitted' ? undefined : testCase;
  const effectiveLang = testCase === 'omitted' ? 'vi' : testCase;
  const capturedFetches = [];
  const savedSessions = [];

  const mockResponseDraft = {
    title: 'Simple Model Email',
    totalWords: 100,
    paragraphs: [
      {
        part: '1. Subject & Greeting',
        sentences: [
          {
            id: 's1',
            en: 'Subject: Sick Leave Request',
            vi: effectiveLang === 'vi' ? 'Tiêu đề: Đơn xin nghỉ ốm' : 'Subject in target lang',
            phrases: [
              {
                en: 'Sick Leave Request',
                vi: effectiveLang === 'vi' ? 'Đơn xin nghỉ ốm' : 'Request in target lang',
                note: 'Note',
              },
            ],
          },
        ],
      },
    ],
  };

  const { POST } = createMockModelContext({
    fetchImpl: async (url, opts) => {
      capturedFetches.push({ url, opts, body: JSON.parse(opts.body) });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockResponseDraft),
              },
            },
          ],
        }),
      };
    },
    saveSessionImpl: (owner, session) => {
      savedSessions.push({ owner, session });
    },
  });

  const res = await POST({
    headers: new Map(),
    async json() {
      return {
        task: {
          title: 'Leave email',
          scenario: 'Need leave',
          requirements: ['state reason'],
          wordBank: ['fever'],
        },
        ...(lang !== undefined ? { targetLang: lang } : {}),
      };
    },
  });

  assert.equal(res.status, 200, `Status 200 for ${testCase}`);
  assert.deepEqual(res.data.modelDraft, mockResponseDraft);

  // Check fetch call and prompt languageInstruction
  assert.equal(capturedFetches.length, 1);
  const promptSent = capturedFetches[0].body.messages[0].content;
  assert.ok(promptSent.includes('You are an English writing teacher helping Vietnamese adult beginners'));
  assert.ok(promptSent.includes('Break the email down sentence-by-sentence.'));

  if (effectiveLang === 'vi') {
    assert.ok(!promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
  } else {
    const promptName = SUPPORTED_LANGUAGES[effectiveLang].promptName;
    assert.ok(promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
    assert.ok(promptSent.includes(`must be ${promptName}`));
    assert.ok(promptSent.includes('*Vietnamese'));
  }

  // Check saveSession ALWAYS tags modelDraftTargetLang
  assert.equal(savedSessions.length, 1);
  assert.equal(savedSessions[0].session.modelDraftTargetLang, effectiveLang);
  assert.deepEqual(savedSessions[0].session.modelDraft, mockResponseDraft);
}

// ---------------------------------------------------------------------------
// 2. writing-review/route.js
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing writing-review route ---');

const reviewRouteSource = extractCodeWithoutImports(
  path.resolve(process.cwd(), 'src/app/api/writing-review/route.js')
);

function createMockReviewContext({ fetchImpl } = {}) {
  const fakeNextResponse = {
    json(data, init = {}) {
      return {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        async json() {
          return data;
        },
      };
    },
  };

  const context = {
    NextResponse: fakeNextResponse,
    writingPreferences,
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    languageInstruction,
    fetch: fetchImpl,
    URL,
    JSON,
    Array,
    String,
    Error,
    console,
    process: {
      env: {
        NINEROUTER_URL: 'http://test-ai:20128',
        NINEROUTER_KEY: 'test-key',
        NINEROUTER_MODEL: 'test-model',
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(`${reviewRouteSource}\n; globalThis.POST = POST;`, context);
  return { POST: context.POST };
}

// 2.1 Invalid targetLang -> 400 before AI
{
  let calledAi = false;
  const { POST } = createMockReviewContext({
    fetchImpl: async () => {
      calledAi = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  const res = await POST({
    async json() {
      return {
        task: {},
        draft: 'This is a long enough draft to pass validation criteria easily.',
        targetLang: 'invalid_locale',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(calledAi, false, 'AI must not be called on invalid targetLang');
}

// 2.2 Invalid CEFR level -> 400 before AI
{
  let calledAi = false;
  const { POST } = createMockReviewContext({
    fetchImpl: async () => {
      calledAi = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  const res = await POST({
    async json() {
      return {
        task: {},
        draft: 'This is a long enough draft to pass validation criteria easily.',
        level: 'B3',
        targetLang: 'en',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Trình độ CEFR không hợp lệ');
  assert.equal(calledAi, false);
}

// 2.3 Valid requests: vi (default/omitted) and all 5 locales
for (const testCase of ['omitted', ...allLangs]) {
  const lang = testCase === 'omitted' ? undefined : testCase;
  const effectiveLang = testCase === 'omitted' ? 'vi' : testCase;
  const capturedFetches = [];

  const mockReview = {
    score: 8.0,
    summary: 'Summary text',
    checks: [{ requirement: 'req 1', met: true, note: 'ok' }],
    strengths: ['good grammar'],
    issues: [{ original: 'I has fever', problem: 'subject-verb agreement', fix: 'I have a fever' }],
    wordBankUsed: ['fever'],
    improved: 'Dear manager, I am writing to ask for leave...',
  };

  const { POST } = createMockReviewContext({
    fetchImpl: async (url, opts) => {
      capturedFetches.push({ url, opts, body: JSON.parse(opts.body) });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockReview),
              },
            },
          ],
        }),
      };
    },
  });

  const res = await POST({
    async json() {
      return {
        task: { requirements: ['be polite'] },
        draft: 'This is a long enough draft to pass validation criteria easily.',
        ...(lang !== undefined ? { targetLang: lang } : {}),
      };
    },
  });

  assert.equal(res.status, 200, `Review status 200 for ${testCase}`);
  assert.deepEqual(res.data.review, mockReview);

  // Check prompt
  assert.equal(capturedFetches.length, 1);
  const promptSent = capturedFetches[0].body.messages[0].content;
  assert.ok(promptSent.includes("Grade the student's writing against the task"));

  if (effectiveLang === 'vi') {
    assert.ok(!promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
  } else {
    const promptName = SUPPORTED_LANGUAGES[effectiveLang].promptName;
    assert.ok(promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
    assert.ok(promptSent.includes(`must be ${promptName}`));
  }
}

// ---------------------------------------------------------------------------
// 3. writing-lookup/route.js
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing writing-lookup route ---');

const lookupRouteSource = extractCodeWithoutImports(
  path.resolve(process.cwd(), 'src/app/api/writing-lookup/route.js')
);

function createMockLookupContext({ fetchImpl } = {}) {
  const fakeNextResponse = {
    json(data, init = {}) {
      return {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        async json() {
          return data;
        },
      };
    },
  };

  const context = {
    NextResponse: fakeNextResponse,
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    languageInstruction,
    fetch: fetchImpl,
    URL,
    JSON,
    Array,
    String,
    Error,
    console,
    process: {
      env: {
        NINEROUTER_URL: 'http://test-ai:20128',
        NINEROUTER_KEY: 'test-key',
        NINEROUTER_MODEL: 'test-model',
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(`${lookupRouteSource}\n; globalThis.POST = POST;`, context);
  return { POST: context.POST };
}

// 3.1 Invalid targetLang -> 400 before AI
{
  let calledAi = false;
  const { POST } = createMockLookupContext({
    fetchImpl: async () => {
      calledAi = true;
      return { ok: true, json: async () => ({}) };
    },
  });

  const res = await POST({
    async json() {
      return {
        word: 'lương',
        sentence: 'điều chỉnh mức lương',
        targetLang: 'invalid_locale',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(calledAi, false, 'AI must not be called on invalid targetLang');
}

// 3.2 Missing word -> 400
{
  const { POST } = createMockLookupContext({
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  });

  const res = await POST({
    async json() {
      return {
        targetLang: 'ja',
      };
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Thiếu từ cần tra');
}

// 3.3 Valid requests: vi (default/omitted) and all 5 locales
for (const testCase of ['omitted', ...allLangs]) {
  const lang = testCase === 'omitted' ? undefined : testCase;
  const effectiveLang = testCase === 'omitted' ? 'vi' : testCase;
  const capturedFetches = [];

  const mockLookupResult = {
    vi: effectiveLang === 'vi' ? 'mức lương' : 'salary level in target lang',
    en: 'salary level',
    ipa: '/ˈsæl.ər.i ˈlev.əl/',
    easyReading: effectiveLang === 'vi' ? '🇬🇧 UK: “xá-lơ-ri lé-vồl”' : 'UK: /ˈsæl.ər.i/ US: /ˈsæl.ɚ.i/',
    partOfSpeech: 'noun phrase',
    contextUsage: 'Used when negotiating pay adjustments',
    sentenceEn: 'I would like to discuss adjusting my salary level.',
  };

  const { POST } = createMockLookupContext({
    fetchImpl: async (url, opts) => {
      capturedFetches.push({ url, opts, body: JSON.parse(opts.body) });
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify(mockLookupResult),
              },
            },
          ],
        }),
      };
    },
  });

  const res = await POST({
    async json() {
      return {
        word: 'lương',
        sentence: 'điều chỉnh mức lương',
        context: 'Đoạn văn đàm phán hợp đồng',
        ...(lang !== undefined ? { targetLang: lang } : {}),
      };
    },
  });

  assert.equal(res.status, 200, `Lookup status 200 for ${testCase}`);
  assert.deepEqual(res.data.result, mockLookupResult);

  // Check prompt
  assert.equal(capturedFetches.length, 1);
  const promptSent = capturedFetches[0].body.messages[0].content;
  assert.ok(promptSent.includes('Bạn là chuyên gia giảng dạy tiếng Anh công sở'));

  if (effectiveLang === 'vi') {
    assert.ok(!promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
    assert.ok(!promptSent.includes('do NOT use Vietnamese respelling'));
  } else {
    const promptName = SUPPORTED_LANGUAGES[effectiveLang].promptName;
    assert.ok(promptSent.includes('TARGET LANGUAGE OVERRIDE — mandatory'));
    assert.ok(promptSent.includes(`must be ${promptName}`));
    assert.ok(promptSent.includes('do NOT use Vietnamese respelling'));
  }
}

console.log('ALL WRITING MULTILINGUAL TESTS PASSED SUCCESSFULLY.');
