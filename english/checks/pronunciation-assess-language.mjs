import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';
import { languageInstruction } from '../src/lib/lessons/language.mjs';

const routeSource = fs.readFileSync('src/app/api/pronunciation-assess/route.js', 'utf8');
const recorderSource = fs.readFileSync('src/app/PronunciationRecorder.js', 'utf8');

// --- 1. Recorder Source Contracts ---
assert.ok(recorderSource.includes("const { targetLang } = useLanguage();"), 'Recorder must read targetLang from LanguageContext');
assert.ok(recorderSource.includes("const pendingKey = 'pronunciation-job:'+word+(targetLang==='vi'?'':':'+targetLang);"), 'pendingKey must include locale suffix when non-vi');
assert.ok(recorderSource.includes("form.set('targetLang',targetLang);"), 'Recorder FormData must set targetLang');
assert.ok(recorderSource.includes("fetch(`/api/pronunciation-practice?word=${encodeURIComponent(word)}&targetLang=${encodeURIComponent(targetLang)}`)"), 'Recorder practice fetch must include targetLang query');
assert.ok(recorderSource.includes("options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:activeJobId,retry:true,targetLang})};"), 'Recorder retry JSON must include targetLang');

// --- 2. Helper to create valid WAV buffer (16-bit PCM mono) ---
function makeWavBuffer(seconds = 0.3, sampleRate = 16000, amplitude = 0.1) {
  const numSamples = Math.floor(seconds * sampleRate);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buf.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buf.writeUInt16LE(1, 22);  // NumChannels (1 = mono)
  buf.writeUInt32LE(sampleRate, 24); // SampleRate
  buf.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buf.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  buf.writeUInt16LE(16, 34); // BitsPerSample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const val = amplitude === 0 ? 0 : Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * amplitude * 32767;
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(val))), 44 + i * 2);
  }
  return buf;
}

// --- 3. Route Harness Setup (isolated tempdir) ---
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pron-assess-test-'));

function createHarness() {
  const aiCalls = [];
  const scheduledTasks = [];

  const context = vm.createContext({
    URL,
    Headers,
    FormData,
    File,
    Blob,
    Buffer,
    Map,
    Set,
    JSON,
    Date,
    Math,
    Error,
    Number,
    setTimeout,
    clearTimeout,
    Promise,
    process: { env: { CACHE_DIR: tempDir } },
    globalThis: {},
    console,
    fs,
    path,
    os,
    createHash,
    NextResponse: {
      json: (body, init = {}) => ({
        status: init.status || 200,
        headers: init.headers || {},
        json: async () => body,
        body,
      }),
    },
    after: (fn) => {
      scheduledTasks.push(fn);
    },
    cacheOwner: (req) => req.headers.get('owner') || 'test-owner',
    callJson: async (messages, options) => {
      aiCalls.push({ messages, options });
      return {
        status: 'feedback',
        heard: 'hello',
        score: 95,
        segments: [{ text: 'hello', status: 'correct' }],
        summary: 'Tốt',
        tips: []
      };
    },
    normalizeTargetLang,
    languageInstruction,
  });

  const apiCode = routeSource
    .replace(/^import .*;$/mg, '')
    .replace(/export /g, '');

  vm.runInContext(apiCode + '; globalThis.api = { GET, POST, run, DIR, filePath, load, save, view };', context);

  return {
    GET: context.globalThis.api.GET,
    POST: context.globalThis.api.POST,
    run: context.globalThis.api.run,
    DIR: context.globalThis.api.DIR,
    filePath: context.globalThis.api.filePath,
    load: context.globalThis.api.load,
    aiCalls,
    scheduledTasks,
    runScheduled: async () => {
      while (scheduledTasks.length > 0) {
        const task = scheduledTasks.shift();
        await task();
      }
    }
  };
}

// Mock Request helper
function makeMockRequest({ method = 'POST', headers = {}, body = null, url = 'http://localhost/api/pronunciation-assess' } = {}) {
  const h = new Headers(headers);
  return {
    method,
    url,
    headers: h,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    formData: async () => body,
  };
}

