import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

console.log('=== TEST LISTENING ROUTES (SOURCE-BOUND MOCKED EVAL) ===');

// --- HELPER TO EXTRACT ROUTE CODE WITHOUT IMPORTS ---
function extractCodeWithoutImports(sourcePath) {
  const fullCode = fs.readFileSync(sourcePath, 'utf8');
  // strip all import ... from ... statements and export keywords
  const stripped = fullCode
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+(async\s+function|function|const|let|var)\s+/gm, '$1 ');
  return stripped;
}

// ----------------------------------------------------
// PART 1: checks on src/app/api/listening-text/route.js
// ----------------------------------------------------
console.log('\n--- PART 1: listening-text route ---');

const textRouteSource = extractCodeWithoutImports(
  path.resolve(process.cwd(), 'src/app/api/listening-text/route.js')
);

function createMockTextRouteContext({ callJsonImpl, saveSessionImpl, owner = 'user-text-1' } = {}) {
  const responses = [];
  const fakeNextResponse = {
    json(data, init = {}) {
      const res = {
        data,
        status: init.status || 200,
        headers: init.headers || {},
      };
      responses.push(res);
      return res;
    },
  };

  const context = {
    NextResponse: fakeNextResponse,
    cacheOwner: () => owner,
    saveSession: saveSessionImpl || (() => {}),
    callJson: callJsonImpl || (async () => ({ translations: [] })),
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    URL,
    JSON,
    Array,
    String,
    Error,
    console,
  };

  vm.createContext(context);
  vm.runInContext(
    `${textRouteSource}\n; globalThis.POST = POST;`,
    context
  );

  return {
    POST: context.POST,
  };
}

// 1.1 POST vi/default, en, ja, ko, zh-TW
for (const lang of ['vi', 'default', 'en', 'ja', 'ko', 'zh-TW']) {
  const callJsonCalls = [];
  const savedSessions = [];
  const mockCallJson = async (prompt, opts) => {
    callJsonCalls.push({ prompt, opts });
    return {
      translations: ['Bản dịch câu 1', 'Bản dịch câu 2'],
    };
  };
  const mockSaveSession = (owner, data) => {
    savedSessions.push({ owner, data });
  };

  const { POST } = createMockTextRouteContext({
    callJsonImpl: mockCallJson,
    saveSessionImpl: mockSaveSession,
  });

  const payload = {
    title: 'Bài nghe từ văn bản',
    targetLang: lang === 'default' ? undefined : lang,
    sentences: [
      { en: 'First sentence here.', vi: 'dich 1' },
      { en: 'Second sentence here.', vi: 'dich 2' },
    ],
  };

  const fakeReq = {
    headers: new Map([['origin', 'https://english.nimtechnology.com']]),
    url: 'https://english.nimtechnology.com/api/listening-text',
    text: async () => JSON.stringify(payload),
  };

  const res = await POST(fakeReq);
  assert.equal(res.status, 200, `POST for lang ${lang} status 200`);
  assert.ok(res.data.lesson, `POST for lang ${lang} returns lesson`);
  const expectedLang = lang === 'default' ? 'vi' : lang;
  assert.equal(res.data.lesson.targetLang, expectedLang, `lesson has targetLang ${expectedLang}`);

  // Check saved session
  assert.equal(savedSessions.length, 1);
  assert.equal(savedSessions[0].data.listeningTargetLang, expectedLang);
  assert.equal(savedSessions[0].data.listening.targetLang, expectedLang);

  if (lang === 'en') {
    assert.equal(callJsonCalls.length, 0, 'en requires no callJson call');
    assert.equal(res.data.lesson.sentences[0].vi, 'First sentence here.');
    assert.equal(res.data.lesson.sentences[1].vi, 'Second sentence here.');
  } else {
    assert.equal(callJsonCalls.length, 1, `${lang} made 1 callJson call`);
    const prompt = callJsonCalls[0].prompt;
    if (expectedLang === 'vi') {
      assert.ok(prompt.includes('Translate each English sentence to Vietnamese.'));
    } else {
      const promptName = SUPPORTED_LANGUAGES[expectedLang].promptName;
      assert.ok(prompt.includes(`Translate each English sentence to ${promptName}.`));
    }
  }

  // Check original en unchanged
  assert.equal(res.data.lesson.sentences[0].en, 'First sentence here.');
  assert.equal(res.data.lesson.sentences[1].en, 'Second sentence here.');
}

