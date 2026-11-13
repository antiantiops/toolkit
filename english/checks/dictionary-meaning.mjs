import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lookupMeaning,lookupLacViet,lookupVDict,parseVDictHtml} from '../src/lib/lookup/meaning.mjs';
const db=process.env.LACVIET_DB_PATH || '/tmp/lacviet-compare/lacviet.sqlite';
for(const word of ['blemish','compromise','cover','engineer']) {
 const hit=lookupLacViet(word,db); assert.equal(hit.source,'lacviet');assert(hit.meaning.length);assert(!hit.meaning.includes('<'));assert(!hit.meaning.includes('Thesaurus'));
}
const fixture='<h1>testword</h1><div id="entryDefinition"><section class="unified-senses"><h2 class="word-type">danh từ</h2><div class="meaning-value unified-translation">nghĩa &amp; khác</div></section></div>';
assert.equal(parseVDictHtml(fixture,'testword')[0].senses[0],'nghĩa & khác');
assert.equal(parseVDictHtml(fixture,'wrong'),null);
let online=0,ai=0;
const aiLookup=async input=>{ai++;assert.equal(input.definition,'book sense');return {meaning:'nghĩa AI'};};
let result=await lookupMeaning({word:'blemish',context:'other sense',lacvietDbPath:db,onlineLookup:async()=>{online++;},aiLookup});
assert.equal(result.source,'lacviet');assert.equal(online,0);assert.equal(ai,0);
result=await lookupMeaning({word:'notlocal',localLookup:()=>null,onlineLookup:async()=>({meaning:'web',source:'vdict'}),aiLookup});assert.equal(result.source,'vdict');assert.equal(ai,0);
for(const status of [403,429,500]){
 const hit=await lookupVDict('missing'+status,async()=>new Response('',{status}));assert.equal(hit,null);
}
assert.equal(await lookupVDict('timeout',async()=>{throw new Error('timeout')}),null);
assert.equal(await lookupVDict('../bad',async()=>{throw Error('must not fetch')}),null);
assert.equal(await lookupVDict('mismatch',async()=>new Response(fixture)),null);
result=await lookupMeaning({word:'notlocal',definition:'book sense',localLookup:()=>null,onlineLookup:async()=>null,aiLookup});assert.equal(result.source,'ai');assert.equal(ai,1);
const page=fs.readFileSync(new URL('../src/app/page.js',import.meta.url),'utf8');
assert(page.includes('fetch("/api/quick-word"'));
assert(page.includes('fetchWithRetry("/api/word"'));
assert(page.includes('definition: words.find'));
assert(!page.includes('lookup-source'));
assert(!page.includes('if (isDictionary)'));

