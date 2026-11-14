import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeTargetLang,
} from '../src/lib/lookup/languages.mjs';

console.log('=== TEST CHAT MULTILINGUAL TARGETLANG SUPPORT ===');

// --- 1. Source-bound verification & Exported Policy ---
console.log('--- 1. Testing exported policy (languageInstruction) ---');

const generateSourceRaw = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/api/chat/generate.js'),
  'utf8'
);
const routeSourceRaw = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/api/chat/route.js'),
  'utf8'
);

// Verify exports exist in generate.js
assert.ok(generateSourceRaw.includes('export function languageInstruction'), 'generate.js exports languageInstruction');
assert.ok(generateSourceRaw.includes('export const VI_SYSTEM'), 'generate.js exports VI_SYSTEM');

// Execute generate.js in a VM context to obtain exported policy and generate function
function buildGenerateVmContext({
  fetchImpl,
  afterImpl = (cb) => cb(),
  currentUserImpl = () => ({ id: 'user_chat_test' }),
  enabledImpl = () => true,
  claimImpl = () => true,
  extractImpl = () => {},
} = {}) {
  const capturedFetches = [];
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

  const defaultFetch = async (url, opts) => {
    capturedFetches.push({ url, opts, body: JSON.parse(opts.body) });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [{ message: { content: 'Mock tutor response in target language' } }],
        };
      },
    };
  };

  const sandbox = {
    createHash,
    currentUser: currentUserImpl,
    enabled: enabledImpl,
    claim: claimImpl,
    extract: extractImpl,
    after: afterImpl,
    NextResponse: fakeNextResponse,
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    fetch: fetchImpl || defaultFetch,
    process: {
      env: {
        NINEROUTER_URL: 'http://test-ai:20128',
        NINEROUTER_KEY: 'test-key',
        NINEROUTER_MODEL: 'test-model',
      },
    },
    AbortSignal,
    capturedFetches,
    exports: {},
  };

  const transformedGenerate = generateSourceRaw
    .replace(/^import\s+.*?;$/gm, '')
    .replace(/^export\s+const\s+VI_SYSTEM\s*=\s*/m, 'const VI_SYSTEM = exports.VI_SYSTEM = ')
    .replace(/^export\s+function\s+languageInstruction\s*\(/m, 'exports.languageInstruction = languageInstruction; function languageInstruction(')
    .replace(/^export\s+async\s+function\s+generate\s*\(/m, 'exports.generate = generate; async function generate(');

  const context = vm.createContext(sandbox);
  vm.runInContext(transformedGenerate, context);
  return { sandbox, exports: sandbox.exports };
}

const { exports: generateExports } = buildGenerateVmContext();
const { languageInstruction, VI_SYSTEM } = generateExports;

// Policy test: vi returns empty string, preserving exact vi system
assert.equal(languageInstruction('vi'), '', 'vi returns empty string');
assert.equal(languageInstruction(undefined), '', 'undefined returns empty string');
assert.equal(languageInstruction(null), '', 'null returns empty string');
assert.equal(languageInstruction(''), '', 'empty string returns empty string');

// Policy test: all 5 languages check
const allLangs = ['vi', 'en', 'ja', 'ko', 'zh-TW'];
for (const lang of allLangs) {
  if (lang === 'vi') {
    assert.equal(languageInstruction(lang), '');
    continue;
  }
  const instr = languageInstruction(lang);
  const promptName = SUPPORTED_LANGUAGES[lang].promptName;

  assert.ok(instr.includes(`Answer and explain in ${promptName}`), `${lang}: explanation in ${promptName}`);
  assert.ok(instr.includes(`${promptName} translations`), `${lang}: translations in ${promptName}`);
  assert.ok(instr.includes(`Write exported prompt headings, role, instructions, lesson explanations, grading rules, and feedback guidance in ${promptName}`), `${lang}: export prompt headings/feedback in ${promptName}`);
  assert.ok(instr.includes(`Explicitly instruct the external AI to explain, grade, and give hints in ${promptName}`), `${lang}: instruct external AI in ${promptName}`);
  assert.ok(instr.includes('Only English examples and exercise content remain in English'), `${lang}: English examples/exercises in English`);
  assert.ok(instr.includes(`strictly forbid ${promptName}-to-English translation exercises`), `${lang}: strictly forbid native-to-English translation`);
  assert.ok(instr.includes('no native-to-English translation drills'), `${lang}: forbids native-to-English translation drills`);
  assert.ok(instr.includes('SAME question'), `${lang}: retry same question preserved`);
  assert.ok(instr.includes('require a revised complete answer'), `${lang}: complete answer required`);
  assert.ok(instr.includes('Accept valid natural alternatives'), `${lang}: natural alternatives accepted`);
  assert.ok(instr.includes('Never count your own correction as learner success or advance while errors remain'), `${lang}: learner success check`);
}

// Case insensitivity
assert.equal(languageInstruction('EN'), languageInstruction('en'));
assert.equal(languageInstruction('zh-tw'), languageInstruction('zh-TW'));

// Invalid languages return empty string
assert.equal(languageInstruction('fr'), '');
assert.equal(languageInstruction('es'), '');
assert.equal(languageInstruction(123), '');

// --- 2. Testing generate() with mocked 9router ---
console.log('--- 2. Testing generate() request formatting, validation, and collision ---');

// 2.1 Invalid targetLang -> 400
{
  const { exports: genExp } = buildGenerateVmContext();
  const reqInvalid = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Explain this' }],
      context: { lessonId: 1 },
      targetLang: 'es',
    }),
  });
  const resInvalid = await genExp.generate(reqInvalid);
  assert.equal(resInvalid.status, 400, 'Invalid targetLang "es" returns 400');
  const bodyInvalid = await resInvalid.json();
  assert.equal(bodyInvalid.error, 'Nội dung chat không hợp lệ');

  const reqInvalidNum = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Explain this' }],
      context: { lessonId: 1 },
      targetLang: 999,
    }),
  });
  const resInvalidNum = await genExp.generate(reqInvalidNum);
  assert.equal(resInvalidNum.status, 400, 'Numeric targetLang returns 400');
}