// 1.2 Invalid locale -> 400
{
  const { POST } = createMockTextRouteContext();
  const payload = {
    title: 'Bài nghe từ văn bản',
    targetLang: 'invalid_locale_xyz',
    sentences: [{ en: 'Hello world.', vi: 'Xin chao' }],
  };
  const fakeReq = {
    headers: new Map(),
    url: 'https://english.nimtechnology.com/api/listening-text',
    text: async () => JSON.stringify(payload),
  };
  const res = await POST(fakeReq);
  assert.equal(res.status, 400, 'invalid locale gives 400');
  assert.equal(res.data.error, 'Invalid targetLang');
}

// 1.3 Count mismatch -> 500
{
  const mockCallJson = async () => ({
    translations: ['Only one translation returned'],
  });
  const { POST } = createMockTextRouteContext({ callJsonImpl: mockCallJson });
  const payload = {
    title: 'Bài nghe từ văn bản',
    targetLang: 'vi',
    sentences: [
      { en: 'First sentence here.', vi: 'dich 1' },
      { en: 'Second sentence here.', vi: 'dich 2' },
    ],
  };
  const fakeReq = {
    headers: new Map(),
    url: 'https://english.nimtechnology.com/api/listening-text',
    text: async () => JSON.stringify(payload),
  };
  const res = await POST(fakeReq);
  assert.equal(res.status, 500, 'translation count mismatch gives 500');
  assert.equal(res.data.error, 'Không lưu được bài nghe từ văn bản');
}

// 1.4 Empty translation -> 500
{
  const mockCallJson = async () => ({
    translations: ['   ', 'Valid translation'],
  });
  const { POST } = createMockTextRouteContext({ callJsonImpl: mockCallJson });
  const payload = {
    title: 'Bài nghe từ văn bản',
    targetLang: 'vi',
    sentences: [
      { en: 'First sentence here.', vi: 'dich 1' },
      { en: 'Second sentence here.', vi: 'dich 2' },
    ],
  };
  const fakeReq = {
    headers: new Map(),
    url: 'https://english.nimtechnology.com/api/listening-text',
    text: async () => JSON.stringify(payload),
  };
  const res = await POST(fakeReq);
  assert.equal(res.status, 500, 'empty translation gives 500');
  assert.equal(res.data.error, 'Không lưu được bài nghe từ văn bản');
}

console.log('PASS listening-text route checks');


// ----------------------------------------------------
// PART 2: checks on src/app/api/listening-audio/route.js
// ----------------------------------------------------
console.log('\n--- PART 2: listening-audio route ---');

const audioRouteSource = extractCodeWithoutImports(
  path.resolve(process.cwd(), 'src/app/api/listening-audio/route.js')
);

function createMockAudioRouteContext({ callJsonImpl, saveSessionImpl, owner = 'user-audio-1', writeFileSyncImpl, mkdirSyncImpl } = {}) {
  const afterCallbacks = [];
  const fakeNextResponse = {
    json(data, init = {}) {
      const cookiesMap = new Map();
      const res = {
        data,
        status: init.status || 200,
        headers: init.headers || {},
        cookies: {
          set(k, v, opts) {
            cookiesMap.set(k, { value: v, ...opts });
          },
        },
      };
      return res;
    },
  };

  const context = {
    NextResponse: fakeNextResponse,
    after: (fn) => {
      afterCallbacks.push(fn);
    },
    cacheOwner: () => owner,
    saveSession: saveSessionImpl || (() => {}),
    callJson: callJsonImpl || (async () => ({})),
    validateTimedTranscript: (data) => {
      // return default timed segments if mock passes
      if (data && data.segments) return data.segments.map(s => ({ en: s.text, speaker: s.speaker, start: s.start, end: s.end }));
      return [
        { en: 'Speech one.', speaker: 'Speaker 1', start: 0.0, end: 2.5 },
        { en: 'Speech two.', speaker: 'Speaker 2', start: 2.8, end: 5.1 },
      ];
    },
    normalizeTargetLang,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    fs: {
      mkdirSync: mkdirSyncImpl || (() => {}),
      writeFileSync: writeFileSyncImpl || (() => {}),
      readdirSync: () => [],
      statSync: () => ({ mtimeMs: Date.now() }),
      unlinkSync: () => {},
    },
    path: {
      join: (...parts) => parts.join('/'),
    },
    os: {
      tmpdir: () => '/tmp',
    },
    randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9),
    Buffer,
    File: globalThis.File || class File {},
    FormData: globalThis.FormData,
    Date,
    Map,
    URL,
    Array,
    String,
    Error,
    console,
    process: {
      env: {
        LISTENING_AUDIO_DIR: '/tmp/test-audio',
      },
    },
    globalThis: {
      listeningAudioJobs: new Map(),
    },
  };

  vm.createContext(context);
  vm.runInContext(
    `${audioRouteSource}\n; globalThis.POST = POST; globalThis.GET = GET;`,
    context
  );

  return {
    POST: context.POST,
    GET: context.GET,
    jobs: context.globalThis.listeningAudioJobs,
    runAfter: async () => {
      while (afterCallbacks.length > 0) {
        const cb = afterCallbacks.shift();
        await cb();
      }
    },
  };
}

