import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

console.log('=== TEST checks/session-route-language.mjs ===');

const allLocales = ['vi', 'en', 'ja', 'ko', 'zh-TW'];

function extractCodeWithoutImports(sourcePath) {
  const fullCode = fs.readFileSync(sourcePath, 'utf8');
  return fullCode
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+(async\s+function|function|const|let|var)\s+/gm, '$1 ');
}

// --------------------------------------------------------------------------
// 1. Session route (GET & DELETE) tests
// --------------------------------------------------------------------------
const sessionRouteSrc = extractCodeWithoutImports(path.resolve('src/app/api/session/route.js'));

function createSessionRouteContext({
  owner = 'account_' + 'a'.repeat(64),
  loadSessionMock = () => null,
  deleteSessionMock = () => {},
  pronunciationMock = () => 'p-mock',
} = {}) {
  const cookiesDeleted = [];
  const fakeNextResponse = {
    json(data, init = {}) {
      const res = {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        cookies: {
          delete(name) {
            cookiesDeleted.push(name);
          },
        },
      };
      return res;
    },
  };

  const sandbox = {
    NextResponse: fakeNextResponse,
    cacheOwner: (req) => (owner === null ? null : owner),
    loadSession: loadSessionMock,
    deleteSession: deleteSessionMock,
    pronunciation: pronunciationMock,
    normalizeTargetLang,
    VALID_DELETE_TYPES: new Set(['vocab', 'grammar', 'writing', 'listening']),
    URL,
    Set,
    Number,
    Object,
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(sessionRouteSrc, context);
  return { context, cookiesDeleted };
}

// Check 1.1: Session GET/DELETE auth check
{
  const { context } = createSessionRouteContext({ owner: null });
  const req = { url: 'http://localhost/api/session' };
  const getRes = await context.GET(req);
  assert.equal(getRes.status, 401);
  assert.equal(getRes.headers['Cache-Control'], 'private, no-store');

  const delRes = await context.DELETE(req);
  assert.equal(delRes.status, 401);
}

// Check 1.2: Session GET invalid targetLang returns 400 before loadSession (no reads)
{
  let loadCalls = 0;
  const { context } = createSessionRouteContext({
    loadSessionMock: () => {
      loadCalls++;
      return {};
    },
  });
  const req = { url: 'http://localhost/api/session?targetLang=fr-FR' };
  const res = await context.GET(req);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
  assert.equal(loadCalls, 0, 'Must not read storage on invalid targetLang');
}

// Check 1.3: Session DELETE invalid targetLang returns 400 before deleteSession (no writes)
{
  let deleteCalls = 0;
  const { context } = createSessionRouteContext({
    deleteSessionMock: () => {
      deleteCalls++;
    },
  });
  const req = { url: 'http://localhost/api/session?targetLang=bad' };
  const res = await context.DELETE(req);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(deleteCalls, 0, 'Must not call deleteSession on invalid targetLang');
}

// Check 1.4: Session DELETE invalid type returns 400 before deleteSession
{
  let deleteCalls = 0;
  const { context } = createSessionRouteContext({
    deleteSessionMock: () => {
      deleteCalls++;
    },
  });
  const req = { url: 'http://localhost/api/session?targetLang=vi&type=invalid_type' };
  const res = await context.DELETE(req);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid session type');
  assert.equal(deleteCalls, 0);
}

// Check 1.5: Session GET & DELETE for all 5 locales + default vi when omitted
{
  for (const lang of allLocales) {
    let capturedLang;
    const { context } = createSessionRouteContext({
      loadSessionMock: (sid, l) => {
        capturedLang = l;
        return { words: [{ word: 'test' }] };
      },
    });
    const req = { url: `http://localhost/api/session?targetLang=${lang}` };
    const res = await context.GET(req);
    assert.equal(res.status, 200);
    assert.equal(capturedLang, lang);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  }

  // Default when targetLang omitted is 'vi'
  {
    let capturedLang;
    const { context } = createSessionRouteContext({
      loadSessionMock: (sid, l) => {
        capturedLang = l;
        return { words: [] };
      },
    });
    const req = { url: 'http://localhost/api/session' };
    const res = await context.GET(req);
    assert.equal(res.status, 200);
    assert.equal(capturedLang, 'vi');
  }

  // DELETE for each valid type + absent
  for (const type of ['vocab', 'grammar', 'writing', 'listening', '']) {
    let capturedArgs;
    const { context, cookiesDeleted } = createSessionRouteContext({
      deleteSessionMock: (sid, t, l) => {
        capturedArgs = { sid, t, l };
      },
    });
    const url = type
      ? `http://localhost/api/session?targetLang=ja&type=${type}`
      : `http://localhost/api/session?targetLang=ja`;
    const res = await context.DELETE({ url });
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
    assert.equal(capturedArgs.l, 'ja');
    assert.equal(capturedArgs.t, type || undefined);
    if (!type) {
      assert.ok(cookiesDeleted.includes('vocab_sid'));
    } else {
      assert.equal(cookiesDeleted.length, 0);
    }
  }
}

// Check 1.6: Manifest and pagination enrich contracts preserved
{
  const testData = {
    words: Array.from({ length: 25 }, (_, i) => ({ word: `w${i}` })),
    grammar: { title: 'G' },
    writing: { task: 'W' },
    listening: { title: 'L' },
  };

  // Manifest
  const { context: ctxManifest } = createSessionRouteContext({
    loadSessionMock: () => testData,
  });
  const mRes = await ctxManifest.GET({ url: 'http://localhost/api/session?targetLang=vi&type=manifest' });
  assert.equal(mRes.status, 200);
  assert.equal(mRes.data.available.vocab, true);
  assert.equal(mRes.data.available.grammar, true);
  assert.equal(mRes.data.available.writing, true);
  assert.equal(mRes.data.available.listening, true);
  assert.equal(mRes.headers['Cache-Control'], 'private, no-store');

  // Vocab pagination & pronunciation enrich
  const { context: ctxVocab } = createSessionRouteContext({
    loadSessionMock: () => ({ ...testData, words: testData.words.slice() }),
    pronunciationMock: (w) => `/${w}/`,
  });
  const vRes = await ctxVocab.GET({ url: 'http://localhost/api/session?targetLang=ko&type=vocab&offset=10' });
  assert.equal(vRes.status, 200);
  assert.equal(vRes.data.session.words.length, 10);
  assert.equal(vRes.data.session.words[0].word, 'w10');
  assert.equal(vRes.data.session.words[0].pronunciation, '/w10/');
  assert.equal(vRes.data.next, 20);
  assert.equal(vRes.data.total, 25);
  assert.equal(vRes.headers['Cache-Control'], 'private, no-store');
}

// --------------------------------------------------------------------------
// 2. lessons/routes.js sessionPayload tags contract
// --------------------------------------------------------------------------
console.log('\n--- PART 2: lessons/routes.js payload tags contract ---');
const lessonRoutesSrc = extractCodeWithoutImports(path.resolve('src/lib/lessons/routes.js'));

function evalLessonRoute(mode, { jobOwner, targetLang, jobResult = { ok: true }, images = ['img1', 'img2'] }) {
  let savedSessionCall = null;
  let scheduledFn = null;

  const sandbox = {
    lessonSpeech: () => [],
    saveSpeech: () => {},
    cacheOwner: () => jobOwner,
    NextResponse: {
      json: (d, init) => ({ data: d, status: init?.status || 200, cookies: { set() {} } }),
    },
    after: (fn) => {
      scheduledFn = fn;
    },
    randomUUID: () => 'uuid-1',
    getUploadedFile: () => ({ mime: 'image/png', buffer: Buffer.from('test') }),
    saveSession: (owner, payload) => {
      savedSessionCall = { owner, payload };
    },
    callJson: async () => ({}),
    runLesson: async (job) => {
      job.status = 'completed';
      job.result = jobResult;
    },
    normalizeTargetLang,
    DEFAULT_LANGUAGE,
    URL,
    Map,
    Date,
    globalThis: {},
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(lessonRoutesSrc, context);
  const routes = context.lessonRoutes(mode);

  return { routes, getScheduled: () => scheduledFn, getSaved: () => savedSessionCall };
}

// Test writing mode payload tags: writingTargetLang always set (even for vi), modelDraft: null, modelDraftTargetLang set, no global targetLang
{
  for (const lang of allLocales) {
    const { routes, getScheduled, getSaved } = evalLessonRoute('writing', {
      jobOwner: 'owner-w',
      targetLang: lang,
    });
    // Trigger POST
    await routes.POST({
      json: async () => ({ image1Id: 'a'.repeat(36) + '.png', targetLang: lang }),
    });
    const fn = getScheduled();
    assert.ok(fn);
    await fn();
    const saved = getSaved();
    assert.equal(saved.owner, 'owner-w');
    assert.equal(saved.payload.writingTargetLang, lang);
    assert.equal(saved.payload.modelDraft, null);
    assert.equal(saved.payload.modelDraftTargetLang, lang);
    assert.equal(saved.payload.targetLang, undefined, 'Old global targetLang must not be present');
  }
}

// Test grammar mode payload tags: grammarTargetLang always set, no global targetLang
{
  for (const lang of allLocales) {
    const { routes, getScheduled, getSaved } = evalLessonRoute('grammar', {
      jobOwner: 'owner-g',
      targetLang: lang,
    });
    await routes.POST({
      json: async () => ({ imageId: 'b'.repeat(36) + '.png', targetLang: lang }),
    });
    const fn = getScheduled();
    assert.ok(fn);
    await fn();
    const saved = getSaved();
    assert.equal(saved.owner, 'owner-g');
    assert.equal(saved.payload.grammarTargetLang, lang);
    assert.equal(saved.payload.targetLang, undefined, 'Old global targetLang must not be present');
  }
}

// --------------------------------------------------------------------------
// 3. analyze route payload tag always wordsTargetLang (including vi)
// --------------------------------------------------------------------------
console.log('\n--- PART 3: analyze route payload tag ---');
const analyzeSrc = fs.readFileSync(path.resolve('src/app/api/analyze/route.js'), 'utf8');
assert.ok(
  analyzeSrc.includes('wordsTargetLang: targetLang'),
  'analyze route must always include wordsTargetLang: targetLang unconditionally'
);
assert.ok(
  !analyzeSrc.includes('...(targetLang !== DEFAULT_LANGUAGE ? { wordsTargetLang: targetLang } : {})'),
  'analyze route must not conditionally set wordsTargetLang'
);

// --------------------------------------------------------------------------
// 4. listening-audio/file/route.js tests
// --------------------------------------------------------------------------
console.log('\n--- PART 4: listening-audio/file route tests ---');
const audioFileRouteSrc = extractCodeWithoutImports(path.resolve('src/app/api/listening-audio/file/route.js'));

function createAudioFileRouteContext({
  owner = 'account_' + 'c'.repeat(64),
  historyMock = () => [],
  loadSessionMock = () => null,
  fsMock = {},
} = {}) {
  const fakeNextResponse = class {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = init.headers || {};
    }
    static json(data, init = {}) {
      return { data, status: init.status || 200, headers: init.headers || {} };
    }
  };

  const sandbox = {
    NextResponse: fakeNextResponse,
    cacheOwner: () => owner,
    history: historyMock,
    loadSession: loadSessionMock,
    normalizeTargetLang,
    DEFAULT_LANGUAGE,
    fs: {
      existsSync: (p) => (fsMock.existsSync ? fsMock.existsSync(p) : false),
      readdirSync: (p) => (fsMock.readdirSync ? fsMock.readdirSync(p) : []),
      statSync: (p) => (fsMock.statSync ? fsMock.statSync(p) : { mtimeMs: Date.now(), size: 1000 }),
      readFileSync: (p) => (fsMock.readFileSync ? fsMock.readFileSync(p) : Buffer.from('audio-bytes')),
    },
    path,
    os,
    process: { env: {} },
    URL,
    Number,
    Math,
    String,
    Date,
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(audioFileRouteSrc, context);
  return context;
}

// Check 4.1: Auth check on audio file
{
  const ctx = createAudioFileRouteContext({ owner: null });
  const res = await ctx.GET({ url: 'http://localhost/api/listening-audio/file' });
  assert.equal(res.status, 401);
}

// Check 4.2: Invalid targetLang returns 400 before lookup
{
  let loadCalls = 0;
  const ctx = createAudioFileRouteContext({
    loadSessionMock: () => {
      loadCalls++;
      return null;
    },
  });
  const res = await ctx.GET({ url: 'http://localhost/api/listening-audio/file?targetLang=bad' });
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(loadCalls, 0);
}

// Check 4.3: Session audio lookup uses targetLang
{
  let queriedLang = null;
  const ctx = createAudioFileRouteContext({
    loadSessionMock: (sid, lang) => {
      queriedLang = lang;
      return { listening: { audio: { id: 'aud-1', type: 'audio/mpeg' } } };
    },
    fsMock: {
      existsSync: () => true,
      readdirSync: () => [`account_${'c'.repeat(64)}-aud-1.mp3`],
      statSync: () => ({ mtimeMs: Date.now(), size: 10 }),
      readFileSync: () => Buffer.from('1234567890'),
    },
  });
  const res = await ctx.GET({
    url: 'http://localhost/api/listening-audio/file?targetLang=ja',
    headers: { get: () => null },
  });
  assert.equal(queriedLang, 'ja');
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'audio/mpeg');
}

// Check 4.4: History retrieval verifies targetLang match and rejects mismatch as 404
{
  const historyEntries = [
    {
      id: 'hist-vi',
      lesson: {
        targetLang: 'vi',
        audio: { id: 'aud-vi', type: 'audio/mpeg' },
      },
    },
    {
      id: 'hist-ko',
      lesson: {
        result: { targetLang: 'ko' },
        audio: { id: 'aud-ko', type: 'audio/mpeg' },
      },
    },
  ];

  const ctx = createAudioFileRouteContext({
    historyMock: () => historyEntries,
    fsMock: {
      existsSync: () => true,
      readdirSync: () => [`account_${'c'.repeat(64)}-aud-vi.mp3`],
      statSync: () => ({ mtimeMs: Date.now(), size: 10 }),
      readFileSync: () => Buffer.from('1234567890'),
    },
  });

  // Query hist-vi with targetLang=vi -> match (200)
  const okRes = await ctx.GET({
    url: 'http://localhost/api/listening-audio/file?targetLang=vi&history=hist-vi',
    headers: { get: () => null },
  });
  assert.equal(okRes.status, 200);

  // Query hist-vi with targetLang=ja -> mismatch -> 404
  const mismatchRes = await ctx.GET({
    url: 'http://localhost/api/listening-audio/file?targetLang=ja&history=hist-vi',
    headers: { get: () => null },
  });
  assert.equal(mismatchRes.status, 404);

  // Query hist-ko with targetLang=ko -> match
  ctx.fs.readdirSync = () => [`account_${'c'.repeat(64)}-aud-ko.mp3`];
  const okKoRes = await ctx.GET({
    url: 'http://localhost/api/listening-audio/file?targetLang=ko&history=hist-ko',
    headers: { get: () => null },
  });
  assert.equal(okKoRes.status, 200);

  // Query hist-ko with targetLang=vi -> mismatch -> 404
  const mismatchKoRes = await ctx.GET({
    url: 'http://localhost/api/listening-audio/file?targetLang=vi&history=hist-ko',
    headers: { get: () => null },
  });
  assert.equal(mismatchKoRes.status, 404);
}

console.log('PASS checks/session-route-language.mjs: All session route language tests passed.');