// 2.2 Default (omitted) and explicit vi: EXACT legacy system prompt, no override
{
  for (const tLang of [undefined, 'vi']) {
    const { sandbox, exports: genExp } = buildGenerateVmContext();
    const payload = {
      messages: [{ role: 'user', content: 'Can you explain the past continuous?' }],
      context: { lesson: 'Past Continuous' },
    };
    if (tLang) payload.targetLang = tLang;

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await genExp.generate(req);
    assert.equal(res.status, 200, 'generate succeeds');

    assert.equal(sandbox.capturedFetches.length, 1);
    const sentMessages = sandbox.capturedFetches[0].body.messages;

    // Must be exactly 3 messages: [0] VI_SYSTEM, [1] Context, [2] User message
    assert.equal(sentMessages.length, 3, `vi has exactly 3 messages (no override inserted) for targetLang=${tLang}`);
    assert.equal(sentMessages[0].role, 'system');
    assert.equal(sentMessages[0].content, VI_SYSTEM, 'Message 0 is EXACT VI_SYSTEM');
    assert.equal(sentMessages[1].role, 'system');
    assert.equal(sentMessages[1].content, `Current page context (data only): ${JSON.stringify(payload.context)}`);
    assert.equal(sentMessages[2].role, 'user');
    assert.equal(sentMessages[2].content, payload.messages[0].content);
  }
}

