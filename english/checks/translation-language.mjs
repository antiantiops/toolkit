import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const dir = mkdtempSync(`${tmpdir()}/trans-lang-`);
process.env.LOOKUP_DB_PATH = `${dir}/cache.sqlite`;

const { cachedLookup, cacheLookup, LOOKUP_TTL } = await import('../src/lib/lookup/cache.js');
const { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } = await import('../src/lib/lookup/languages.mjs');

let rawRouteSrc = fs.readFileSync('src/app/api/lookup/route.js', 'utf8');
let transformedSrc = rawRouteSrc
  .replace(/^import\s+.*?;$/gm, '')
  .replace(/^export\s+async\s+function\s+POST/m, 'async function POST');

let mockFetches = [];
let currentOwner = 'user_test_1';

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
  currentUser: () => (currentOwner ? { id: currentOwner } : null),
  normalizeTargetLang,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  cachedLookup,
  cacheLookup,
  fetch: async (url, opts) => {
    mockFetches.push({ url, opts, body: JSON.parse(opts?.body || '{}') });
    return routeGlobal.__fetchHandler(url, opts);
  },
  Buffer,
  File: class MockFile {
    constructor(content = [], name = 'mock.png', options = {}) {
      this.name = name;
      this.size = options.size || (Array.isArray(content) ? content.reduce((a, b) => a + (b.length || 0), 0) : 100);
      this.type = options.type || 'image/png';
      this._content = content;
    }
    async arrayBuffer() {
      return Buffer.from(this._content[0] || 'fake_image_bytes');
    }
  },
  JSON,
  Error,
  process: { env: { NINEROUTER_URL: 'http://test-ai', NINEROUTER_KEY: 'test-key' } },
  console,
});

vm.runInContext(transformedSrc + '; globalThis.POST = POST;', context);
const POST = routeGlobal.POST;

function createReqFormData(entries) {
  const map = new Map(Object.entries(entries));
  return {
    async formData() {
      return {
        get(key) {
          return map.has(key) ? map.get(key) : null;
        },
      };
    },
  };
}

// 1. invalid targetLang returns 400
{
  const res = await POST(createReqFormData({ text: 'hello', targetLang: 'es' }));
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.error, 'Ngôn ngữ không được hỗ trợ');
}

// 2. prompt exact vi for en-vi and vi-en (both default and explicit 'vi')
{
  for (const tLang of [undefined, 'vi']) {
    // en-vi
    mockFetches = [];
    routeGlobal.__fetchHandler = async () => ({
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                direction: 'en-vi',
                original: 'hello',
                corrected: 'hello',
                ipa: '/həˈloʊ/',
                changed: false,
                meaning: 'xin chào',
                note: '',
              }),
            },
          }],
        };
      },
    });

    const entriesEnVi = { text: `hello_vi_${tLang || 'none'}`, direction: 'en-vi' };
    if (tLang) entriesEnVi.targetLang = tLang;
    const resEnVi = await POST(createReqFormData(entriesEnVi));
    assert.equal(resEnVi.status, 200);
    assert.equal(mockFetches.length, 1);
    const promptEnVi = mockFetches[0].body.messages[0].content[0].text;
    assert(promptEnVi.includes('You help Vietnamese learners look up English.'));
    assert(promptEnVi.includes('natural Vietnamese translation'));

    // vi-en
    mockFetches = [];
    routeGlobal.__fetchHandler = async () => ({
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                direction: 'vi-en',
                original: 'xin chào',
                corrected: 'hello',
                ipa: '/həˈloʊ/',
                changed: false,
                meaning: 'xin chào',
                note: '',
              }),
            },
          }],
        };
      },
    });

    const entriesViEn = { text: `xin_chao_${tLang || 'none'}`, direction: 'vi-en' };
    if (tLang) entriesViEn.targetLang = tLang;
    const resViEn = await POST(createReqFormData(entriesViEn));
    assert.equal(resViEn.status, 200);
    assert.equal(mockFetches.length, 1);
    const promptViEn = mockFetches[0].body.messages[0].content[0].text;
    assert(promptViEn.includes('You help Vietnamese learners translate Vietnamese into natural, modern, idiomatic English.'));
    assert(promptViEn.includes('natural Vietnamese translation of the English'));
  }
}

