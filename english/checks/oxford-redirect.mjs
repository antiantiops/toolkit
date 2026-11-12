import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Transform src/lib/lookup/oxford.js to stub next htmlParser import for standalone node test
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const oxfordPath = path.resolve(__dirname, '../src/lib/lookup/oxford.js');
let code = fs.readFileSync(oxfordPath, 'utf8');

// Replace next/dist/compiled/node-html-parser import with a small mock/parser or dummy
// We can mock node-html-parser inline or load actual html parser if available
const mockedImport = `
const htmlParser = {
  parse: (html) => ({
    querySelector: (sel) => {
      if (sel === '#entryContent .entry' || sel === '.entry') {
        if (html.includes('class="entry"')) {
          return {
            querySelector: (s) => {
              if (s === '.phonetics') {
                if (html.includes('class="phonetics"')) {
                  return {
                    querySelector: (sub) => {
                      if (sub === '.phons_br') {
                        return {
                          querySelectorAll: () => html.includes('phon_uk') ? [{ text: '/ble-mish/' }] : [],
                          querySelector: () => ({ getAttribute: () => 'https://www.oxfordlearnersdictionaries.com/us/media/uk.mp3' })
                        };
                      }
                      if (sub === '.phons_n_am') {
                        return {
                          querySelectorAll: () => html.includes('phon_us') ? [{ text: '/ble-mish-us/' }] : [],
                          querySelector: () => ({ getAttribute: () => 'https://www.oxfordlearnersdictionaries.com/us/media/us.mp3' })
                        };
                      }
                      return null;
                    }
                  };
                }
                return null;
              }
              return null;
            }
          };
        }
        return null;
      }
      return null;
    }
  })
};
`;

code = code.replace(/import htmlParser from [^;]+;/, mockedImport);

// Create temp module
const tempModulePath = path.resolve(__dirname, './_temp_oxford.mjs');
fs.writeFileSync(tempModulePath, code, 'utf8');

