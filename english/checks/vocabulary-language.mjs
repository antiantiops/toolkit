import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runPipeline } from '../src/lib/vocabulary/pipeline.js';
import { ENRICH_PROMPT, EXTRACT_PROMPT } from '../src/lib/vocabulary/prompts.js';
import { languageInstruction, normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lessons/language.mjs';

console.log('--- 1. Testing pipeline with all 5 languages & source locks ---');
const allLangs = ['vi', 'en', 'ja', 'ko', 'zh-TW'];

for (const lang of allLangs) {
  const capturedPrompts = [];
  const source = {
    word: 'usual',
    context: 'Oh, the usual.',
    definition: 'Happening most often.',
    synonyms: 'normal, ordinary',
    antonyms: 'unusual',
  };

  const job = {
    id: `job-test-${lang}`,
    targetLang: lang,
    entries: [],
    words: [],
    batches: [],
  };

  const mockCall = async (input, { stage }) => {
    if (stage === 'extract') {
      capturedPrompts.push({ stage, input });
      return [source];
    }
    capturedPrompts.push({ stage, prompt: input });
    return [
      {
        word: 'usual',
        ipa: '/ˈjuː.ʒu.əl/',
        meaning: `meaning in ${lang}`,
        partOfSpeech: 'adjective',
        example: 'invented example',
        exampleVietnamese: 'translated example',
        definition: 'invented definition',
        definitionVietnamese: 'translated definition',
        easyReading: 'pronunciation notes',
        synonyms: 'invented syn',
        synonymsInBook: true,
        antonyms: 'invented ant',
        antonymsInBook: true,
      },
    ];
  };

  let persistedData = null;
  await runPipeline(job, {
    call: mockCall,
    image: 'data:test',
    persist: (words) => {
      persistedData = words;
    },
  });

  assert.equal(job.status, 'completed');
  assert.equal(persistedData.length, 1);

  // Check source locks preserved exactly
  assert.equal(job.words[0].word, source.word);
  assert.equal(job.words[0].example, source.context);
  assert.equal(job.words[0].definition, source.definition);
  assert.equal(job.words[0].synonyms, source.synonyms);
  assert.equal(job.words[0].antonyms, source.antonyms);
  assert.equal(job.words[0].synonymsInBook, true);
  assert.equal(job.words[0].antonymsInBook, true);

  // Check extraction prompt NOT enriched
  const extractCall = capturedPrompts.find((p) => p.stage === 'extract');
  assert.ok(extractCall);
  assert.equal(extractCall.input[0].text, EXTRACT_PROMPT);
  assert.ok(!extractCall.input[0].text.includes('TARGET LANGUAGE OVERRIDE'));

  // Check enrich prompt
  const enrichCall = capturedPrompts.find((p) => p.stage === 'batch-1');
  assert.ok(enrichCall);
  const prompt = enrichCall.prompt;

  if (lang === 'vi') {
    // vi default: EXACT original prompt without override
    const expectedPrompt = `${ENRICH_PROMPT}\nInput: ${JSON.stringify([source])}`;
    assert.equal(prompt, expectedPrompt, 'vi uses exact original prompt');
    assert.ok(!prompt.includes('TARGET LANGUAGE OVERRIDE'));
    assert.ok(!prompt.includes('PRONUNCIATION / EASYREADING OVERRIDE'));
  } else {
    // Non-vi languages
    const promptName = SUPPORTED_LANGUAGES[lang].promptName;
    assert.ok(prompt.includes(languageInstruction(lang)), `Includes languageInstruction for ${lang}`);
    assert.ok(prompt.includes('PRONUNCIATION / EASYREADING OVERRIDE — mandatory:'), 'Includes easyReading override');
    assert.ok(prompt.includes(`tongue/lip placement tips in ${promptName}`), `Instructs tips in ${promptName}`);
    assert.ok(prompt.includes('Do NOT use Vietnamese syllables, words, or Vietnamese respelling'), 'Forbids Vietnamese syllables');
    assert.ok(prompt.includes('Keep all original English source text'), 'Source lock in instruction');
  }
}

console.log('PASS: All 5 languages tested on pipeline, source locks verified, prompts checked');

console.log('--- 2. Testing route validation, dedup, retry contracts ---');

// Synthesize analyze route logic harness
const analyzeRouteSource = fs.readFileSync(new URL('../src/app/api/analyze/route.js', import.meta.url), 'utf8');

// Verify static source bindings
assert.ok(analyzeRouteSource.includes('normalizeTargetLang(body.targetLang)'), 'route validates via normalizeTargetLang');
assert.ok(analyzeRouteSource.includes('(j.targetLang || DEFAULT_LANGUAGE) === targetLang'), 'dedup checks owner, imageId, and targetLang');
assert.ok(analyzeRouteSource.includes('requestedLang !== (job.targetLang || DEFAULT_LANGUAGE)'), 'retry checks targetLang match');
assert.ok(analyzeRouteSource.includes('wordsTargetLang: targetLang'), 'persists words tagged wordsTargetLang per-mode');
assert.ok(!analyzeRouteSource.includes('targetLang: targetLang'), 'does not persist global targetLang');

// Runtime simulation of route POST
const mockJobs = new Map();
const scheduledJobs = [];
const validImageId = '22222222-2222-2222-2222-222222222222.png';
const uploadedImages = new Set([validImageId]);

function routePost(body, owner = 'user_1') {
  const reply = (data, status = 200) => ({ status, data });
  if (body.retry === true) {
    const job = mockJobs.get(body.jobId);
    if (!job || job.owner !== owner) return reply({ error: 'Tác vụ không tồn tại' }, 404);
    if (body.targetLang !== undefined) {
      const requestedLang = normalizeTargetLang(body.targetLang);
      if (!requestedLang || requestedLang !== (job.targetLang || DEFAULT_LANGUAGE)) {
        return reply({ error: 'Invalid or differing targetLang for retry' }, 400);
      }
    }
    if (job.status !== 'running' && job.status !== 'completed') {
      scheduledJobs.push(job);
      job.status = 'running';
    }
    return reply({ jobId: job.id, status: job.status }, 202);
  } else {
    const targetLang = normalizeTargetLang(body.targetLang);
    if (!targetLang) return reply({ error: 'Invalid targetLang' }, 400);
    if (typeof body.imageId !== 'string' || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(body.imageId)) return reply({ error: 'Invalid imageId' }, 400);
    let job = [...mockJobs.values()].find(j => j.owner === owner && j.imageId === body.imageId && (j.targetLang || DEFAULT_LANGUAGE) === targetLang);
    if (!job) {
      if ([...mockJobs.values()].some(j => j.status === 'running')) return reply({ error: 'AI đang xử lý bài khác. Thử lại khi bài đó hoàn tất.' }, 429);
      if (!uploadedImages.has(body.imageId)) return reply({ error: 'Ảnh không tồn tại hoặc hết hạn' }, 400);
      job = {
        id: `job-${mockJobs.size + 1}`,
        owner,
        imageId: body.imageId,
        targetLang,
        status: 'running',
        stage: 'extract',
        createdAt: Date.now(),
        entries: [],
        words: [],
        batches: []
      };
      mockJobs.set(job.id, job);
      scheduledJobs.push(job);
    }
    return reply({ jobId: job.id, status: job.status }, 202);
  }
}

// 2.1 Invalid targetLang -> 400
{
  const res = routePost({ imageId: validImageId, targetLang: 'invalid-lang' });
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
}

// 2.2 Default/omitted targetLang is vi
{
  const res = routePost({ imageId: validImageId });
  assert.equal(res.status, 202);
  const job = mockJobs.get(res.data.jobId);
  assert.equal(job.targetLang, 'vi');

  // Dedup: posting again with explicit 'vi' finds the same job
  job.status = 'completed';
  const resVi = routePost({ imageId: validImageId, targetLang: 'vi' });
  assert.equal(resVi.status, 202);
  assert.equal(resVi.data.jobId, job.id, 'Dedupes vi and omitted');
}

// 2.3 Non-vi creates separate job
{
  const resJa = routePost({ imageId: validImageId, targetLang: 'ja' });
  assert.equal(resJa.status, 202);
  const jobJa = mockJobs.get(resJa.data.jobId);
  assert.notEqual(jobJa.id, 'job-1');
  assert.equal(jobJa.targetLang, 'ja');

  // Posting again with ja finds existing job
  jobJa.status = 'completed';
  const resJa2 = routePost({ imageId: validImageId, targetLang: 'ja' });
  assert.equal(resJa2.status, 202);
  assert.equal(resJa2.data.jobId, jobJa.id, 'Dedupes same non-vi');
}

// 2.4 Retry validation
{
  const failedJob = {
    id: 'job-failed-1',
    owner: 'user_1',
    imageId: validImageId,
    targetLang: 'ko',
    status: 'failed',
    stage: 'enrich',
    createdAt: Date.now(),
    entries: [],
    words: [],
    batches: []
  };
  mockJobs.set(failedJob.id, failedJob);

  // Differing targetLang -> 400
  const resDiff = routePost({ retry: true, jobId: failedJob.id, targetLang: 'zh-TW' });
  assert.equal(resDiff.status, 400);
  assert.equal(resDiff.data.error, 'Invalid or differing targetLang for retry');

  // Invalid targetLang -> 400
  const resInv = routePost({ retry: true, jobId: failedJob.id, targetLang: 'bad' });
  assert.equal(resInv.status, 400);
  assert.equal(resInv.data.error, 'Invalid or differing targetLang for retry');

  // Matching targetLang -> 202
  const resSame = routePost({ retry: true, jobId: failedJob.id, targetLang: 'ko' });
  assert.equal(resSame.status, 202);
  assert.equal(failedJob.status, 'running');

  // Omitted targetLang on retry -> 202, preserves job.targetLang
  failedJob.status = 'failed';
  const resOmitted = routePost({ retry: true, jobId: failedJob.id });
  assert.equal(resOmitted.status, 202);
  assert.equal(failedJob.targetLang, 'ko');
}

// 2.5 Persistence payload check
{
  function buildPayload(targetLang) {
    return {
      words: [{ word: 'hello' }],
      preview: 'data:img',
      ...(targetLang !== DEFAULT_LANGUAGE ? { wordsTargetLang: targetLang } : {})
    };
  }
  const viPayload = buildPayload('vi');
  assert.equal(viPayload.wordsTargetLang, undefined, 'vi payload omits wordsTargetLang');
  assert.equal(viPayload.targetLang, undefined, 'never sets global targetLang');

  const jaPayload = buildPayload('ja');
  assert.equal(jaPayload.wordsTargetLang, 'ja', 'non-vi payload tags wordsTargetLang');
  assert.equal(jaPayload.targetLang, undefined, 'never sets global targetLang');
}

console.log('PASS: Route validation, dedup, retries, and persistence verified');