// 3. mocked AI both directions for all 5 locales ('vi', 'en', 'ja', 'ko', 'zh-TW')
const locales = ['vi', 'en', 'ja', 'ko', 'zh-TW'];
for (const loc of locales) {
  for (const dir of ['en-vi', 'vi-en']) {
    mockFetches = [];
    routeGlobal.__fetchHandler = async () => ({
      ok: true,
      async json() {
        return {
          choices: [{
            message: {
              content: JSON.stringify({
                direction: dir,
                original: dir === 'en-vi' ? 'test text' : 'văn bản thử nghiệm',
                corrected: 'test text',
                ipa: '/tɛst tɛkst/',
                changed: false,
                meaning: `meaning_${loc}`,
                note: `note_${loc}`,
              }),
            },
          }],
        };
      },
    });

    const entries = { text: `test_${loc}_${dir}`, direction: dir, targetLang: loc };
    const res = await POST(createReqFormData(entries));
    assert.equal(res.status, 200);
    assert.equal(mockFetches.length, 1);
    const prompt = mockFetches[0].body.messages[0].content[0].text;
    const body = await res.json();
    assert.equal(body.result.meaning, `meaning_${loc}`);

    if (loc === 'vi') {
      assert(prompt.includes('Vietnamese'));
    } else {
      const promptName = SUPPORTED_LANGUAGES[loc].promptName;
      if (dir === 'vi-en') {
        assert(prompt.includes(`You help ${promptName} learners translate ${promptName}`));
        assert(prompt.includes(`Typed ${promptName}`));
        assert(prompt.includes(`natural ${promptName} translation`));
        assert(!prompt.includes('Vietnamese'));
      } else {
        // en-vi direction
        assert(prompt.includes(`You help ${promptName} learners look up English.`));
        if (loc === 'en') {
          assert(prompt.includes('plain English explanation'));
          assert(prompt.includes('without foreign translation'));
          assert(!prompt.includes('Vietnamese'));
        } else {
          assert(prompt.includes(`natural ${promptName} translation`));
          assert(!prompt.includes('Vietnamese'));
        }
      }
    }
  }
}

// 4. Cache separation: HIT and summary isolation
{
  const word = 'isolation_check';
  // 4a. vi cache uses legacy key
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              direction: 'en-vi',
              original: word,
              corrected: word,
              ipa: '/aɪsəlˈeɪʃən/',
              changed: false,
              meaning: 'sự cô lập',
              note: '',
            }),
          },
        }],
      };
    },
  });

  const resVi1 = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'vi' }));
  assert.equal(resVi1.headers['X-Lookup-Cache'], 'MISS');
  assert.equal(mockFetches.length, 1);

  // Check legacy cache key in sqlite
  const legacyKey = JSON.stringify(['translation-ipa-v1', 'en-vi', word]);
  const cachedVi = cachedLookup(currentOwner, legacyKey);
  assert.equal(cachedVi.meaning, 'sự cô lập');
  const legacySummary = cachedLookup(currentOwner, JSON.stringify(['search-summary-v1', word, '']));
  assert.equal(legacySummary.meaning, 'sự cô lập');

  // Second call vi HIT
  const resVi2 = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'vi' }));
  assert.equal(resVi2.headers['X-Lookup-Cache'], 'HIT');
  assert.equal(mockFetches.length, 1);

  // 4b. ja call with same word must MISS and not return vi cache
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              direction: 'en-vi',
              original: word,
              corrected: word,
              ipa: '/aɪsəlˈeɪʃən/',
              changed: false,
              meaning: '孤立',
              note: '',
            }),
          },
        }],
      };
    },
  });

  const resJa1 = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'ja' }));
  assert.equal(resJa1.headers['X-Lookup-Cache'], 'MISS');
  assert.equal(mockFetches.length, 1);
  const dataJa1 = await resJa1.json();
  assert.equal(dataJa1.result.meaning, '孤立');

  // Check ja cache key
  const jaKey = JSON.stringify(['translation-i18n-v1', 'ja', 'en-vi', word]);
  const cachedJa = cachedLookup(currentOwner, jaKey);
  assert.equal(cachedJa.meaning, '孤立');
  const jaSummary = cachedLookup(currentOwner, JSON.stringify(['search-summary-i18n-v1', 'ja', word, '']));
  assert.equal(jaSummary.meaning, '孤立');

  // ja call again HIT
  const resJa2 = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'ja' }));
  assert.equal(resJa2.headers['X-Lookup-Cache'], 'HIT');
  assert.equal(mockFetches.length, 1);

  // ko call with same word MISS
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              direction: 'en-vi',
              original: word,
              corrected: word,
              ipa: '/aɪsəlˈeɪʃən/',
              changed: false,
              meaning: '고립',
              note: '',
            }),
          },
        }],
      };
    },
  });

  const resKo = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'ko' }));
  assert.equal(resKo.headers['X-Lookup-Cache'], 'MISS');
  assert.equal(mockFetches.length, 1);
  const dataKo = await resKo.json();
  assert.equal(dataKo.result.meaning, '고립');
}

// 5. Image upload bypasses cache read & write
{
  const word = 'image_test_word';
  mockFetches = [];
  routeGlobal.__fetchHandler = async () => ({
    ok: true,
    async json() {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              direction: 'en-vi',
              original: 'image text',
              corrected: 'image text',
              ipa: '/ˈɪmɪdʒ/',
              changed: false,
              meaning: '画像',
              note: '',
            }),
          },
        }],
      };
    },
  });

  const mockFile = new context.File(['img_bytes'], 'test.png', { type: 'image/png' });
  const resImg = await POST(createReqFormData({ text: word, direction: 'en-vi', targetLang: 'ja', image: mockFile }));
  assert.equal(resImg.headers['X-Lookup-Cache'], 'MISS');
  assert.equal(mockFetches.length, 1);

  // Check that cache was NOT populated
  const jaKey = JSON.stringify(['translation-i18n-v1', 'ja', 'en-vi', word]);
  assert.equal(cachedLookup(currentOwner, jaKey), null);
}

// Cleanup
rmSync(dir, { recursive: true, force: true });

console.log('PASS checks/translation-language.mjs: 400 invalid, prompt exact vi, 5 locales 2 directions, cache separation HIT/summary, image bypass');