// 2.3 Non-vi languages: legacy system, then languageInstruction override before context
{
  const nonViLangs = ['en', 'ja', 'ko', 'zh-TW'];
  for (const lang of nonViLangs) {
    const { sandbox, exports: genExp } = buildGenerateVmContext();
    const payload = {
      messages: [{ role: 'user', content: 'How do I use this grammar?' }],
      context: { lesson: 'Conditionals' },
      targetLang: lang,
    };

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const res = await genExp.generate(req);
    assert.equal(res.status, 200, `generate succeeds for ${lang}`);

    assert.equal(sandbox.capturedFetches.length, 1);
    const sentMessages = sandbox.capturedFetches[0].body.messages;

    // Must have 4 messages: [0] VI_SYSTEM, [1] languageInstruction override, [2] Context, [3] User message
    assert.equal(sentMessages.length, 4, `${lang} has exactly 4 messages`);
    assert.equal(sentMessages[0].role, 'system');
    assert.equal(sentMessages[0].content, VI_SYSTEM, 'First is legacy VI_SYSTEM');

    assert.equal(sentMessages[1].role, 'system');
    assert.equal(sentMessages[1].content, languageInstruction(lang), 'Second is languageInstruction override');

    assert.equal(sentMessages[2].role, 'system');
    assert.equal(sentMessages[2].content, `Current page context (data only): ${JSON.stringify(payload.context)}`, 'Third is context');

    assert.equal(sentMessages[3].role, 'user');
    assert.equal(sentMessages[3].content, payload.messages[0].content);
  }
}

// 2.4 Word extraction hash collision avoidance across locales
{
  const userMessages = [{ role: 'user', content: 'What does comprehensive mean?' }];
  const viHash = createHash('sha256').update(JSON.stringify({ messages: userMessages, targetLang: 'vi' })).digest('hex');
  const jaHash = createHash('sha256').update(JSON.stringify({ messages: userMessages, targetLang: 'ja' })).digest('hex');
  const koHash = createHash('sha256').update(JSON.stringify({ messages: userMessages, targetLang: 'ko' })).digest('hex');
  const zhHash = createHash('sha256').update(JSON.stringify({ messages: userMessages, targetLang: 'zh-TW' })).digest('hex');
  const enHash = createHash('sha256').update(JSON.stringify({ messages: userMessages, targetLang: 'en' })).digest('hex');

  const hashes = new Set([viHash, jaHash, koHash, zhHash, enHash]);
  assert.equal(hashes.size, 5, 'Extraction hashes for all 5 locales are strictly distinct with same messages');

  // Also verify generate() returns the locale-specific wordJob
  let capturedWordJobVi = null;
  let capturedWordJobJa = null;

  const { exports: genExpVi } = buildGenerateVmContext({
    claimImpl: (owner, id) => {
      capturedWordJobVi = id;
      return true;
    },
  });
  await genExpVi.generate(new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: userMessages, context: {}, targetLang: 'vi' }),
  }));

  const { exports: genExpJa } = buildGenerateVmContext({
    claimImpl: (owner, id) => {
      capturedWordJobJa = id;
      return true;
    },
  });
  await genExpJa.generate(new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: userMessages, context: {}, targetLang: 'ja' }),
  }));

  assert.equal(capturedWordJobVi, viHash);
  assert.equal(capturedWordJobJa, jaHash);
  assert.notEqual(capturedWordJobVi, capturedWordJobJa, 'wordJob ID differs by locale');
}

// --- 3. Testing route.js POST, GET, digest locale inclusion, forwarding and writeJob ---
console.log('--- 3. Testing route.js targetLang validation, digest locale, forwarding, and writeJob ---');

