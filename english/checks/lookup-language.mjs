import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeTargetLang,
} from '../src/lib/lookup/languages.mjs';
import { validSavedText } from '../src/lib/words/validation.mjs';
import { lookupMeaning } from '../src/lib/lookup/meaning.mjs';

// Ensure LACVIET_DB_PATH is available if present in /tmp/lacviet-compare
if (!process.env.LACVIET_DB_PATH && fs.existsSync('/tmp/lacviet-compare/lacviet.sqlite')) {
  process.env.LACVIET_DB_PATH = '/tmp/lacviet-compare/lacviet.sqlite';
}

// 1. Languages metadata checks
assert.equal(DEFAULT_LANGUAGE, 'vi');
assert.deepEqual(Object.keys(SUPPORTED_LANGUAGES).sort(), ['en', 'ja', 'ko', 'vi', 'zh-TW'].sort());

for (const code of ['vi', 'en', 'ja', 'ko', 'zh-TW']) {
  const meta = SUPPORTED_LANGUAGES[code];
  assert(meta, `Missing metadata for ${code}`);
  assert.equal(meta.code, code);
  assert(typeof meta.nativeLabel === 'string' && meta.nativeLabel.length > 0);
  assert(typeof meta.flag === 'string' && meta.flag.length > 0);
  assert(typeof meta.promptName === 'string' && meta.promptName.length > 0);
}

assert.equal(SUPPORTED_LANGUAGES.vi.nativeLabel, 'Tiếng Việt');
assert.equal(SUPPORTED_LANGUAGES.vi.promptName, 'Vietnamese');
assert.equal(SUPPORTED_LANGUAGES.en.nativeLabel, 'English');
assert.equal(SUPPORTED_LANGUAGES.en.promptName, 'English');
assert.equal(SUPPORTED_LANGUAGES.ja.nativeLabel, '日本語');
assert.equal(SUPPORTED_LANGUAGES.ja.promptName, 'Japanese');
assert.equal(SUPPORTED_LANGUAGES.ko.nativeLabel, '한국어');
assert.equal(SUPPORTED_LANGUAGES.ko.promptName, 'Korean');
assert.equal(SUPPORTED_LANGUAGES['zh-TW'].nativeLabel, '繁體中文');
assert.equal(SUPPORTED_LANGUAGES['zh-TW'].promptName, 'Traditional Chinese');

// 2. Normalization: absent -> vi, invalid -> null
assert.equal(normalizeTargetLang(undefined), 'vi');
assert.equal(normalizeTargetLang(null), 'vi');
assert.equal(normalizeTargetLang(''), 'vi');
assert.equal(normalizeTargetLang('   '), 'vi');

assert.equal(normalizeTargetLang('vi'), 'vi');
assert.equal(normalizeTargetLang('en'), 'en');
assert.equal(normalizeTargetLang('EN'), 'en');
assert.equal(normalizeTargetLang('ja'), 'ja');
assert.equal(normalizeTargetLang('ko'), 'ko');
assert.equal(normalizeTargetLang('zh-TW'), 'zh-TW');
assert.equal(normalizeTargetLang('zh-tw'), 'zh-TW');

assert.equal(normalizeTargetLang('es'), null);
assert.equal(normalizeTargetLang('fr'), null);
assert.equal(normalizeTargetLang(123), null);
assert.equal(normalizeTargetLang({}), null);
assert.equal(normalizeTargetLang(true), null);

// 3. Harness to run route.js via vm context with Next NextResponse mock
let rawRouteSrc = fs.readFileSync('src/app/api/quick-word/route.js', 'utf8');
// Strip ES import/export statements
let transformedSrc = rawRouteSrc
  .replace(/^import\s+.*?;$/gm, '')
  .replace(/^export\s+async\s+function\s+POST/m, 'async function POST');

let mockFetches = [];
const mockNextResponse = {
  json(body, init = {}) {
    return {
      status: init.status || 200,
      headers: init.headers || {},
      async json() {
        return body;
      },
    };
  },
};

const routeGlobal = {};
const context = vm.createContext({
  globalThis: routeGlobal,
  NextResponse: mockNextResponse,
  validSavedText,
  lookupMeaning,
  normalizeTargetLang,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  fetch: async (url, opts) => {
    mockFetches.push({ url, opts, body: JSON.parse(opts?.body || '{}') });
    return routeGlobal.__fetchHandler(url, opts);
  },
  AbortSignal,
  Date,
  JSON,
  Map,
  Error,
  process: { env: { LACVIET_DB_PATH: '/tmp/lacviet-compare/lacviet.sqlite', NINEROUTER_URL: 'http://test-ai', NINEROUTER_KEY: 'test-key' } },
  console,
});