// Helper to create a fake valid MP3 File
function makeFakeAudioFile(name = 'sample.mp3', size = 1024) {
  const buf = Buffer.alloc(size);
  // MP3 ID3 header: 'ID3'
  buf[0] = 0x49; // 'I'
  buf[1] = 0x44; // 'D'
  buf[2] = 0x33; // '3'
  return new File([buf], name, { type: 'audio/mpeg' });
}

// 2.1 Validate invalid targetLang BEFORE writeFileSync
{
  let writtenFiles = 0;
  const { POST } = createMockAudioRouteContext({
    writeFileSyncImpl: () => { writtenFiles++; },
  });

  const form = new FormData();
  form.append('targetLang', 'invalid_language_code');
  form.append('file', makeFakeAudioFile());

  const req = {
    formData: async () => form,
  };

  const res = await POST(req);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
  assert.equal(writtenFiles, 0, 'No file written on invalid targetLang');
}

// 2.2 Validate invalid file BEFORE writeFileSync
{
  let writtenFiles = 0;
  const { POST } = createMockAudioRouteContext({
    writeFileSyncImpl: () => { writtenFiles++; },
  });

  const form = new FormData();
  form.append('targetLang', 'vi');
  // corrupt file: not mp3/wav/m4a
  const buf = Buffer.alloc(100);
  buf.fill(0);
  const badFile = new File([buf], 'corrupt.mp3', { type: 'audio/mpeg' });
  form.append('file', badFile);

  const req = {
    formData: async () => form,
  };

  const res = await POST(req);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Chọn MP3, M4A hoặc WAV hợp lệ');
  assert.equal(writtenFiles, 0, 'No file written on invalid audio header');
}