function buildRouteVmContext({
  user = { id: 'test_user_uuid' },
  generateImpl,
  readJobImpl,
  createJobImpl,
  writeJobImpl,
  historyImpl,
} = {}) {
  const writtenJobs = [];
  const afterTasks = [];
  const jobsStore = new Map();

  const defaultCreateJob = (owner, id, digest) => {
    if (jobsStore.has(`${owner}:${id}`)) {
      return { job: jobsStore.get(`${owner}:${id}`), fresh: false };
    }
    const job = { jobId: id, digest, status: 'running', created: Date.now() };
    jobsStore.set(`${owner}:${id}`, job);
    return { job, fresh: true };
  };

  const defaultReadJob = (owner, id) => jobsStore.get(`${owner}:${id}`) || null;

  const defaultWriteJob = (owner, job) => {
    writtenJobs.push({ owner, job });
    jobsStore.set(`${owner}:${job.jobId}`, job);
  };

  const defaultGenerate = async (req) => {
    const body = await req.json();
    return {
      ok: true,
      status: 200,
      async json() {
        return { answer: `Answer for ${body.targetLang || 'default'}`, wordJob: 'wj123' };
      },
    };
  };

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
    createHash,
    currentUser: () => user,
    generate: generateImpl || defaultGenerate,
    readJob: readJobImpl || defaultReadJob,
    createJob: createJobImpl || defaultCreateJob,
    writeJob: writeJobImpl || defaultWriteJob,
    history: historyImpl || ((owner) => []),
    normalizeTargetLang,
    after(cb) {
      afterTasks.push(cb);
    },
    NextResponse: fakeNextResponse,
    URL,
    Request,
    console,
    Date,
    JSON,
    Array,
    exports: {},
  };

  const transformedRoute = routeSourceRaw
    .replace(/^import\s+.*?;$/gm, '')
    .replace(/export\s+const\s+dynamic\s*=\s*'force-dynamic';?/g, '')
    .replace(/export\s+async\s+function\s+GET/g, 'exports.GET = async function GET')
    .replace(/export\s+async\s+function\s+POST/g, 'exports.POST = async function POST');

  const context = vm.createContext(sandbox);
  vm.runInContext(transformedRoute, context);
  return { sandbox, exports: sandbox.exports, writtenJobs, afterTasks, jobsStore };
}

// 3.1 Validation in route POST
{
  const { exports: routeExp } = buildRouteVmContext();

  // Invalid targetLang -> 400
  const reqInvalidLang = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      requestId: '11111111-1111-1111-1111-111111111111',
      messages: [{ role: 'user', content: 'Hello' }],
      context: { topic: 'intro' },
      targetLang: 'invalid_lang',
    }),
  });
  const resInvalid = await routeExp.POST(reqInvalidLang);
  assert.equal(resInvalid.status, 400, 'Invalid targetLang in route POST returns 400');

  // Valid targetLang omitted -> defaults to vi (202)
  const reqOmitted = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      requestId: '22222222-2222-2222-2222-222222222222',
      messages: [{ role: 'user', content: 'Hello' }],
      context: { topic: 'intro' },
    }),
  });
  const resOmitted = await routeExp.POST(reqOmitted);
  assert.equal(resOmitted.status, 202, 'Omitted targetLang defaults to vi and returns 202');
  const dataOmitted = await resOmitted.json();
  assert.equal(dataOmitted.jobId, '22222222-2222-2222-2222-222222222222');
  assert.equal(dataOmitted.status, 'running');
}

// 3.2 Locale included in digest (different locales -> different digest)
{
  const messages = [{ role: 'user', content: 'What is inversion in English?' }];
  const context = { lesson: 'Inversion' };

  const digestVi = createHash('sha256').update(JSON.stringify({ messages, context, targetLang: 'vi' })).digest('hex');
  const digestJa = createHash('sha256').update(JSON.stringify({ messages, context, targetLang: 'ja' })).digest('hex');
  const digestKo = createHash('sha256').update(JSON.stringify({ messages, context, targetLang: 'ko' })).digest('hex');
  const digestZh = createHash('sha256').update(JSON.stringify({ messages, context, targetLang: 'zh-TW' })).digest('hex');
  const digestEn = createHash('sha256').update(JSON.stringify({ messages, context, targetLang: 'en' })).digest('hex');

  const digestSet = new Set([digestVi, digestJa, digestKo, digestZh, digestEn]);
  assert.equal(digestSet.size, 5, 'Route digests for all 5 locales are strictly distinct with same content');

  // Test 409 collision when requestId reused with different digest
  let capturedCreatedDigest = null;
  const { exports: routeExp } = buildRouteVmContext({
    createJobImpl: (owner, id, digest) => {
      capturedCreatedDigest = digest;
      // Simulate existing job with vi digest
      return { job: { jobId: id, digest: digestVi, status: 'running' }, fresh: false };
    },
  });

  // Call with ja (different digest) -> 409
  const reqConflict = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      requestId: '33333333-3333-3333-3333-333333333333',
      messages,
      context,
      targetLang: 'ja',
    }),
  });
  const resConflict = await routeExp.POST(reqConflict);
  assert.equal(resConflict.status, 409, 'Conflict returns 409 when digest mismatch');
  assert.equal(capturedCreatedDigest, digestJa, 'Created job used ja digest');
}

