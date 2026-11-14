import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';
import { languageInstruction } from '../src/lib/lessons/language.mjs';

const apiSource = fs.readFileSync('src/app/api/pronunciation-practice/route.js', 'utf8');

// 1. Verify code structure & imports
assert(apiSource.includes('normalizeTargetLang'));
assert(apiSource.includes('languageInstruction'));
assert(apiSource.includes('DEFAULT_LANGUAGE'));
assert(apiSource.includes('pron-practice-v1'));
assert(apiSource.includes('pron-practice-i18n-v1'));

// 2. Set up isolated execution context for route logic
function createRouteHarness() {
  const memLog = [];
  const sqliteDb = new Map();
  const aiCalls = [];

  const context = vm.createContext({
    URL,
    Headers,
    Map,
    JSON,
    globalThis: {},
    NextResponse: {
      json: (body, init = {}) => ({
        status: init.status || 200,
        headers: init.headers || {},
        body,
      }),
    },
    cacheOwner: (req) => req.headers.get('owner'),
    cachedLookup: (owner, key) => {
      const entry = sqliteDb.get(`${owner}::${key}`);
      return entry || null;
    },
    cacheLookup: (owner, key, value) => {
      sqliteDb.set(`${owner}::${key}`, value);
    },
    callJson: async (messages, options) => {
      aiCalls.push({ messages, options });
      const promptText = messages[0]?.text || '';
      return {
        collocation: {
          phrase: 'make an effort',
          meaning: promptText.includes('Japanese') ? '努力する' : 'nỗ lực',
        },
        sentence: {
          text: 'She made an effort to finish on time.',
          meaning: promptText.includes('Japanese')
            ? '彼女は時間通りに終えるよう努力した。'
            : 'Cô ấy đã nỗ lực hoàn thành đúng giờ.',
        },
      };
    },
    normalizeTargetLang,
    DEFAULT_LANGUAGE,
    languageInstruction,
    console,
  });

  const apiCode = apiSource.replace(/^import .*;$/mg, '').replace(/export /g, '');
  vm.runInContext(apiCode + '; globalThis.api = { GET, memCache, practiceKey, memCacheKey };', context);

  return {
    GET: context.globalThis.api.GET,
    memCache: context.globalThis.api.memCache,
    sqliteDb,
    aiCalls,
  };
}

// Test 1: Invalid targetLang returns 400 before reads/cache/AI
{
  const { GET, memCache, sqliteDb, aiCalls } = createRouteHarness();
  const res = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=invalid_lang',
    headers: new Headers({ owner: 'user1' }),
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Ngôn ngữ không được hỗ trợ');
  assert.equal(aiCalls.length, 0);
  assert.equal(memCache.size, 0);
}

// Test 2: Word validation preserves 400 for empty or invalid word
{
  const { GET } = createRouteHarness();
  const resEmpty = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=',
    headers: new Headers({ owner: 'user1' }),
  });
  assert.equal(resEmpty.status, 400);
  assert.equal(resEmpty.body.error, 'Từ không hợp lệ');

  const resControlChar = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=test%00bad',
    headers: new Headers({ owner: 'user1' }),
  });
  assert.equal(resControlChar.status, 400);
  assert.equal(resControlChar.body.error, 'Từ không hợp lệ');
}

// Test 3: Unauthenticated request returns 401
{
  const { GET } = createRouteHarness();
  const res = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort',
    headers: new Headers(),
  });
  assert.equal(res.status, 401);
}

// Test 4: Default/vi targetLang preserves legacy prompt byte-for-byte & legacy practiceKey
{
  const expectedViPrompt = `Create one natural, common English collocation and one natural sentence for the word "effort".
The sentence MUST contain both the word and the collocation.
Provide Vietnamese meanings.
Return ONLY JSON with this shape:
{
  "word": "effort",
  "collocation": {
    "phrase": "common English collocation/phrase",
    "meaning": "Vietnamese meaning of the collocation"
  },
  "sentence": {
    "text": "English sentence containing the word and collocation",
    "meaning": "Vietnamese translation of the sentence"
  }
}
No markdown.`;

  // Without targetLang param (default to vi)
  {
    const { GET, sqliteDb, aiCalls } = createRouteHarness();
    const res = await GET({
      url: 'http://localhost/api/pronunciation-practice?word=effort',
      headers: new Headers({ owner: 'user1' }),
    });
    assert.equal(res.status, 200);
    assert.equal(aiCalls.length, 1);
    assert.equal(aiCalls[0].messages[0].text, expectedViPrompt);

    // Verify sqlite key is legacy pron-practice-v1
    const legacyKey = JSON.stringify(['pron-practice-v1', 'effort']);
    assert(sqliteDb.has(`user1::${legacyKey}`));
  }

  // With explicit targetLang=vi
  {
    const { GET, sqliteDb, aiCalls } = createRouteHarness();
    const res = await GET({
      url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=vi',
      headers: new Headers({ owner: 'user1' }),
    });
    assert.equal(res.status, 200);
    assert.equal(aiCalls.length, 1);
    assert.equal(aiCalls[0].messages[0].text, expectedViPrompt);

    const legacyKey = JSON.stringify(['pron-practice-v1', 'effort']);
    assert(sqliteDb.has(`user1::${legacyKey}`));
  }
}

