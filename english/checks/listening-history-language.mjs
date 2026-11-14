import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

const all5locales = Object.keys(SUPPORTED_LANGUAGES);
assert.deepEqual(all5locales.sort(), ['en', 'ja', 'ko', 'vi', 'zh-TW'].sort());

// --- 1. Client source contract checks ---
const historyCompSrc = fs.readFileSync(path.resolve('src/app/ListeningHistory.js'), 'utf8');
const titleCompSrc = fs.readFileSync(path.resolve('src/app/ListeningTitle.js'), 'utf8');

assert(historyCompSrc.includes('useLanguage()'), 'ListeningHistory uses useLanguage');
assert(historyCompSrc.includes('/api/listening-history?targetLang='), 'ListeningHistory load passes targetLang in query');
assert(historyCompSrc.includes('&targetLang='), 'ListeningHistory open passes targetLang in query');
assert(historyCompSrc.includes('toLocaleString(targetLang)'), 'ListeningHistory renders date with targetLang');

assert(titleCompSrc.includes('useLanguage()'), 'ListeningTitle uses useLanguage');
assert(titleCompSrc.includes('targetLang'), 'ListeningTitle sends targetLang in body');
assert(titleCompSrc.includes("method:'PATCH'"), 'ListeningTitle calls PATCH');

// --- 2. VM Route testing setup ---
function extractCodeWithoutImports(sourcePath) {
  const fullCode = fs.readFileSync(sourcePath, 'utf8');
  return fullCode
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+(async\s+function|function|const|let|var)\s+/gm, '$1 ');
}

const routeSrc = extractCodeWithoutImports(path.resolve('src/app/api/listening-history/route.js'));

function createRouteContext({
  owner = 'account_' + 'a'.repeat(64),
  sessionStore = {},
  historyRows = [],
} = {}) {
  let archiveCalls = 0;
  let historyCalls = 0;
  let renameCalls = 0;
  let loadCalls = 0;
  let saveCalls = 0;

  const fakeNextResponse = {
    json(data, init = {}) {
      return {
        data,
        status: init.status || 200,
        headers: init.headers || {},
      };
    },
  };

  const sandbox = {
    NextResponse: fakeNextResponse,
    cacheOwner: (req) => (owner === null ? null : owner),
    createHash,
    normalizeTargetLang,
    archiveListening: (o, lesson) => {
      archiveCalls++;
    },
    history: (o) => {
      historyCalls++;
      return historyRows;
    },
    renameListening: (o, id, title) => {
      renameCalls++;
      const row = historyRows.find(x => x.id === id);
      if (!row) return null;
      row.title = title;
      row.lesson = { ...row.lesson, title };
      return row;
    },
    loadSession: (o, loc) => {
      loadCalls++;
      return sessionStore[loc] || null;
    },
    saveSession: (o, data) => {
      saveCalls++;
      sessionStore[data.listeningTargetLang || 'vi'] = data;
    },
    URL,
    Set,
    Number,
    Object,
    JSON,
  };

  const context = vm.createContext(sandbox);
  vm.runInContext(routeSrc, context);
  return {
    context,
    getArchiveCalls: () => archiveCalls,
    getLoadCalls: () => loadCalls,
    getSaveCalls: () => saveCalls,
    getRenameCalls: () => renameCalls,
    getHistoryCalls: () => historyCalls,
  };
}

// --- 3. GET tests ---

// Auth 401
{
  const { context } = createRouteContext({ owner: null });
  const req = { url: 'http://localhost/api/listening-history?targetLang=vi' };
  const res = await context.GET(req);
  assert.equal(res.status, 401);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
}

// Invalid locale 400 BEFORE read/archive
{
  const { context, getArchiveCalls, getLoadCalls, getHistoryCalls } = createRouteContext();
  const req = { url: 'http://localhost/api/listening-history?targetLang=unsupported-xyz' };
  const res = await context.GET(req);
  assert.equal(res.status, 400);
  assert.equal(getArchiveCalls(), 0, 'archiveListening not called on invalid targetLang');
  assert.equal(getLoadCalls(), 0, 'loadSession not called on invalid targetLang');
  assert.equal(getHistoryCalls(), 0, 'history not called on invalid targetLang');
}

// All 5 locales work for GET
for (const loc of all5locales) {
  const rowId = randomUUID();
  const rows = [
    { id: rowId, title: 'Item ' + loc, lesson: { targetLang: loc }, createdAt: Date.now(), source: 'text' },
    { id: randomUUID(), title: 'Other lang', lesson: { targetLang: 'other' }, createdAt: Date.now(), source: 'text' },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  const req = { url: `http://localhost/api/listening-history?targetLang=${loc}` };
  const res = await context.GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.data.entries.length, 1);
  assert.equal(res.data.entries[0].id, rowId);
  assert.equal(res.data.entries[0].title, 'Item ' + loc);
}

