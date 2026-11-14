import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createHash, randomUUID } from 'node:crypto';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeTargetLang,
} from '../src/lib/lookup/languages.mjs';

console.log('=== TEST CHAT HISTORY LANGUAGE ISOLATION ===');

// --- 1. Test jobs.js with temp CACHE_DIR and real files ---
const tempBase = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-hist-test-'));
process.env.CACHE_DIR = tempBase;

const jobsModulePath = path.resolve(process.cwd(), 'src/app/api/chat/jobs.js');
const jobsModule = await import(jobsModulePath);
const { history, readJob, writeJob, createJob } = jobsModule;

const userA = 'user_alice_123';
const userB = 'user_bob_456';

const allLocales = ['vi', 'en', 'ja', 'ko', 'zh-TW'];
const seededJobsA = {};

// 1.1 Seed completed jobs for all 5 locales + legacy vi without targetLang field
const baseTime = Date.now() - 3600000;
let createdCounter = 0;

// Legacy job (no targetLang field) -> must be treated as 'vi'
const legacyJobId = randomUUID();
const legacyJob = {
  jobId: legacyJobId,
  digest: 'digest-legacy',
  status: 'completed',
  created: baseTime + 1000,
  // targetLang omitted
  question: 'Legacy question',
  answer: 'Legacy answer',
};
writeJob(userA, legacyJob);

for (const locale of allLocales) {
  const jobId = randomUUID();
  const created = baseTime + 2000 + (createdCounter += 1000);
  const job = {
    jobId,
    digest: `digest-${locale}`,
    status: 'completed',
    created,
    targetLang: locale,
    question: `Question for ${locale}`,
    answer: `Answer for ${locale}`,
  };
  writeJob(userA, job);
  seededJobsA[locale] = job;
}

// Running job for vi -> must be excluded from history
const runningJobId = randomUUID();
writeJob(userA, {
  jobId: runningJobId,
  digest: 'digest-running',
  status: 'running',
  created: Date.now(),
  targetLang: 'vi',
  question: 'Running question',
});

// Failed job for vi -> must be excluded from history
const failedJobId = randomUUID();
writeJob(userA, {
  jobId: failedJobId,
  digest: 'digest-failed',
  status: 'failed',
  created: Date.now(),
  targetLang: 'vi',
  question: 'Failed question',
  error: 'AI failed',
});

// Seed userB jobs to test owner isolation
const userBJobId = randomUUID();
writeJob(userB, {
  jobId: userBJobId,
  digest: 'digest-userB',
  status: 'completed',
  created: Date.now(),
  targetLang: 'vi',
  question: 'Bob question',
  answer: 'Bob answer',
});

// Verify history isolation for all 5 locales for userA
console.log('--- 1.1 Verifying jobs.history() for userA across locales ---');

// vi should return legacyJob + seededJobsA['vi'] in created order, and exclude running/failed
const histVi = history(userA, 'vi');
assert.equal(histVi.length, 4, 'vi history contains exactly 2 jobs (4 messages: 2 user + 2 assistant)');
assert.equal(histVi[0].id, `${legacyJobId}-user`);
assert.equal(histVi[1].id, `${legacyJobId}-assistant`);
assert.equal(histVi[2].id, `${seededJobsA.vi.jobId}-user`);
assert.equal(histVi[3].id, `${seededJobsA.vi.jobId}-assistant`);

// default call without targetLang arg defaults to 'vi'
const histDefault = history(userA);
assert.deepEqual(histDefault, histVi, 'default history(userA) matches history(userA, "vi")');

// Other locales should each return only their respective job
for (const loc of ['en', 'ja', 'ko', 'zh-TW']) {
  const h = history(userA, loc);
  assert.equal(h.length, 2, `${loc} history contains exactly 1 job (2 messages)`);
  assert.equal(h[0].id, `${seededJobsA[loc].jobId}-user`);
  assert.equal(h[0].content, `Question for ${loc}`);
  assert.equal(h[1].id, `${seededJobsA[loc].jobId}-assistant`);
  assert.equal(h[1].content, `Answer for ${loc}`);
}

// Case-insensitivity check (e.g. 'EN' or 'zh-tw')
const histUpperEn = history(userA, 'EN');
assert.deepEqual(histUpperEn, history(userA, 'en'), 'history handles uppercase EN');
const histLowerZh = history(userA, 'zh-tw');
assert.deepEqual(histLowerZh, history(userA, 'zh-TW'), 'history handles lowercase zh-tw');

// Owner isolation check: userB history does not leak to userA, and userA history does not leak to userB
console.log('--- 1.2 Verifying owner isolation in history() ---');
const histBobVi = history(userB, 'vi');
assert.equal(histBobVi.length, 2, 'userB vi history contains only userB job');
assert.equal(histBobVi[0].id, `${userBJobId}-user`);
assert.equal(histBobVi[0].content, 'Bob question');

// Verify polling/job lookup is unchanged and owner-isolated
const readBobJobFromAlice = readJob(userA, userBJobId);
assert.equal(readBobJobFromAlice, null, 'userA cannot read userB job via readJob');
const readBobJobFromBob = readJob(userB, userBJobId);
assert.ok(readBobJobFromBob, 'userB can read their own job');
assert.equal(readBobJobFromBob.jobId, userBJobId);