// Test 5: All 5 supported locales prompt verification & English source untouched
{
  const expectedPrompts = {
    vi: false, // does not have override
    en: true,
    ja: true,
    ko: true,
    'zh-TW': true,
  };

  for (const locale of Object.keys(SUPPORTED_LANGUAGES)) {
    const { GET, sqliteDb, aiCalls } = createRouteHarness();
    const res = await GET({
      url: `http://localhost/api/pronunciation-practice?word=effort&targetLang=${locale}`,
      headers: new Headers({ owner: 'u_all' }),
    });
    assert.equal(res.status, 200);
    assert.equal(aiCalls.length, 1);
    const sentPrompt = aiCalls[0].messages[0].text;

    if (locale === 'vi') {
      assert(!sentPrompt.includes('TARGET LANGUAGE OVERRIDE'));
      assert(sqliteDb.has(`u_all::${JSON.stringify(['pron-practice-v1', 'effort'])}`));
    } else {
      assert(sentPrompt.includes('TARGET LANGUAGE OVERRIDE — mandatory:'));
      assert(sentPrompt.includes(SUPPORTED_LANGUAGES[locale].promptName));
      assert(sentPrompt.includes('Ensure collocation.meaning and sentence.meaning are translated into the target language'));
      assert(sentPrompt.includes('keep English source (word, collocation.phrase, sentence.text) in English untouched.'));
      assert(sqliteDb.has(`u_all::${JSON.stringify(['pron-practice-i18n-v1', locale, 'effort'])}`));
    }

    // Verify response schema
    assert.equal(res.body.word, 'effort');
    assert.equal(typeof res.body.collocation.phrase, 'string');
    assert.equal(typeof res.body.collocation.meaning, 'string');
    assert.equal(typeof res.body.sentence.text, 'string');
    assert.equal(typeof res.body.sentence.meaning, 'string');
  }
}

// Test 6: Memory cache isolation: owner + locale + word
{
  const { GET, memCache, aiCalls } = createRouteHarness();

  // Call as userA with vi
  await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=vi',
    headers: new Headers({ owner: 'userA' }),
  });
  assert.equal(aiCalls.length, 1);
  assert(memCache.has('userA:vi:effort'));
  assert(!memCache.has('effort')); // Global word key MUST NOT exist

  // Same word, userA with ja -> MUST NOT hit memCache of vi, MUST call AI
  await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=ja',
    headers: new Headers({ owner: 'userA' }),
  });
  assert.equal(aiCalls.length, 2);
  assert(memCache.has('userA:ja:effort'));

  // Same word and ja, but userB -> MUST NOT hit userA's memCache, MUST call AI
  await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=ja',
    headers: new Headers({ owner: 'userB' }),
  });
  assert.equal(aiCalls.length, 3);
  assert(memCache.has('userB:ja:effort'));

  // Second call for userA with ja -> MUST hit memCache (X-Practice-Cache: MEM)
  const memHitRes = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=effort&targetLang=ja',
    headers: new Headers({ owner: 'userA' }),
  });
  assert.equal(aiCalls.length, 3); // No new AI call
  assert.equal(memHitRes.headers['X-Practice-Cache'], 'MEM');
}

// Test 7: SQLite cache hit for vi (legacy key) and non-vi (namespaced key)
{
  const { GET, sqliteDb, aiCalls } = createRouteHarness();

  // Pre-populate sqlite cache for vi
  const viKey = JSON.stringify(['pron-practice-v1', 'practice']);
  sqliteDb.set('user1::' + viKey, {
    word: 'practice',
    collocation: { phrase: 'best practice', meaning: 'phương pháp tối ưu' },
    sentence: { text: 'Follow best practice.', meaning: 'Làm theo phương pháp tối ưu.' },
  });

  const resViSqlite = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=practice',
    headers: new Headers({ owner: 'user1' }),
  });
  assert.equal(resViSqlite.headers['X-Practice-Cache'], 'SQLITE');
  assert.equal(resViSqlite.body.collocation.phrase, 'best practice');
  assert.equal(aiCalls.length, 0);

  // Pre-populate sqlite cache for ko
  const koKey = JSON.stringify(['pron-practice-i18n-v1', 'ko', 'practice']);
  sqliteDb.set('user1::' + koKey, {
    word: 'practice',
    collocation: { phrase: 'best practice', meaning: '모범 사례' },
    sentence: { text: 'Follow best practice.', meaning: '모범 사례를 따르세요.' },
  });

  const resKoSqlite = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=practice&targetLang=ko',
    headers: new Headers({ owner: 'user1' }),
  });
  assert.equal(resKoSqlite.headers['X-Practice-Cache'], 'SQLITE');
  assert.equal(resKoSqlite.body.collocation.meaning, '모범 사례');
  assert.equal(aiCalls.length, 0);

  // Different owner user2 should NOT hit user1's sqlite entry
  const resUser2 = await GET({
    url: 'http://localhost/api/pronunciation-practice?word=practice&targetLang=ko',
    headers: new Headers({ owner: 'user2' }),
  });
  assert.equal(aiCalls.length, 1); // Misses sqlite, calls AI
  assert.equal(resUser2.headers['X-Practice-Cache'], undefined);
}

console.log('PASS checks/pronunciation-practice-language.mjs');