// Test A: Invalid locale -> 400 & no writes
{
  const harness = createHarness();
  const wavBuf = makeWavBuffer(0.3, 16000, 0.2);
  const form = new FormData();
  form.set('word', 'test');
  form.set('ipa', '/test/');
  form.set('targetLang', 'invalid-lang');
  form.set('file', new File([wavBuf], 'audio.wav', { type: 'audio/wav' }));

  const filesBefore = fs.existsSync(harness.DIR) ? fs.readdirSync(harness.DIR) : [];
  const req = makeMockRequest({ body: form, headers: { owner: 'owner-1' } });
  const res = await harness.POST(req);
  assert.equal(res.status, 400, 'Invalid locale must return 400');
  assert.equal(res.body.error, 'Invalid targetLang');
  const filesAfter = fs.existsSync(harness.DIR) ? fs.readdirSync(harness.DIR) : [];
  assert.equal(filesAfter.length, filesBefore.length, 'No files should be written on invalid locale 400');
}

// Test B: Valid all 5 locales -> targetLang, hash separate, vi legacy hash match
const supportedCodes = Object.keys(SUPPORTED_LANGUAGES);
assert.deepEqual(supportedCodes.sort(), ['en', 'ja', 'ko', 'vi', 'zh-TW'].sort());

const jobIds = {};
const wavBuf = makeWavBuffer(0.3, 16000, 0.2);
const owner = 'test-owner-hash';
const word = 'effort';
const ipa = '/ˈef.ət/';

for (const lang of supportedCodes) {
  const harness = createHarness();
  const form = new FormData();
  form.set('word', word);
  form.set('ipa', ipa);
  form.set('targetLang', lang);
  form.set('file', new File([wavBuf], 'audio.wav', { type: 'audio/wav' }));

  const req = makeMockRequest({ body: form, headers: { owner } });
  const res = await harness.POST(req);
  assert.equal(res.status, 202, `Status 202 for ${lang}`);
  assert.equal(res.body.targetLang, lang, `Returned targetLang should match ${lang}`);

  const loaded = harness.load(res.body.jobId);
  assert.ok(loaded, `Job record ${res.body.jobId} must exist`);
  assert.equal(loaded.targetLang, lang, `Job.targetLang must be ${lang}`);

  jobIds[lang] = res.body.jobId;

  // Expected hash formula:
  // createHash('sha256').update(owner).update('\0'+word.trim()+'\0'+(targetLang==='vi'?'':targetLang+'\0')).update(bytes).digest('hex')
  const expectedHash = createHash('sha256')
    .update(owner)
    .update('\0' + word.trim() + '\0' + (lang === 'vi' ? '' : lang + '\0'))
    .update(wavBuf)
    .digest('hex');
  assert.equal(res.body.jobId, expectedHash, `Hash formula mismatch for ${lang}`);

  // Legacy VI hash formula match:
  if (lang === 'vi') {
    const legacyViHash = createHash('sha256')
      .update(owner)
      .update('\0' + word.trim() + '\0')
      .update(wavBuf)
      .digest('hex');
    assert.equal(res.body.jobId, legacyViHash, 'vi hash must match legacy hash');
  }

  // Verify saved audio file preserves exact bytes
  const savedWav = fs.readFileSync(path.join(harness.DIR, res.body.jobId + '.wav'));
  assert.deepEqual(savedWav, wavBuf, `Preserved audio bytes for ${lang}`);
}

// Verify distinct hashes across all locales
const uniqueIds = new Set(Object.values(jobIds));
assert.equal(uniqueIds.size, 5, 'All 5 locales must produce distinct job IDs (hashes)');