// Invalid targetLang throws in history()
console.log('--- 1.3 Verifying invalid targetLang throws in history() ---');
assert.throws(() => history(userA, 'es'), /Invalid targetLang/, 'invalid locale "es" throws');
assert.throws(() => history(userA, 'invalid'), /Invalid targetLang/, 'invalid locale throws');
assert.throws(() => history(userA, 123), /Invalid targetLang/, 'non-string locale throws');

// Cleanup temp dir
fs.rmSync(tempBase, { recursive: true, force: true });

// --- 2. Test route.js GET history query, validation, and auth ---
console.log('--- 2. Testing route.js GET /api/chat history endpoint ---');

const routeSourceRaw = fs.readFileSync(path.resolve(process.cwd(), 'src/app/api/chat/route.js'), 'utf8');

function buildRouteVmContext({ user = { id: 'test_route_user' }, historyImpl, readJobImpl } = {}) {
  const fakeNextResponse = {
    json(data, init = {}) {
      return {
        status: init.status || 200,
        headers: init.headers || {},
        async json() {
          return data;
        },
      };
    },
  };

  const sandbox = {
    currentUser: () => user,
    generate: async () => ({ ok: true, json: async () => ({}) }),
    readJob: readJobImpl || (() => null),
    createJob: () => ({ job: {}, fresh: true }),
    writeJob: () => {},
    history: historyImpl || ((owner, lang) => [{ id: `msg-${owner}-${lang}`, role: 'user', content: `hi-${lang}` }]),
    normalizeTargetLang,
    after: () => {},
    NextResponse: fakeNextResponse,
    URL,
    Request,
    console,
    exports: {},
  };

  const transformedRoute = routeSourceRaw
    .replace(/^import\s+.*?;$/gm, '')
    .replace(/export\s+const\s+dynamic\s*=\s*'force-dynamic';?/g, '')
    .replace(/export\s+async\s+function\s+GET/g, 'exports.GET = async function GET')
    .replace(/export\s+async\s+function\s+POST/g, 'exports.POST = async function POST');

  const context = vm.createContext(sandbox);
  vm.runInContext(transformedRoute, context);
  return { sandbox, exports: sandbox.exports };
}

// 2.1 Unauthenticated returns 401
{
  const { exports: routeExp } = buildRouteVmContext({ user: null });
  const req = new Request('http://localhost/api/chat?history=1&targetLang=vi', { method: 'GET' });
  const res = await routeExp.GET(req);
  assert.equal(res.status, 401, 'Unauthenticated history returns 401');
}

// 2.2 Invalid targetLang returns 400 without reading history
{
  let historyCalled = false;
  const { exports: routeExp } = buildRouteVmContext({
    historyImpl: () => {
      historyCalled = true;
      return [];
    },
  });
  const req = new Request('http://localhost/api/chat?history=1&targetLang=french', { method: 'GET' });
  const res = await routeExp.GET(req);
  assert.equal(res.status, 400, 'Invalid targetLang returns 400');
  assert.equal(historyCalled, false, 'history() was not called on invalid targetLang');
  const body = await res.json();
  assert.equal(body.error, 'Invalid targetLang');
}

// 2.3 Valid targetLang forwarded properly
{
  const testCases = [
    { query: '', expectedLang: 'vi' },
    { query: '&targetLang=vi', expectedLang: 'vi' },
    { query: '&targetLang=ja', expectedLang: 'ja' },
    { query: '&targetLang=KO', expectedLang: 'ko' },
    { query: '&targetLang=zh-tw', expectedLang: 'zh-TW' },
  ];

  for (const tc of testCases) {
    let capturedOwner = null;
    let capturedLang = null;
    const { exports: routeExp } = buildRouteVmContext({
      user: { id: 'user_ctx_999' },
      historyImpl: (owner, lang) => {
        capturedOwner = owner;
        capturedLang = lang;
        return [{ id: 'mock-1', role: 'user', content: 'mock' }];
      },
    });

    const req = new Request(`http://localhost/api/chat?history=1${tc.query}`, { method: 'GET' });
    const res = await routeExp.GET(req);
    assert.equal(res.status, 200, `history query "${tc.query}" returns 200`);
    assert.equal(capturedOwner, 'user_ctx_999');
    assert.equal(capturedLang, tc.expectedLang, `targetLang normalized to ${tc.expectedLang}`);
    const data = await res.json();
    assert.equal(data.retentionDays, 7);
    assert.equal(data.messages.length, 1);
  }
}

// 2.4 Job polling remains intact
{
  const sampleJob = { jobId: '11111111-1111-1111-1111-111111111111', status: 'completed', targetLang: 'ja', digest: 'secret' };
  const { exports: routeExp } = buildRouteVmContext({
    readJobImpl: (owner, id) => (id === sampleJob.jobId ? sampleJob : null),
  });

  const req = new Request(`http://localhost/api/chat?jobId=${sampleJob.jobId}`, { method: 'GET' });
  const res = await routeExp.GET(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.jobId, sampleJob.jobId);
  assert.equal(data.digest, undefined, 'digest stripped');
  assert.equal(data.targetLang, 'ja');
}

console.log('ALL CHAT HISTORY LANGUAGE CHECKS PASSED!');