// 2.3 Successful POST and transcription + translation for en vs others
// en only 1 call vs others 2 calls; timing + speaker retained
for (const lang of ['en', 'vi', 'ja', 'ko', 'zh-TW']) {
  const callJsonCalls = [];
  const savedSessions = [];
  let fileWritten = false;

  const mockCallJson = async (input, opts) => {
    callJsonCalls.push({ input, opts });
    if (opts.stage === 'transcribe-audio') {
      return {
        segments: [
          { speaker: 'Narrator', start: 1.0, end: 3.5, text: 'Welcome to the test.' },
          { speaker: 'Alice', start: 3.8, end: 6.2, text: 'Hello everyone.' },
        ],
      };
    }
    if (opts.stage === 'translate-audio') {
      return {
        translations: ['Chào mừng đến bài test.', 'Chào mọi người.'],
      };
    }
    return {};
  };

  const { POST, jobs, runAfter } = createMockAudioRouteContext({
    callJsonImpl: mockCallJson,
    saveSessionImpl: (owner, data) => savedSessions.push({ owner, data }),
    writeFileSyncImpl: () => { fileWritten = true; },
  });

  const form = new FormData();
  form.append('targetLang', lang);
  form.append('file', makeFakeAudioFile('speech.mp3'));

  const req = {
    formData: async () => form,
  };

  const res = await POST(req);
  assert.equal(res.status, 202);
  assert.ok(res.data.jobId);
  assert.ok(fileWritten, 'File written on valid request');

  const jobId = res.data.jobId;
  const job = jobs.get(jobId);
  assert.equal(job.status, 'running');
  assert.equal(job.targetLang, lang);

  // Trigger background job (after)
  await runAfter();

  assert.equal(job.status, 'completed', `Job completed for ${lang}`);
  assert.equal(job.result.targetLang, lang);
  assert.equal(job.result.segments.length, 2);

  // Verify timing + speaker retained
  assert.equal(job.result.segments[0].speaker, 'Narrator');
  assert.equal(job.result.segments[0].start, 1.0);
  assert.equal(job.result.segments[0].end, 3.5);
  assert.equal(job.result.segments[0].en, 'Welcome to the test.');

  assert.equal(job.result.segments[1].speaker, 'Alice');
  assert.equal(job.result.segments[1].start, 3.8);
  assert.equal(job.result.segments[1].end, 6.2);
  assert.equal(job.result.segments[1].en, 'Hello everyone.');

  // Check call count: en only 1 call vs others 2
  if (lang === 'en') {
    assert.equal(callJsonCalls.length, 1, 'en only makes 1 callJson call (transcribe)');
    assert.equal(job.result.segments[0].vi, 'Welcome to the test.');
    assert.equal(job.result.segments[1].vi, 'Hello everyone.');
  } else {
    assert.equal(callJsonCalls.length, 2, `${lang} makes 2 callJson calls (transcribe + translate)`);
    assert.equal(job.result.segments[0].vi, 'Chào mừng đến bài test.');
    assert.equal(job.result.segments[1].vi, 'Chào mọi người.');
    const translatePrompt = callJsonCalls[1].input;
    if (lang === 'vi') {
      assert.ok(translatePrompt.includes('Translate these English transcript segments to Vietnamese.'));
    } else {
      const promptName = SUPPORTED_LANGUAGES[lang].promptName;
      assert.ok(translatePrompt.includes(`Translate these English transcript segments to ${promptName}.`));
    }
  }

  // Check saved session
  assert.equal(savedSessions.length, 1);
  assert.equal(savedSessions[0].data.listeningTargetLang, lang);
  assert.equal(savedSessions[0].data.listening.targetLang, lang);
}

// 2.4 Invalid translation count in audio -> job failed
{
  const mockCallJson = async (input, opts) => {
    if (opts.stage === 'transcribe-audio') {
      return {
        segments: [
          { speaker: 'Narrator', start: 1.0, end: 3.5, text: 'One.' },
          { speaker: 'Alice', start: 3.8, end: 6.2, text: 'Two.' },
        ],
      };
    }
    if (opts.stage === 'translate-audio') {
      return {
        translations: ['Only one translation'], // Mismatch!
      };
    }
    return {};
  };

  const { POST, jobs, runAfter } = createMockAudioRouteContext({
    callJsonImpl: mockCallJson,
  });

  const form = new FormData();
  form.append('targetLang', 'vi');
  form.append('file', makeFakeAudioFile());
  const res = await POST({ formData: async () => form });
  const jobId = res.data.jobId;

  await runAfter();

  const job = jobs.get(jobId);
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'Bản dịch không đủ đoạn');
}

// 2.5 Empty translation item in audio -> job failed
{
  const mockCallJson = async (input, opts) => {
    if (opts.stage === 'transcribe-audio') {
      return {
        segments: [
          { speaker: 'Narrator', start: 1.0, end: 3.5, text: 'One.' },
          { speaker: 'Alice', start: 3.8, end: 6.2, text: 'Two.' },
        ],
      };
    }
    if (opts.stage === 'translate-audio') {
      return {
        translations: ['   ', 'Valid translation'], // Empty translation!
      };
    }
    return {};
  };

  const { POST, jobs, runAfter } = createMockAudioRouteContext({
    callJsonImpl: mockCallJson,
  });

  const form = new FormData();
  form.append('targetLang', 'vi');
  form.append('file', makeFakeAudioFile());
  const res = await POST({ formData: async () => form });
  const jobId = res.data.jobId;

  await runAfter();

  const job = jobs.get(jobId);
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'Bản dịch không đủ đoạn');
}

console.log('PASS listening-audio route checks');
console.log('\nALL LISTENING ROUTE CHECKS PASSED SUCCESSFULLY.');