// Test C: Retry mismatch -> 400 & no schedule
{
  const harness = createHarness();
  // Try to retry ja job with targetLang: en
  const jaJobId = jobIds['ja'];
  const reqMismatch = makeMockRequest({
    headers: { 'content-type': 'application/json', owner },
    body: { jobId: jaJobId, retry: true, targetLang: 'en' }
  });
  const resMismatch = await harness.POST(reqMismatch);
  assert.equal(resMismatch.status, 400, 'Retry with mismatched targetLang must return 400');
  assert.equal(resMismatch.body.error, 'Differing targetLang for retry');
  assert.equal(harness.scheduledTasks.length, 0, 'No task scheduled on mismatch');

  // Retry with invalid targetLang -> 400
  const reqInvalid = makeMockRequest({
    headers: { 'content-type': 'application/json', owner },
    body: { jobId: jaJobId, retry: true, targetLang: 'bad' }
  });
  const resInvalid = await harness.POST(reqInvalid);
  assert.equal(resInvalid.status, 400);
  assert.equal(resInvalid.body.error, 'Invalid targetLang');
}

// Test D: Silence test each locale -> status: retry, summary localized, no AI call
const silenceBuf = makeWavBuffer(0.3, 16000, 0); // amplitude 0
const silenceSummaries = {
  vi: 'Bản ghi im lặng hoặc âm lượng quá nhỏ. Đưa microphone gần hơn và thu lại.',
  en: 'Recording is silent or too quiet. Move closer to the microphone and record again.',
  ja: '録音が無音か小さすぎます。マイクに近づいて再録音してください。',
  ko: '녹음이 무음이거나 너무 작습니다. 마이크에 가까이 대고 다시 녹음하세요。',
  'zh-TW': '錄音無聲或音量太小。請靠近麥克風重新錄音。'
};

for (const lang of supportedCodes) {
  const harness = createHarness();
  const form = new FormData();
  form.set('word', word);
  form.set('ipa', ipa);
  form.set('targetLang', lang);
  form.set('file', new File([silenceBuf], 'audio.wav', { type: 'audio/wav' }));

  const req = makeMockRequest({ body: form, headers: { owner } });
  const res = await harness.POST(req);
  assert.equal(res.status, 200);
  assert.equal(res.body.result?.status, 'retry');
  assert.equal(res.body.result?.summary, silenceSummaries[lang], `Silence summary mismatch for ${lang}`);
  assert.equal(harness.aiCalls.length, 0, 'No AI call on silence');
  assert.equal(harness.scheduledTasks.length, 0, 'No background job scheduled on silence');
}

// Test E: Execute queued job: vi prompt unchanged, non-vi appended languageInstruction
for (const lang of supportedCodes) {
  const harness = createHarness();
  const form = new FormData();
  form.set('word', 'challenge');
  form.set('ipa', '/ˈtʃæl.ɪndʒ/');
  form.set('targetLang', lang);
  form.set('file', new File([wavBuf], 'audio.wav', { type: 'audio/wav' }));

  const req = makeMockRequest({ body: form, headers: { owner: 'owner-execute' } });
  const res = await harness.POST(req);
  assert.equal(res.status, 202);

  // Run the queued background task
  assert.equal(harness.scheduledTasks.length, 1);
  await harness.runScheduled();

  assert.equal(harness.aiCalls.length, 1, `AI must be called once for ${lang}`);
  const prompt = harness.aiCalls[0].messages[0].text;
  const instruction = languageInstruction(lang);

  if (lang === 'vi') {
    assert.equal(instruction, '', 'vi languageInstruction must be empty string');
    assert.ok(prompt.endsWith('. IPA: "/ˈtʃæl.ɪndʒ/"'), 'vi prompt must end with IPA and have no appended instruction');
    assert.ok(!prompt.includes('TARGET LANGUAGE OVERRIDE'), 'vi prompt must not contain language override');
  } else {
    assert.ok(instruction.length > 0, `Instruction for ${lang} must not be empty`);
    assert.ok(prompt.endsWith(instruction), `Prompt for ${lang} must end with languageInstruction(${lang})`);
    assert.ok(prompt.includes('TARGET LANGUAGE OVERRIDE'), `${lang} prompt must include language override`);
  }
}

// Clean up tempDir
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('PASS checks/pronunciation-assess-language.mjs');
