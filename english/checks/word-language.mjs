import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeTargetLang,
} from '../src/lib/lookup/languages.mjs';
import { lookupKey, cachedGameWords } from '../src/lib/lookup/cache.js';

// 1. Check lookupKey preservation and isolation
{
  const viDefault = lookupKey('Apple', 'in sentence');
  const viExplicit = lookupKey('Apple', 'in sentence', 'vi');
  assert.equal(viDefault, JSON.stringify(['word-v2', 'apple', 'in sentence']));
  assert.equal(viExplicit, JSON.stringify(['word-v2', 'apple', 'in sentence']));

  const enKey = lookupKey('Apple', 'in sentence', 'en');
  assert.equal(enKey, JSON.stringify(['word-i18n-v1', 'en', 'apple', 'in sentence']));

  const jaKey = lookupKey('Apple', 'in sentence', 'ja');
  assert.equal(jaKey, JSON.stringify(['word-i18n-v1', 'ja', 'apple', 'in sentence']));

  const koKey = lookupKey('Apple', 'in sentence', 'ko');
  assert.equal(koKey, JSON.stringify(['word-i18n-v1', 'ko', 'apple', 'in sentence']));

  const zhKey = lookupKey('Apple', 'in sentence', 'zh-TW');
  assert.equal(zhKey, JSON.stringify(['word-i18n-v1', 'zh-TW', 'apple', 'in sentence']));

  // Isolation: keys are different
  assert.notEqual(viDefault, enKey);
  assert.notEqual(jaKey, zhKey);
}

// 2. Load route.js in a mock VM context
const rawRouteSrc = fs.readFileSync('src/app/api/word/route.js', 'utf8');
const transformedSrc = rawRouteSrc
  .replace(/^import\s+.*?;$/gm, '')
  .replace(/^export\s+async\s+function\s+POST/m, 'async function POST');

let mockFetches = [];
let mockCacheStore = new Map();

function resetMockCache() {
  mockCacheStore = new Map();
}

function mockCachedLookup(owner, key) {
  if (!owner) return null;
  return mockCacheStore.get(`${owner}:${key}`) || null;
}

function mockCacheLookup(owner, key, val) {
  if (!owner) return;
  mockCacheStore.set(`${owner}:${key}`, val);
}

let mockUser = { id: 'user_1' };

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
  validSavedText: (txt) => typeof txt === 'string' && txt.trim().length > 0 && txt.length <= 100,
  currentUser: () => mockUser,
  cachedLookup: (owner, key) => mockCachedLookup(owner, key),
  cacheLookup: (owner, key, val) => mockCacheLookup(owner, key, val),
  lookupKey,
  normalizeTargetLang,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  fetch: async (url, opts) => {
    const parsedBody = opts?.body ? JSON.parse(opts.body) : {};
    mockFetches.push({ url, opts, body: parsedBody });
    return routeGlobal.__fetchHandler(url, opts, parsedBody);
  },
  AbortSignal,
  Date,
  JSON,
  Map,
  Error,
  process: { env: { NINEROUTER_URL: 'http://test-ai', NINEROUTER_KEY: 'test-key' } },
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

// Test 2a: Invalid targetLang returns 400
{
  resetMockCache();
  const res = await POST(createReq({ word: 'apple', targetLang: 'fr' }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Ngôn ngữ không được hỗ trợ');
}

// Test 2b: Invalid word returns 400
{
  resetMockCache();
  const res = await POST(createReq({ word: '', targetLang: 'en' }));
  assert.equal(res.status, 400);
}

// Test 2c: All 5 languages generate expected prompts and system messages
resetMockCache();
const expectedLangs = ['vi', 'en', 'ja', 'ko', 'zh-TW'];
for (const lang of expectedLangs) {
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                word: 'covers',
                typoOf: '',
                ipa: '/ˈkʌv.əz/',
                partOfSpeech: 'noun (plural)',
                meaning: `meaning in ${lang}`,
                easyReading: 'pronunciation guide',
                usage: 'usage guide',
                synonyms: 'blanket',
                antonyms: '',
                contrastExamples: [
                  {
                    word: 'covers',
                    english: 'Pull the covers over your head.',
                    vietnamese: `translation in ${lang}`,
                  },
                ],
                contrastTip: 'tip',
              }),
            },
          },
        ],
      };
    },
  });

  const res = await POST(createReq({ word: 'covers', context: 'Pull the covers over your head', targetLang: lang }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.word.word, 'covers');
  assert.equal(mockFetches.length, 1);

  const sentMessages = mockFetches[0].body.messages;
  assert.equal(sentMessages.length, 2);
  const systemMsg = sentMessages[0].content;
  const userMsg = sentMessages[1].content;

  if (lang === 'vi') {
    assert(systemMsg.includes('You teach English pronunciation to Vietnamese beginners'));
    assert(systemMsg.includes('easyReading MUST use Vietnamese vowel spelling'));
    assert(userMsg.includes('Dễ đọc cho người Việt'));
    assert(userMsg.includes('Vietnamese meaning in this context'));
    // Cached key for vi
    const viKey = lookupKey('covers', 'Pull the covers over your head', 'vi');
    assert(mockCacheStore.has(`user_1:${viKey}`));
  } else {
    const promptName = SUPPORTED_LANGUAGES[lang].promptName;
    assert(systemMsg.includes(`in ${langNameOr(promptName)}`));
    assert(systemMsg.includes('do not use Vietnamese respelling'));
    assert(userMsg.includes(`Target explanation language: ${promptName}`));
    assert(userMsg.includes('do NOT use Vietnamese respelling'));
    assert(userMsg.includes('contrastExamples[].vietnamese'));
    // Cached key for non-vi
    const nonViKey = lookupKey('covers', 'Pull the covers over your head', lang);
    assert(mockCacheStore.has(`user_1:${nonViKey}`));
  }
}

function langNameOr(name) {
  return name;
}

// Test 2d: Cache HIT returns cached word and does not call fetch
{
  mockFetches = [];
  const res = await POST(createReq({ word: 'covers', context: 'Pull the covers over your head', targetLang: 'ja' }));
  assert.equal(res.status, 200);
  assert.equal(res.headers['X-Lookup-Cache'], 'HIT');
  assert.equal(mockFetches.length, 0); // No fetch
}

// Test 2e: Typo correction stores canonical and typo keys with targetLang
{
  resetMockCache();
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                word: 'fridge',
                typoOf: 'Frige',
                ipa: '/frɪdʒ/',
                partOfSpeech: 'noun',
                meaning: 'refrigerator in Korean',
                easyReading: 'tips in Korean',
                usage: 'usage in Korean',
                synonyms: 'refrigerator',
                antonyms: '',
                contrastExamples: [],
                contrastTip: '',
              }),
            },
          },
        ],
      };
    },
  });

  const res = await POST(createReq({ word: 'Frige', context: 'open the frige', targetLang: 'ko' }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.word.word, 'fridge');
  assert.equal(data.word.typoOf, 'Frige');

  // Both typo key and canonical key must be cached with targetLang='ko'
  const typoKey = lookupKey('Frige', 'open the frige', 'ko');
  const canonicalKey = lookupKey('fridge', 'open the frige', 'ko');
  assert(mockCacheStore.has(`user_1:${typoKey}`));
  assert(mockCacheStore.has(`user_1:${canonicalKey}`));
  assert.equal(mockCacheStore.get(`user_1:${canonicalKey}`).typoOf, '');
}

console.log('ALL word-language checks passed.');