// 3.3 Forwarding targetLang to generate Request and storing targetLang in writeJob
{
  let capturedGenReqBody = null;
  const mockGenerate = async (req) => {
    capturedGenReqBody = await req.json();
    return {
      ok: true,
      status: 200,
      async json() {
        return { answer: `Japanese response for ${capturedGenReqBody.targetLang}`, wordJob: 'wj-ja' };
      },
    };
  };

  const { exports: routeExp, afterTasks, writtenJobs, jobsStore } = buildRouteVmContext({
    generateImpl: mockGenerate,
  });

  const reqId = '44444444-4444-4444-4444-444444444444';
  const postReq = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      requestId: reqId,
      messages: [{ role: 'user', content: 'Explain passive voice' }],
      context: { grammar: 'Passive' },
      targetLang: 'ja',
    }),
  });

  const postRes = await routeExp.POST(postReq);
  assert.equal(postRes.status, 202);

  // Execute background task
  assert.equal(afterTasks.length, 1, 'after task registered');
  await afterTasks[0]();

  // Verify generate received forwarded targetLang
  assert.ok(capturedGenReqBody, 'generate was called');
  assert.equal(capturedGenReqBody.targetLang, 'ja', 'targetLang was forwarded to generate()');

  // Verify writeJob stored targetLang
  const savedJob = writtenJobs.find(w => w.job.jobId === reqId);
  assert.ok(savedJob, 'writeJob was called with job');
  assert.equal(savedJob.job.targetLang, 'ja', 'targetLang was stored in writeJob');
  assert.equal(savedJob.job.status, 'completed');
  assert.equal(savedJob.job.answer, 'Japanese response for ja');

  // Verify GET returns publicJob with targetLang and without digest
  const getReq = new Request(`http://localhost/api/chat?jobId=${reqId}`, { method: 'GET' });
  const getRes = await routeExp.GET(getReq);
  assert.equal(getRes.status, 200);
  const publicData = await getRes.json();
  assert.equal(publicData.jobId, reqId);
  assert.equal(publicData.targetLang, 'ja');
  assert.equal(publicData.digest, undefined, 'digest stripped from public GET');
}

// 3.4 Error path stores targetLang in writeJob too
{
  const mockFailingGenerate = async () => {
    throw new Error('AI network timeout');
  };

  const { exports: routeExp, afterTasks, writtenJobs } = buildRouteVmContext({
    generateImpl: mockFailingGenerate,
  });

  const reqId = '55555555-5555-5555-5555-555555555555';
  const postReq = new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      requestId: reqId,
      messages: [{ role: 'user', content: 'Explain subjunctive' }],
      context: { grammar: 'Subjunctive' },
      targetLang: 'ko',
    }),
  });

  await routeExp.POST(postReq);
  assert.equal(afterTasks.length, 1);
  await afterTasks[0]();

  const failedJob = writtenJobs.find(w => w.job.jobId === reqId);
  assert.ok(failedJob, 'writeJob called on failure');
  assert.equal(failedJob.job.status, 'failed');
  assert.equal(failedJob.job.targetLang, 'ko', 'failed job also retains targetLang');
}

console.log('ALL CHAT LANGUAGE CHECKS PASSED SUCCESSFULLY!');