vm.runInContext(transformedSrc + '; globalThis.POST = POST;', context);
const POST = routeGlobal.POST;

function createReq(body) {
  return {
    async json() {
      return body;
    },
  };
}

// 3a. Invalid locale returns 400
{
  const res = await POST(createReq({ word: 'apple', targetLang: 'invalid_locale' }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Ngôn ngữ không được hỗ trợ');
}

// 3b. vi default when targetLang is omitted
// With LacViet DB hit (blemish), vi goes Lacviet -> VDict -> AI; must NOT call AI
{
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => {
    throw new Error('Should not call AI when dictionary matches');
  };
  const res = await POST(createReq({ word: 'blemish' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.source, 'lacviet');
  assert(data.meaning.length > 0);
  assert.equal(mockFetches.length, 0); // No AI called
}

// 3c. Non-vi (ja) for same word 'blemish' calls AI directly, no dictionary
{
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => {
    return {
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: '{"meaning":"欠点、傷"}' } }],
        };
      },
    };
  };
  const res = await POST(createReq({ word: 'blemish', targetLang: 'ja' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.source, 'ai');
  assert.equal(data.meaning, '欠点、傷');
  assert.equal(mockFetches.length, 1);
}

// 3d. Verify prompts for all 5 languages
const expectedPrompts = {
  vi: 'Translate selected English word or phrase into concise natural Vietnamese.',
  en: 'Explain the selected English word or phrase in concise, plain English for an English learner.',
  ja: 'Translate selected English word or phrase into concise natural Japanese.',
  ko: 'Translate selected English word or phrase into concise natural Korean.',
  'zh-TW': 'Translate selected English word or phrase into concise natural Traditional Chinese.',
};

for (const [lang, promptSnippet] of Object.entries(expectedPrompts)) {
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{ message: { content: `{"meaning":"meaning_${lang}"}` } }],
      };
    },
  });

  const testWord = `unique_${lang}_${Date.now()}`;
  const res = await POST(createReq({ word: testWord, targetLang: lang }));
  assert.equal(res.status, 200);
  assert.equal(mockFetches.length, 1);
  const prompt = mockFetches[0].body.messages[0].content;
  assert(prompt.includes(promptSnippet), `Prompt for ${lang} does not contain "${promptSnippet}". Got: ${prompt}`);

  if (lang === 'en') {
    assert(!prompt.includes('Vietnamese'), 'English prompt must not reference Vietnamese');
    assert(prompt.includes('plain English'), 'English prompt must specify plain English');
  }
}

// 3e. Cache separation between languages
{
  const testWord = `cacheword_${Date.now()}`;
  let calls = 0;
  routeGlobal.__fetchHandler = async (url, opts) => {
    calls++;
    const isJa = JSON.parse(opts.body).messages[0].content.includes('Japanese');
    return {
      ok: true,
      async json() {
        return {
          choices: [{ message: { content: JSON.stringify({ meaning: isJa ? 'ja_meaning' : 'ko_meaning' }) } }],
        };
      },
    };
  };

  // 1. Call ja
  const resJa1 = await POST(createReq({ word: testWord, targetLang: 'ja' }));
  assert.equal((await resJa1.json()).meaning, 'ja_meaning');
  assert.equal(calls, 1);

  // 2. Call ja again -> cached
  const resJa2 = await POST(createReq({ word: testWord, targetLang: 'ja' }));
  assert.equal((await resJa2.json()).meaning, 'ja_meaning');
  assert.equal(calls, 1);

  // 3. Call ko with same word -> must NOT return ja cache, must call AI
  const resKo = await POST(createReq({ word: testWord, targetLang: 'ko' }));
  assert.equal((await resKo.json()).meaning, 'ko_meaning');
  assert.equal(calls, 2);
}

// 3f. Preserve vi cache key compatibility
{
  const viWord = `vitest_${Date.now()}`;
  const expectedKey = JSON.stringify([viWord, '', '']);
  assert(!routeGlobal.quickMeaningAiCache.has(expectedKey));

  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{ message: { content: '{"meaning":"nghĩa vi test"}' } }],
      };
    },
  });

  const res = await POST(createReq({ word: viWord, targetLang: 'vi' }));
  assert.equal(res.status, 200);
  assert(routeGlobal.quickMeaningAiCache.has(expectedKey), 'vi cache key must match [normWord, definition, context]');
}

console.log('PASS lookup-language: metadata, normalize, prompt differences, cache separation, dictionary branch isolation');
