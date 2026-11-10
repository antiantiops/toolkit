import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ui = fs.readFileSync('src/app/PronunciationRecorder.js', 'utf8');
const api = fs.readFileSync('src/app/api/pronunciation-practice/route.js', 'utf8');
const page = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Verify page wiring
assert.match(page, /<PronunciationRecorder key=\{lookup\.word\} word=\{lookup\.word\} [^>]*lookup=\{lookup\}/);

// 2. Verify UI elements and hooks
assert(ui.includes('Luyện câu'));
assert(ui.includes('Luyện collocation'));
assert(ui.includes('Luyện lại từ gốc'));
assert(ui.includes('/api/pronunciation-practice?word='));
assert(ui.includes('result?.score > 90'));
assert(ui.includes('collocation'));
assert(ui.includes('sentence'));

// 3. Verify API endpoint contracts
assert(api.includes('cacheOwner(request)'));
assert(api.includes('callJson'));
assert(api.includes('cachedLookup'));
assert(api.includes('cacheLookup'));

// 4. Test API endpoint logic in isolated context
const context = vm.createContext({
  URL,
  Headers,
  Map,
  JSON,
  globalThis: {},
  NextResponse: {
    json: (body, init = {}) => ({ status: init.status || 200, headers: init.headers || {}, body }),
  },
  cacheOwner: (req) => req.headers.get('owner'),
  cachedLookup: (owner, key) => (owner === 'test_cached' ? {
    word: 'sustainable',
    collocation: { phrase: 'sustainable development', meaning: 'phát triển bền vững' },
    sentence: { text: 'Sustainable development ensures a better future.', meaning: 'Phát triển bền vững đảm bảo tương lai tốt đẹp hơn.' }
  } : null),
  cacheLookup: () => {},
  callJson: async (content) => ({
    collocation: { phrase: 'make an effort', meaning: 'nỗ lực' },
    sentence: { text: 'She made an effort to finish on time.', meaning: 'Cô ấy đã nỗ lực hoàn thành đúng giờ.' }
  }),
  console,
});

let apiCode = api.replace(/^import .*;$/mg, '').replace(/export /g, '');
vm.runInContext(apiCode + '; globalThis.api = { GET };', context);
const { GET } = context.globalThis.api;

// Unauthenticated check
const res401 = await GET({
  url: 'http://localhost/api/pronunciation-practice?word=effort',
  headers: new Headers(),
});
assert.equal(res401.status, 401);

// Invalid word check
const res400 = await GET({
  url: 'http://localhost/api/pronunciation-practice?word=',
  headers: new Headers({ owner: 'user1' }),
});
assert.equal(res400.status, 400);

// Cached lookup check
const resCached = await GET({
  url: 'http://localhost/api/pronunciation-practice?word=sustainable',
  headers: new Headers({ owner: 'test_cached' }),
});
assert.equal(resCached.status, 200);
assert.equal(resCached.body.collocation.phrase, 'sustainable development');

// Successful AI generation check
const resSuccess = await GET({
  url: 'http://localhost/api/pronunciation-practice?word=effort',
  headers: new Headers({ owner: 'user1' }),
});
assert.equal(resSuccess.status, 200);
assert.equal(resSuccess.body.collocation.phrase, 'make an effort');
assert.equal(resSuccess.body.sentence.text, 'She made an effort to finish on time.');

console.log('PASS pronunciation-advanced-practice check: page props, UI switches, API auth/cache/AI contracts');