// Omitted targetLang defaults to 'vi' (legacyvi)
{
  const viId = randomUUID();
  const legacyNoLangId = randomUUID();
  const enId = randomUUID();
  const rows = [
    { id: viId, title: 'Vi item', lesson: { targetLang: 'vi' }, createdAt: Date.now(), source: 'text' },
    { id: legacyNoLangId, title: 'Legacy item', lesson: {}, createdAt: Date.now(), source: 'text' },
    { id: enId, title: 'En item', lesson: { targetLang: 'en' }, createdAt: Date.now(), source: 'text' },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  const req = { url: 'http://localhost/api/listening-history' };
  const res = await context.GET(req);
  assert.equal(res.status, 200);
  assert.equal(res.data.entries.length, 2);
  const ids = res.data.entries.map(x => x.id);
  assert(ids.includes(viId));
  assert(ids.includes(legacyNoLangId));
  assert(!ids.includes(enId));
}

// Specific id GET: match vs 404
{
  const targetId = randomUUID();
  const rows = [
    { id: targetId, title: 'Target', lesson: { targetLang: 'ja' }, createdAt: Date.now(), source: 'text' },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  // Found
  const resFound = await context.GET({ url: `http://localhost/api/listening-history?targetLang=ja&id=${targetId}` });
  assert.equal(resFound.status, 200);
  assert.equal(resFound.data.entry.id, targetId);

  // Wrong locale id -> 404
  const resWrongLocale = await context.GET({ url: `http://localhost/api/listening-history?targetLang=ko&id=${targetId}` });
  assert.equal(resWrongLocale.status, 404);

  // Non-existent id -> 404
  const resNotFound = await context.GET({ url: `http://localhost/api/listening-history?targetLang=ja&id=${randomUUID()}` });
  assert.equal(resNotFound.status, 404);
}

// --- 4. PATCH tests ---

// Auth 401
{
  const { context } = createRouteContext({ owner: null });
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: new Map(),
    text: async () => JSON.stringify({ title: 'New', targetLang: 'vi' }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 401);
}

// Origin 403
{
  const { context } = createRouteContext();
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: {
      get: (h) => (h.toLowerCase() === 'origin' ? 'https://malicious-site.com' : null),
    },
    text: async () => JSON.stringify({ title: 'New', targetLang: 'vi' }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 403);
}

// Invalid locale 400 BEFORE read/archive/write
{
  const { context, getArchiveCalls, getLoadCalls, getRenameCalls, getSaveCalls } = createRouteContext();
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ title: 'Valid Title', targetLang: 'invalid-lang' }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 400);
  assert.equal(getArchiveCalls(), 0);
  assert.equal(getLoadCalls(), 0);
  assert.equal(getRenameCalls(), 0);
  assert.equal(getSaveCalls(), 0);
}

// All 5 locales support PATCH
for (const loc of all5locales) {
  const rowId = randomUUID();
  const lessonObj = { title: 'Old Title', targetLang: loc, sentences: [{ en: 'Hi', [loc]: 'Val' }] };
  const rows = [
    { id: rowId, key: 'mock-key', title: 'Old Title', lesson: lessonObj, createdAt: Date.now() },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ id: rowId, title: 'Renamed ' + loc, targetLang: loc }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 200);
  assert.equal(res.data.title, 'Renamed ' + loc);
  assert.equal(res.data.id, rowId);
}

// Omitted targetLang in PATCH defaults to 'vi'
{
  const rowId = randomUUID();
  const rows = [
    { id: rowId, key: 'mock-key', title: 'Old Vi', lesson: { targetLang: 'vi' }, createdAt: Date.now() },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ id: rowId, title: 'Renamed Vi' }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 200);
  assert.equal(res.data.title, 'Renamed Vi');
}

// Wrong locale id -> 404
{
  const rowId = randomUUID();
  const rows = [
    { id: rowId, key: 'mock-key', title: 'Old Title', lesson: { targetLang: 'ko' }, createdAt: Date.now() },
  ];
  const { context } = createRouteContext({ historyRows: rows });
  const req = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ id: rowId, title: 'New Title', targetLang: 'zh-TW' }),
  };
  const res = await context.PATCH(req);
  assert.equal(res.status, 404);
}

// Current rename persists listeningTargetLang; non-current rename doesn't replace session
{
  const currentLesson = { title: 'Active Lesson', targetLang: 'en', sentences: [{ en: 'Hi' }] };
  const currentKey = createHash('sha256').update(JSON.stringify(currentLesson)).digest('hex');
  const currentId = randomUUID();
  const oldLesson = { title: 'Old Archived Lesson', targetLang: 'en', sentences: [{ en: 'Bye' }] };
  const oldKey = createHash('sha256').update(JSON.stringify(oldLesson)).digest('hex');
  const oldId = randomUUID();

  const historyRows = [
    { id: currentId, key: currentKey, title: 'Active Lesson', lesson: currentLesson, createdAt: Date.now() },
    { id: oldId, key: oldKey, title: 'Old Archived Lesson', lesson: oldLesson, createdAt: Date.now() - 1000 },
  ];

  const sessionStore = {
    en: { listening: currentLesson, listeningTargetLang: 'en' },
  };

  const { context, getSaveCalls } = createRouteContext({ sessionStore, historyRows });

  // 1. Non-current rename: rename oldId
  const reqNonCurrent = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ id: oldId, title: 'Old Lesson Renamed', targetLang: 'en' }),
  };
  const resNonCurrent = await context.PATCH(reqNonCurrent);
  assert.equal(resNonCurrent.status, 200);
  assert.equal(resNonCurrent.data.title, 'Old Lesson Renamed');
  assert.equal(getSaveCalls(), 0, "noncurrent rename doesn't save session");
  assert.equal(sessionStore.en.listening.title, 'Active Lesson', "active session is unchanged");

  // 2. Current rename: rename currentId
  const reqCurrent = {
    url: 'http://localhost/api/listening-history',
    headers: { get: () => null },
    text: async () => JSON.stringify({ id: currentId, title: 'Active Lesson Renamed', targetLang: 'en' }),
  };
  const resCurrent = await context.PATCH(reqCurrent);
  assert.equal(resCurrent.status, 200);
  assert.equal(resCurrent.data.title, 'Active Lesson Renamed');
  assert.equal(getSaveCalls(), 1, "current rename persists session");
  assert.equal(sessionStore.en.listeningTargetLang, 'en', "persists listeningTargetLang");
  assert.equal(sessionStore.en.listening.title, 'Active Lesson Renamed');
}

console.log('PASS checks/listening-history-language.mjs');