try {
  const { lookupOxford, validateDefinitionUrl } = await import('./_temp_oxford.mjs');

  console.log('Testing validateDefinitionUrl...');
  assert.equal(validateDefinitionUrl('https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1'), 'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1');
  assert.equal(validateDefinitionUrl('/us/definition/english/blemish_1', 'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish'), 'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1');
  assert.equal(validateDefinitionUrl('http://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1'), null); // downgrade
  assert.equal(validateDefinitionUrl('https://evil.com/us/definition/english/blemish_1'), null); // foreign host
  assert.equal(validateDefinitionUrl('https://www.oxfordlearnersdictionaries.com:8443/us/definition/english/blemish_1'), null); // port
  assert.equal(validateDefinitionUrl('https://user:pass@www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1'), null); // credentials
  assert.equal(validateDefinitionUrl('https://www.oxfordlearnersdictionaries.com/evil/path'), null); // not english definition path

  // Setup mock global.fetch
  const originalFetch = globalThis.fetch;
  let fetchHistory = [];

  function createResponse({ status = 200, headers = {}, bodyText = '', bodyCanceled = false }) {
    const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    let canceled = false;
    const bodyStream = {
      getReader: () => {
        let readOnce = false;
        return {
          read: async () => {
            if (readOnce) return { done: true, value: undefined };
            readOnce = true;
            return { done: false, value: new TextEncoder().encode(bodyText) };
          },
          cancel: async () => {
            canceled = true;
          }
        };
      },
      cancel: async () => {
        canceled = true;
      }
    };
    return {
      status,
      headers: {
        get: (h) => headerMap.get(h.toLowerCase()) || null
      },
      body: bodyStream,
      text: async () => bodyText,
      get isCanceled() { return canceled; }
    };
  }

  // Test 1: Direct 200
  console.log('Test 1: Direct 200...');
  fetchHistory = [];
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  const res1 = await lookupOxford('direct');
  assert.equal(fetchHistory.length, 1);
  assert.equal(res1.sourceUrl, 'https://www.oxfordlearnersdictionaries.com/us/definition/english/direct');
  assert.equal(res1.uk, '/ble-mish/');

  // Test 2: 302 canonical redirect (blemish -> blemish_1)
  console.log('Test 2: 302 canonical redirect...');
  fetchHistory = [];
  let redirectResp = null;
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    if (url.endsWith('/blemish')) {
      redirectResp = createResponse({
        status: 302,
        headers: { location: 'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1' },
        bodyText: 'redirecting...'
      });
      return redirectResp;
    }
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  const res2 = await lookupOxford('blemish');
  assert.equal(fetchHistory.length, 2);
  assert.equal(res2.sourceUrl, 'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1');
  assert.ok(redirectResp && redirectResp.isCanceled, 'Redirect response body was canceled');

  // Test 3: Relative redirect
  console.log('Test 3: Relative redirect...');
  fetchHistory = [];
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    if (url.endsWith('/relative')) {
      return createResponse({
        status: 301,
        headers: { location: '/us/definition/english/relative_1' },
      });
    }
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  const res3 = await lookupOxford('relative');
  assert.equal(fetchHistory.length, 2);
  assert.equal(res3.sourceUrl, 'https://www.oxfordlearnersdictionaries.com/us/definition/english/relative_1');

  // Test 4: Unsafe locations not fetched (foreign host, downgrade, port, user/pass)
  console.log('Test 4: Unsafe locations not fetched...');
  fetchHistory = [];
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    return createResponse({
      status: 302,
      headers: { location: 'https://attacker.com/us/definition/english/exploit' },
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('unsafe');
  }, /Unsafe or invalid redirect location/);
  assert.equal(fetchHistory.length, 1); // attacker.com never fetched

  // Test 5: Loop cap & redirect count > 3
  console.log('Test 5: Loop cap...');
  fetchHistory = [];
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    return createResponse({
      status: 302,
      headers: { location: url },
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('loop');
  }, /Redirect loop detected/);
  assert.equal(fetchHistory.length, 1);

  // Max 3 redirects exceeded
  console.log('Test 5b: Max 3 redirects exceeded...');
  fetchHistory = [];
  let hopNum = 0;
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    hopNum++;
    return createResponse({
      status: 302,
      headers: { location: `/us/definition/english/hop_${hopNum}` },
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('manyhops');
  }, /Exceeded max redirects/);
  assert.equal(fetchHistory.length, 4); // 0 (initial), hop 1, hop 2, hop 3 -> then reject

  // Test 6: 404 returns null and caches negative TTL
  console.log('Test 6: 404 returns null...');
  fetchHistory = [];
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    return createResponse({ status: 404 });
  };
  const res6 = await lookupOxford('notfoundword');
  assert.equal(res6, null);
  // Second call should hit negative cache, no extra fetch
  const res6Cached = await lookupOxford('notfoundword');
  assert.equal(res6Cached, null);
  assert.equal(fetchHistory.length, 1);

  // Test 7: 500 error throws, NOT cached as null
  console.log('Test 7: 500 error throws and not cached...');
  fetchHistory = [];
  let server500 = true;
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    if (server500) {
      return createResponse({ status: 500 });
    }
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('servererror');
  }, /Oxford upstream error: 500/);

  // Next call should retry network, NOT return cached null
  server500 = false;
  const res7Recovered = await lookupOxford('servererror');
  assert.ok(res7Recovered);
  assert.equal(fetchHistory.length, 2);

  // Test 8: Parse failure (entry missing phonetics) throws and NOT cached
  console.log('Test 8: Parse failure throws and not cached...');
  fetchHistory = [];
  let parseBroken = true;
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    if (parseBroken) {
      return createResponse({
        status: 200,
        bodyText: '<div class="entry">No phonetics here</div>'
      });
    }
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('parsefail');
  }, /missing phonetics/);

  parseBroken = false;
  const res8Recovered = await lookupOxford('parsefail');
  assert.ok(res8Recovered);
  assert.equal(fetchHistory.length, 2);

  // Test 9: Empty 200 response throws and is NOT cached
  console.log('Test 9: Empty 200 response throws and not cached...');
  fetchHistory = [];
  let empty200 = true;
  globalThis.fetch = async (url) => {
    fetchHistory.push(url);
    if (empty200) {
      return createResponse({
        status: 200,
        bodyText: ''
      });
    }
    return createResponse({
      status: 200,
      bodyText: '<div class="entry"><div class="phonetics"><span class="phon_uk"></span></div></div>'
    });
  };
  await assert.rejects(async () => {
    await lookupOxford('emptyresponse');
  }, /Empty Oxford response/);

  empty200 = false;
  const res9Recovered = await lookupOxford('emptyresponse');
  assert.ok(res9Recovered);
  assert.equal(fetchHistory.length, 2);

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('ALL TESTS PASSED!');
} finally {
  fs.unlinkSync(tempModulePath);
}
