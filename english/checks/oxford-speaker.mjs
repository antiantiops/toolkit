import assert from 'node:assert/strict';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/app/SpeakBtn.js', import.meta.url), 'utf8');
const start = src.indexOf('const tts =');
const end = src.indexOf('async function speak(');
assert.ok(start !== -1 && end > start, 'Failed to locate audioUrl block in SpeakBtn.js');
const snippet = src.slice(start, end);

let blobSeq = 0;
const revoked = [];
const fetchCalls = [];
let mockFetchImpl = async () => {
  throw new Error('Unexpected fetch');
};

class MockURL extends URL {
  static createObjectURL() {
    return `blob:mock/${++blobSeq}`;
  }
  static revokeObjectURL(u) {
    revoked.push(u);
  }
}

const buildHarness = () =>
  new Function(
    'fetch',
    'URL',
    `${snippet}\nreturn { tts, OXFORD_WORD, oxfordUrl, cacheSet, audioUrl };`
  )((...args) => {
    fetchCalls.push(args);
    return mockFetchImpl(...args);
  }, MockURL);

const resetState = (h) => {
  h.tts.cache.clear();
  fetchCalls.length = 0;
  revoked.length = 0;
  blobSeq = 0;
};

// 1. Oxford selection for encompass/enclose/embrace/exclude/omit + trim/lowercase + region preference
{
  const h = buildHarness();
  const words = ['encompass', 'enclose', 'embrace', 'exclude', 'omit'];
  mockFetchImpl = async (url) => {
    const u = new URL(url, 'https://example.test');
    const w = u.searchParams.get('word');
    const host = w === 'omit' ? 'oxfordlearnersdictionaries.com' : 'www.oxfordlearnersdictionaries.com';
    return {
      ok: true,
      status: 200,
      json: async () => ({
        pronunciation: {
          source: 'Oxford',
          audioUs: `https://${host}/media/us/${w}.mp3`,
          audioUk: `https://${host}/media/uk/${w}.mp3`,
        },
      }),
    };
  };

  for (const w of words) {
    const us = await h.audioUrl(` ${w[0].toUpperCase()}${w.slice(1)} `, 'en-US');
    assert.equal(us, `https://${w === 'omit' ? 'oxfordlearnersdictionaries.com' : 'www.oxfordlearnersdictionaries.com'}/media/us/${w}.mp3`);
    assert.equal(fetchCalls.at(-1)[0], `/api/pronunciation?word=${w}`);

    const uk = await h.audioUrl(w, 'en-GB');
    assert.equal(uk, `https://${w === 'omit' ? 'oxfordlearnersdictionaries.com' : 'www.oxfordlearnersdictionaries.com'}/media/uk/${w}.mp3`);
  }

  // Fallback within Oxford (US missing -> UK, UK missing -> US)
  resetState(h);
  mockFetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      pronunciation: {
        source: 'Oxford',
        audioUs: null,
        audioUk: 'https://www.oxfordlearnersdictionaries.com/media/uk/only-uk.mp3',
      },
    }),
  });
  assert.equal(
    await h.audioUrl('enclose', 'en-US'),
    'https://www.oxfordlearnersdictionaries.com/media/uk/only-uk.mp3'
  );

  resetState(h);
  mockFetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      pronunciation: {
        source: 'Oxford',
        audioUs: 'https://www.oxfordlearnersdictionaries.com/media/us/only-us.mp3',
        audioUk: null,
      },
    }),
  });
  assert.equal(
    await h.audioUrl('embrace', 'en-GB'),
    'https://www.oxfordlearnersdictionaries.com/media/us/only-us.mp3'
  );

  // Cache hit avoids repeat fetch
  const countBefore = fetchCalls.length;
  assert.equal(
    await h.audioUrl(' EMBRACE ', 'en-GB'),
    'https://www.oxfordlearnersdictionaries.com/media/us/only-us.mp3'
  );
  assert.equal(fetchCalls.length, countBefore);
}