// Regression check: source-bound runnable harness extracting actual lookupWord from page.js
{
  const lookupWordMatch = page.match(/const lookupWord = async \([\s\S]*?\n  \};\n\n  const resetPractice/);
  assert(lookupWordMatch, 'Failed to extract lookupWord function text from page.js');
  const lookupWordCode = lookupWordMatch[0].replace(/\n  const resetPractice/, '');

  const createHarness = (overrides = {}) => {
    let lookupState = null;
    const lookupRequest = { current: 0 };
    const lookupCache = { current: new Map() };
    const pronunciationCache = { current: new Map() };
    const remembered = [];
    const words = overrides.words || [{ word: 'Banned', definition: 'cấm' }];

    const setLookup = update => {
      lookupState = typeof update === 'function' ? update(lookupState) : update;
    };
    const setSaveError = err => {};
    const rememberEnglish = async w => { remembered.push(w); };
    const parseApiResponse = async res => res.json();
    const formatErrorMessage = err => String(err?.message || err);

    let quickDeferred = null;
    let detailDeferred = null;

    const fetchWithRetry = async (url, opts) => mockFetch(url, opts);

    const mockFetch = (url, opts) => {
      if (url === '/api/quick-word') {
        return new Promise((resolve, reject) => {
          quickDeferred = { resolve, reject, opts };
        });
      }
      if (url === '/api/word') {
        return new Promise((resolve, reject) => {
          detailDeferred = { resolve, reject, opts };
        });
      }
      if (url.startsWith('/api/pronunciation') || url.startsWith('/api/word-class')) {
        return new Promise(() => {}); // pending promise like in-flight network call
      }
      return Promise.resolve({ json: async () => ({}) });
    };

    const factory = new Function(
      'lookupRequest',
      'lookupCache',
      'pronunciationCache',
      'setLookup',
      'setSaveError',
      'rememberEnglish',
      'words',
      'fetch',
      'fetchWithRetry',
      'parseApiResponse',
      'formatErrorMessage',
      `const targetLang = "vi"; ${lookupWordCode}\nreturn lookupWord;`
    );

    const lookupWord = factory(
      lookupRequest,
      lookupCache,
      pronunciationCache,
      setLookup,
      setSaveError,
      rememberEnglish,
      words,
      mockFetch,
      fetchWithRetry,
      parseApiResponse,
      formatErrorMessage
    );

    return {
      lookupWord,
      get state() { return lookupState; },
      set state(val) { lookupState = val; },
      lookupRequest,
      lookupCache,
      pronunciationCache,
      get resolveQuick() { const pending = quickDeferred; return data => pending.resolve({ json: async () => data }); },
      rejectQuick: err => quickDeferred.reject(err),
      get resolveDetail() { const pending = detailDeferred; return data => pending.resolve({ json: async () => data }); },
      rejectDetail: err => detailDeferred.reject(err)
    };
  };

  // Case 1: quick arrives before detail -> quick meaning preserved
  {
    const h = createHarness();
    const p = h.lookupWord('test');
    await new Promise(r => setTimeout(r, 0));
    h.resolveQuick({ meaning: 'nghĩa nhanh', ipa: '/test/' });
    await new Promise(r => setTimeout(r, 0));
    assert.equal(h.state.meaning, 'nghĩa nhanh');
    assert.equal(h.state.loading, false);
    assert.equal(h.state.detailLoading, true);
    assert.equal(h.state.quick, true);

    h.resolveDetail({ word: { word: 'test', meaning: 'nghĩa chi tiết', examples: ['ex1'] } });
    await p;
    assert.equal(h.state.meaning, 'nghĩa nhanh');
    assert.equal(h.state.loading, false);
    assert.equal(h.state.detailLoading, false);
    assert.deepEqual(h.state.examples, ['ex1']);
    assert.equal(h.lookupCache.current.get(JSON.stringify(['test', '', 'vi'])).meaning, 'nghĩa nhanh');
  }

  // Case 2: detail arrives before quick -> late quick updates state and cache
  {
    const h = createHarness();
    const p = h.lookupWord('test');
    await new Promise(r => setTimeout(r, 0));
    h.resolveDetail({ word: { word: 'test', meaning: 'nghĩa chi tiết', examples: ['ex1'] } });
    await new Promise(r => setTimeout(r, 0));
    assert.equal(h.state.meaning, 'nghĩa chi tiết');
    assert.equal(h.state.loading, false);
    assert.equal(h.state.detailLoading, false);

    h.resolveQuick({ meaning: 'nghĩa nhanh' });
    await new Promise(r => setTimeout(r, 0));
    await p;
    assert.equal(h.state.meaning, 'nghĩa nhanh');
    assert.equal(h.state.loading, false);
    assert.equal(h.lookupCache.current.get(JSON.stringify(['test', '', 'vi'])).meaning, 'nghĩa nhanh');
  }

  // Case 3: canonical different case (Banned -> banned) & late quick arrival
  {
    const h = createHarness();
    const p = h.lookupWord('Banned');
    await new Promise(r => setTimeout(r, 0));
    // Detail resolves with canonical lower case "banned"
    h.resolveDetail({ word: { word: 'banned', meaning: 'bị cấm' } });
    await new Promise(r => setTimeout(r, 0));
    assert.equal(h.state.word, 'banned');
    assert.equal(h.state.meaning, 'bị cấm');

    // Late quick completes for 'Banned'
    h.resolveQuick({ meaning: 'nghĩa nhanh banned' });
    await new Promise(r => setTimeout(r, 0));
    await p;
    // Word was canonicalized to "banned", late quick still applies because current is non-null
    assert.equal(h.state.word, 'banned');
    assert.equal(h.state.meaning, 'nghĩa nhanh banned');
    assert.equal(h.lookupCache.current.get(JSON.stringify(['banned', '', 'vi'])).meaning, 'nghĩa nhanh banned');

    // Also verify closed popup (null guard preserved)
    h.state = null;
    // If another quick arrived or triggered when closed, state stays null
    // Test with fresh lookupWord where user closes popup before quick arrives
    const h2 = createHarness();
    const p2 = h2.lookupWord('test');
    await new Promise(r => setTimeout(r, 0));
    h2.state = null; // user closed popup
    h2.resolveQuick({ meaning: 'quick' });
    h2.resolveDetail({ word: { word: 'test', meaning: 'detail' } });
    await p2;
    assert.equal(h2.state, null);
  }

  // Case 4: cache reuse
  {
    const h = createHarness();
    h.lookupCache.current.set(JSON.stringify(['test', '', 'vi']), { word: 'test', meaning: 'cached meaning' });
    await h.lookupWord('test');
    assert.equal(h.state.meaning, 'cached meaning');
    assert.equal(h.state.loading, false);
    assert.equal(h.state.detailLoading, false);
  }

  // Case 5: stale quick completion must not overwrite newer request
  {
    const h = createHarness();
    const p1 = h.lookupWord('word1');
    await new Promise(r => setTimeout(r, 0));
    const quick1Resolve = h.resolveQuick;
    const detail1Resolve = h.resolveDetail;

    // Start request 2
    const p2 = h.lookupWord('word2');
    await new Promise(r => setTimeout(r, 0));
    h.resolveDetail({ word: { word: 'word2', meaning: 'meaning2' } });
    await p2;
    assert.equal(h.state.word, 'word2');
    assert.equal(h.state.meaning, 'meaning2');

    // Late quick from request 1 resolves
    quick1Resolve({ meaning: 'stale quick 1' });
    detail1Resolve({ word: { word: 'word1', meaning: 'detail1' } });
    await p1;
    // State remains word2, meaning2
    assert.equal(h.state.word, 'word2');
    assert.equal(h.state.meaning, 'meaning2');
  }

  // Case 6: quick failure -> fallback to detail meaning
  {
    const h = createHarness();
    const p = h.lookupWord('test');
    await new Promise(r => setTimeout(r, 0));
    h.rejectQuick(new Error('quick network error'));
    h.resolveDetail({ word: { word: 'test', meaning: 'nghĩa AI chi tiết' } });
    await p;
    assert.equal(h.state.meaning, 'nghĩa AI chi tiết');
    assert.equal(h.lookupCache.current.get(JSON.stringify(['test', '', 'vi'])).meaning, 'nghĩa AI chi tiết');
  }
}

console.log('PASS local4, POS, no HTML, priority, VDict parse/mismatch/errors/timeout, AI definition, independent quick and detail lookups, original markup');
