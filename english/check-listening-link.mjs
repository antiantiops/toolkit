import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { normalizeTargetLang } from './src/lib/lookup/languages.mjs';

const appPath = (...parts) => new URL(path.posix.join('./', ...parts), import.meta.url);
const samplePath = '/tmp/ielts-link-sample.FMnmk4';
const sampleBytes = fs.readFileSync(samplePath);
assert(sampleBytes.length > 25 * 1024 * 1024 && sampleBytes.length < 40 * 1024 * 1024, 'Sample MP3 between 25 MiB and 40 MiB');

function extractCode(relPath) {
  let code = fs.readFileSync(appPath(relPath), 'utf8');
  code = code.replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\n?/gm, '');
  code = code.replace(/^export\s+async\s+function\s+/gm, 'async function ');
  code = code.replace(/^export\s+function\s+/gm, 'function ');
  code = code.replace(/^export\s+const\s+/gm, 'const ');
  return code;
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'listening-link-check-'));
try {
  const prevCache = process.env.CACHE_DIR;
  const prevAudio = process.env.LISTENING_AUDIO_DIR;
  process.env.CACHE_DIR = tmpRoot;
  process.env.LISTENING_AUDIO_DIR = path.join(tmpRoot, 'listening-audio');

  const historyCode = extractCode('src/app/api/session/listening-history.js');
  const historyCtx = vm.createContext({
    fs,
    path,
    os,
    createHash,
    randomUUID: (() => {
      let n = 0;
      return () => `00000000-0000-4000-8000-00000000000${++n}`;
    })(),
    process,
    Date,
    JSON,
    Error,
  });
  vm.runInContext(historyCode, historyCtx);

  const storageSrc = fs.readFileSync(appPath('src/app/api/session/storage.js'), 'utf8')
    .replace("import {archiveListening} from './listening-history';", '')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];\n?/gm, '')
    .replace(/^export\s+function\s+/gm, 'function ');
  const storageCtx = vm.createContext({
    fs,
    path,
    os,
    normalizeTargetLang,
    archiveListening: historyCtx.archiveListening,
    process,
    Date,
    JSON,
    Object,
    String,
  });
  vm.runInContext(storageSrc, storageCtx);

  const owner = 'account_' + 'a'.repeat(64);
  const otherOwner = 'account_' + 'b'.repeat(64);

  let fetchStub = async () => new Response(sampleBytes, { status: 200, headers: { 'content-length': String(sampleBytes.length) } });
  let currentOwner = owner;
  let uuidCounter = 0;

  class FakeNextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = init.headers || {};
    }
    static json(data, init = {}) {
      const cookies = new Map();
      return {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        cookies: { set: (k, v, o) => cookies.set(k, { value: v, ...o }), map: cookies },
      };
    }
  }

  const linkRouteCode = extractCode('src/app/api/listening-audio/link/route.js');
  const linkCtx = vm.createContext({
    NextResponse: FakeNextResponse,
    fs,
    path,
    os,
    randomUUID: () => `11111111-1111-4111-8111-11111111110${++uuidCounter}`,
    cacheOwner: () => currentOwner,
    saveSession: storageCtx.saveSession,
    history: historyCtx.history,
    normalizeTargetLang,
    fetch: (url, init) => fetchStub(url, init),
    AbortSignal,
    Buffer,
    URL,
    Number,
    Math,
    String,
    Date,
    JSON,
    Error,
    setTimeout,
    clearTimeout,
    DOMException,
    globalThis: {},
    process,
  });
  vm.runInContext(linkRouteCode, linkCtx);

  const fileRouteCode = extractCode('src/app/api/listening-audio/file/route.js');
  const fileCtx = vm.createContext({
    NextResponse: FakeNextResponse,
    history: historyCtx.history,
    cacheOwner: () => currentOwner,
    loadSession: storageCtx.loadSession,
    normalizeTargetLang,
    DEFAULT_LANGUAGE: 'vi',
    fs,
    path,
    os,
    URL,
    Number,
    Math,
    String,
    Date,
    process,
  });
  vm.runInContext(fileRouteCode, fileCtx);

  const makeStream = (chunks) => new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === 'string' ? Buffer.from(c) : c);
      controller.close();
    },
  });

  const mkReq = (body, { origin = 'https://english.nimtechnology.com', secFetchSite = 'same-origin', contentLength } = {}) => {
    let stream;
    let rawString = null;
    if (body instanceof ReadableStream) {
      stream = body;
    } else {
      rawString = typeof body === 'string' ? body : JSON.stringify(body);
      stream = makeStream([rawString]);
    }
    const headersMap = new Map([
      ['origin', origin],
      ['sec-fetch-site', secFetchSite],
    ]);
    if (contentLength !== undefined) {
      headersMap.set('content-length', String(contentLength));
    } else if (rawString !== null) {
      headersMap.set('content-length', String(Buffer.byteLength(rawString)));
    }
    return {
      url: 'https://english.nimtechnology.com/api/listening-audio/link',
      headers: { get: k => headersMap.get(k.toLowerCase()) ?? null },
      body: stream,
    };
  };

  // 1. Auth required before any fetch or body streaming
  currentOwner = null;
  let fetchCalled = false;
  fetchStub = async () => { fetchCalled = true; return new Response(sampleBytes, { status: 200 }); };
  assert.equal((await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3', targetLang: 'vi' }))).status, 401);
  assert.equal(fetchCalled, false);
  currentOwner = owner;

  // 2. Reject Sec-Fetch-Site cross-site
  const crossSiteRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3', targetLang: 'vi' }, { secFetchSite: 'cross-site' }));
  assert.equal(crossSiteRes.status, 403);

  // 3. Reject bounded request body > 4096 bytes via Content-Length precheck
  const bigReqHeader = await linkCtx.POST(mkReq(makeStream([Buffer.alloc(10)]), { contentLength: 5000 }));
  assert.equal(bigReqHeader.status, 413);

  // 4. Reject streamed request body > 4096 bytes without Content-Length
  const bigReqStream = await linkCtx.POST(mkReq(makeStream([Buffer.alloc(3000), Buffer.alloc(2000)]), { contentLength: undefined }));
  assert.equal(bigReqStream.status, 413);

  // 5. Reject URL not ending in .mp3, malformed percent-encoding, or non-ieltsextremes.com host
  for (const badUrl of [
    'https://evil.example/book14test1.mp3',
    'https://sub.ieltsextremes.com/book14test1.mp3',
    'http://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3',
    'https://ieltsextremes.com:8443/wp-content/uploads/2020/09/book14test1.mp3',
    'https://user:***@ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3',
    'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.wav',
    'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3%80', // invalid UTF-8 percent-encoding
    'https://ieltsextremes.com/wp-content/uploads/2020/09/%E0%A4%A', // truncated percent-encoding
  ]) {
    const r = await linkCtx.POST(mkReq({ url: badUrl, targetLang: 'vi' }));
    assert.equal(r.status, 400, `Expected 400 for ${badUrl}`);
    assert.equal(fetchCalled, false);
  }

  // 6. Reject redirects (302)
  fetchStub = async (url, init) => {
    assert.equal(init.redirect, 'manual');
    assert.equal(init.method, 'GET');
    assert.equal(init.headers, undefined);
    return new Response(null, { status: 302, headers: { location: 'https://evil.example/a.mp3' } });
  };
  const redirRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3', targetLang: 'vi' }));
  assert.equal(redirRes.status, 422);

  // 7. Reject empty remote.body without arrayBuffer fallback
  fetchStub = async () => ({
    status: 200,
    headers: { get: () => null },
    body: null,
  });
  const emptyBodyRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3', targetLang: 'vi' }));
  assert.equal(emptyBodyRes.status, 422);
  assert.equal(emptyBodyRes.data.error, 'Link không trả về dữ liệu audio');

  // 8. Reject too-large Content-Length (> 40 MiB)
  fetchStub = async () => new Response(makeStream([new Uint8Array([0x49, 0x44, 0x33])]), {
    status: 200,
    headers: { 'content-length': String(40 * 1024 * 1024 + 1) },
  });
  const bigHeaderRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/too-big.mp3', targetLang: 'vi' }));
  assert.equal(bigHeaderRes.status, 413);

  // 9. Reject streamed body > 40 MiB without Content-Length
  fetchStub = async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(21 * 1024 * 1024));
      controller.enqueue(new Uint8Array(20 * 1024 * 1024));
      controller.close();
    },
  }), { status: 200 });
  const bigStreamRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/stream-big.mp3', targetLang: 'vi' }));
  assert.equal(bigStreamRes.status, 413);

  // 10. Reject non-audio payload
  fetchStub = async () => new Response(makeStream(['<html>not mp3</html>']), { status: 200 });
  const nonAudioRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/not-audio.mp3', targetLang: 'vi' }));
  assert.equal(nonAudioRes.status, 422);

  // 11. Accept sample URL with real Nim sample MP3, persist, archive history, serve Range, enforce owner auth
  let observedInit;
  fetchStub = async (url, init) => {
    observedInit = { url, init };
    return new Response(makeStream([sampleBytes]), { status: 200, headers: { 'content-length': String(sampleBytes.length) } });
  };
  const okRes = await linkCtx.POST(mkReq({ url: 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3?dl=1', targetLang: 'vi' }));
  assert.equal(okRes.status, 200);
  assert.equal(observedInit.url, 'https://ieltsextremes.com/wp-content/uploads/2020/09/book14test1.mp3?dl=1');
  assert.equal(observedInit.init.redirect, 'manual');
  assert.equal(observedInit.init.method, 'GET');
  assert.equal(okRes.data.playbackOnly, true);
  assert.equal(okRes.data.audio.name, 'book14test1.mp3');
  assert.equal(okRes.data.audio.size, sampleBytes.length);
  assert(okRes.data.historyId, 'Should return specific historyId');

  // Verify history entry archived with playbackOnly and no transcript
  const rows = historyCtx.history(owner);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, okRes.data.historyId);
  assert.equal(rows[0].source, 'audio');
  assert.equal(rows[0].lesson.result, null);
  assert.equal(rows[0].lesson.playbackOnly, true);

  // Verify Range serving via existing /api/listening-audio/file route
  const rangeRes = await fileCtx.GET({
    url: `https://english.nimtechnology.com/api/listening-audio/file?targetLang=vi&history=${okRes.data.historyId}`,
    headers: { get: k => (k.toLowerCase() === 'range' ? 'bytes=0-15' : null) },
  });
  assert.equal(rangeRes.status, 206);
  assert.equal(rangeRes.headers['Content-Range'], `bytes 0-15/${sampleBytes.length}`);
  assert(Buffer.from(rangeRes.body).equals(sampleBytes.subarray(0, 16)));

  // Verify owner isolation on file route
  currentOwner = otherOwner;
  const otherRes = await fileCtx.GET({
    url: `https://english.nimtechnology.com/api/listening-audio/file?targetLang=vi&history=${okRes.data.historyId}`,
    headers: { get: () => null },
  });
  assert.equal(otherRes.status, 404);

  // 12. Verify Next route has NO unsupported named exports (only POST)
  const routeRaw = fs.readFileSync(appPath('src/app/api/listening-audio/link/route.js'), 'utf8');
  const exportMatches = [...routeRaw.matchAll(/export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([a-zA-Z0-9_$]+)/g)].map(m => m[1]);
  assert.deepEqual(exportMatches, ['POST'], 'Only export POST from Next.js route file');

  if (prevCache === undefined) delete process.env.CACHE_DIR; else process.env.CACHE_DIR = prevCache;
  if (prevAudio === undefined) delete process.env.LISTENING_AUDIO_DIR; else process.env.LISTENING_AUDIO_DIR = prevAudio;
  console.log('PASS check-listening-link.mjs: stream bounds, malformed url/non-mp3, Sec-Fetch-Site, no unsupported exports, sample MP3 verified.');
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