// 2. Missing / upstream error / wrong source -> throws, never calls /api/tts
{
  const h = buildHarness();
  const cases = [
    { ok: false, status: 502, json: async () => ({ error: 'Oxford upstream error' }) },
    { ok: true, status: 200, json: async () => ({ pronunciation: null }) },
    { ok: true, status: 200, json: async () => ({ pronunciation: { source: 'Other', audioUs: 'https://www.oxfordlearnersdictionaries.com/a.mp3' } }) },
    { ok: true, status: 200, json: async () => ({ pronunciation: { source: 'Oxford', audioUs: null, audioUk: null } }) },
  ];

  for (const res of cases) {
    resetState(h);
    mockFetchImpl = async () => res;
    await assert.rejects(() => h.audioUrl('exclude', 'en-US'));
    assert.ok(fetchCalls.every(([u]) => String(u).startsWith('/api/pronunciation?')));
    assert.equal(fetchCalls.some(([u]) => u === '/api/tts'), false);
  }
}

// 3. Unsafe URLs rejected, never falls back to /api/tts
{
  const h = buildHarness();
  const unsafe = [
    'http://www.oxfordlearnersdictionaries.com/media/us/test.mp3',
    'https://evil.example/media/us/test.mp3',
    'https://www.oxfordlearnersdictionaries.com.evil.example/media/us/test.mp3',
    'javascript:alert(1)',
    'not a url',
  ];
  for (const bad of unsafe) {
    resetState(h);
    mockFetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ pronunciation: { source: 'Oxford', audioUs: bad, audioUk: bad } }),
    });
    await assert.rejects(() => h.audioUrl('encompass', 'en-US'));
    assert.equal(fetchCalls.some(([u]) => u === '/api/tts'), false);
  }
}

// 4. Phrases and Vietnamese keep /api/tts
{
  const h = buildHarness();
  resetState(h);
  mockFetchImpl = async (url, init) => {
    assert.equal(url, '/api/tts');
    assert.equal(init.method, 'POST');
    return {
      ok: true,
      status: 200,
      blob: async () => ({ size: 4 }),
    };
  };

  const p1 = await h.audioUrl('encompass the full scope', 'en-US');
  const p2 = await h.audioUrl('xin chào', 'vi-VN');
  const p3 = await h.audioUrl('encompass', 'vi-VN');
  const p4 = await h.audioUrl('encompass', 'en-US', false);
  assert.ok(p1.startsWith('blob:mock/'));
  assert.ok(p2.startsWith('blob:mock/'));
  assert.ok(p3.startsWith('blob:mock/'));
  assert.ok(p4.startsWith('blob:mock/'));
  assert.equal(fetchCalls.length, 4);
}

// 5. Cache max 200 & evicts only blob: URLs (never remote Oxford URLs)
{
  const h = buildHarness();
  resetState(h);
  h.cacheSet('ox|en-US|first', 'https://www.oxfordlearnersdictionaries.com/first.mp3');
  h.cacheSet('en-US|second', 'blob:mock/second');
  for (let i = 2; i < 200; i++) {
    h.cacheSet(`k${i}`, `https://www.oxfordlearnersdictionaries.com/${i}.mp3`);
  }
  assert.equal(h.tts.cache.size, 200);

  // Evicts 'ox|en-US|first' (remote URL -> no revokeObjectURL)
  h.cacheSet('k200', 'blob:mock/200');
  assert.equal(h.tts.cache.size, 200);
  assert.deepEqual(revoked, []);

  // Evicts 'en-US|second' (blob URL -> revokeObjectURL called)
  h.cacheSet('k201', 'https://www.oxfordlearnersdictionaries.com/201.mp3');
  assert.equal(h.tts.cache.size, 200);
  assert.deepEqual(revoked, ['blob:mock/second']);
}

// 6. Oxford playbackRate = 1, en-US phrases retain 0.85
assert.match(src, /audio\.playbackRate=!isOxford&&lang==='en-US'\?0\.85:1/);

console.log('oxford-speaker checks passed');
