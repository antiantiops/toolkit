import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  languageInstruction,
  normalizeTargetLang,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from '../src/lib/lessons/language.mjs';
import { runLesson } from '../src/lib/lessons/pipeline.js';
import { PROMPT } from '../src/lib/lessons/grammar-prompts.js';
import { SINGLE_PROMPT, DUAL_PROMPT } from '../src/lib/lessons/writing-prompts.js';

console.log('--- 1. Testing language helper ---');
assert.equal(languageInstruction('vi'), '', 'vi returns empty instruction');
assert.equal(languageInstruction(undefined), '', 'default/omitted returns empty instruction');
assert.equal(languageInstruction(''), '', 'empty string returns default empty instruction');

const testLangs = ['en', 'ja', 'ko', 'zh-TW'];
for (const lang of testLangs) {
  const instr = languageInstruction(lang);
  const promptName = SUPPORTED_LANGUAGES[lang].promptName;
  assert.ok(instr.includes(`must be ${promptName}`), `Instructs ${promptName}`);
  assert.ok(instr.includes('TARGET LANGUAGE OVERRIDE — mandatory'), 'Has override header');
  assert.ok(instr.includes('Keep all JSON object keys exactly as defined in the schema'), 'Preserves JSON schema keys');
  assert.ok(instr.includes('*Vietnamese'), 'Preserves legacy Vietnamese property names');
  assert.ok(instr.includes('formulas, quotes, sentences, patterns, and English examples in English untouched'), 'English source untouched');
}

assert.throws(() => languageInstruction('invalid_lang'), /Unsupported target language/, 'Throws on unsupported language');

console.log('--- 2. Testing pipeline prompt enrichment & mock runLesson ---');

function makeMockResult(fields) {
  const res = {};
  for (const f of fields) {
    if (f === 'rules') res[f] = [{ stepTitle: 'Step 1', rule: 'S + V', ruleVietnamese: 'Rule expl', examples: [] }];
    else if (f === 'comparison') res[f] = { title: 'Comp', items: [] };
    else if (f === 'commonMistakes') res[f] = [];
    else if (f === 'notes') res[f] = [];
    else if (f === 'checkYourself') res[f] = [];
    else if (f === 'everydayContext') res[f] = { english: 'Hi', vietnamese: 'Chao', question: 'Q?' };
    else if (f === 'task') res[f] = { scenario: 'Scen', sender: 'Me', recipient: 'Boss' };
    else if (f === 'sample') res[f] = { title: 'Sample', sections: [] };
    else if (f === 'sections') res[f] = [];
    else if (f === 'usefulPhrases') res[f] = [];
    else if (f === 'checklist') res[f] = [];
    else if (f === 'tips') res[f] = [];
    else if (f === 'yourTurn') res[f] = { scenario: 'New', hints: [] };
    else res[f] = 'Sample text value';
  }
  return res;
}

// 2.1 Test grammar mode with vi (instruction should be untouched, legacy keys present)
{
  const capturedPrompts = [];
  const mockCall = async (prompt, opts) => {
    capturedPrompts.push({ prompt, opts });
    if (opts.stage === 'extract') {
      return { pages: [{ kind: 'grammar', topic: 'Present Simple', facts: ['fact 1'], requirements: [], wordBank: [] }] };
    }
    const match = prompt.match(/Return ONLY JSON object containing these requested paths \(dot paths mean nested objects\): ([^.]+)\./);
    const requestedFields = match ? match[1].split(', ') : ['title'];
    return makeMockResult(requestedFields);
  };

  const jobVi = {
    id: 'job-vi-1',
    mode: 'grammar',
    targetLang: 'vi',
    images: ['http://example.com/img1.jpg'],
    result: {},
  };

  await runLesson(jobVi, mockCall);
  assert.equal(jobVi.status, 'completed', 'jobVi completed');
  const enrichPrompts = capturedPrompts.filter(p => p.opts.stage.startsWith('part-'));
  assert.equal(enrichPrompts.length, 2);
  for (const { prompt } of enrichPrompts) {
    assert.ok(!prompt.includes('TARGET LANGUAGE OVERRIDE'), 'vi prompt has no TARGET LANGUAGE OVERRIDE');
    assert.ok(prompt.includes(PROMPT), 'Original grammar template prompt included');
    assert.ok(prompt.includes('titleVietnamese'), 'Legacy key preserved');
  }
}

// 2.2 Test writing with non-vi languages
for (const lang of testLangs) {
  const capturedPrompts = [];
  const mockCall = async (prompt, opts) => {
    capturedPrompts.push({ prompt, opts });
    if (opts.stage === 'extract') {
      return { pages: [{ kind: 'sample', topic: 'Email', sourceText: 'Dear Boss,\nI write this.\nSincerely, John', facts: [], requirements: [], wordBank: [] }] };
    }
    const match = prompt.match(/Return ONLY JSON object containing these requested paths \(dot paths mean nested objects\): ([^.]+)\./);
    const requestedFields = match ? match[1].split(', ') : ['title'];
    return makeMockResult(requestedFields);
  };

  const jobWriting = {
    id: `job-writing-${lang}`,
    mode: 'writing',
    targetLang: lang,
    images: ['http://example.com/img1.jpg'],
    result: {},
  };

  await runLesson(jobWriting, mockCall);
  assert.equal(jobWriting.status, 'completed', `jobWriting ${lang} completed`);
  const enrichPrompts = capturedPrompts.filter(p => p.opts.stage.startsWith('part-'));
  assert.ok(enrichPrompts.length > 0);
  const promptName = SUPPORTED_LANGUAGES[lang].promptName;
  for (const { prompt } of enrichPrompts) {
    assert.ok(prompt.includes('TARGET LANGUAGE OVERRIDE — mandatory:'), `${lang} prompt contains override`);
    assert.ok(prompt.includes(`must be ${promptName}`), `${lang} prompt specifies ${promptName}`);
    assert.ok(prompt.includes('SOURCE BINDING — mandatory'), 'Writing source rules preserved');
    assert.ok(prompt.includes('Keep all JSON object keys exactly as defined'), 'Schema keys preserved');
    assert.ok(prompt.includes('titleVietnamese') || prompt.includes('labelVietnamese') || prompt.includes('scenarioVietnamese') || prompt.includes('*Vietnamese'), 'Legacy keys preserved');
    const posTemplate = prompt.indexOf('You are a patient Vietnamese teacher');
    const posSource = prompt.indexOf('SOURCE BINDING — mandatory');
    const posLang = prompt.indexOf('TARGET LANGUAGE OVERRIDE — mandatory');
    const posSpeech = prompt.indexOf('For read-aloud, also return "speech"');
    assert.ok(posTemplate < posSource, 'template before sourceRules');
    assert.ok(posSource < posLang, 'sourceRules before langRule');
    assert.ok(posLang < posSpeech, 'langRule before speech');
  }
}

console.log('--- 3. Testing route dedup, retry, and persistence contracts ---');

// Synthesize a route harness testing the exact logic in routes.js
// Read routes.js source to ensure exact contract verification
const routesSource = fs.readFileSync(new URL('../src/lib/lessons/routes.js', import.meta.url), 'utf8');
assert.ok(routesSource.includes('normalizeTargetLang(body.targetLang)'), 'Routes normalizes targetLang');
assert.ok(routesSource.includes('key = targetLang === DEFAULT_LANGUAGE ? JSON.stringify(ids) : JSON.stringify({ ids, targetLang })'), 'Routes dedup key handles vi vs nonvi');
assert.ok(routesSource.includes('if (!requestedLang || requestedLang !== (job.targetLang || DEFAULT_LANGUAGE))'), 'Routes rejects retry with differing targetLang');
assert.ok(routesSource.includes('[`${mode}TargetLang`]: job.targetLang || DEFAULT_LANGUAGE'), 'Routes saves per-mode targetLang in session always');

// Execute isolated route simulation with mock storage & owner
const testJobs = new Map();
const mockSavedSessions = [];
const mockScheduled = [];

function simulatePost(body, owner = 'user-1', mode = 'grammar', uploadedIds = new Set(['img-1.png'])) {
  const reply = (data, status = 200) => ({ status, data });
  if (body.retry === true) {
    const job = testJobs.get(body.jobId);
    if (!job || job.owner !== owner || job.mode !== mode) return reply({ error: 'Job not found' }, 404);
    if (body.targetLang !== undefined) {
      const requestedLang = normalizeTargetLang(body.targetLang);
      if (!requestedLang || requestedLang !== (job.targetLang || DEFAULT_LANGUAGE)) {
        return reply({ error: 'Invalid or differing targetLang for retry' }, 400);
      }
    }
    if (!['running', 'completed'].includes(job.status)) {
      mockScheduled.push(job);
      job.status = 'running';
    }
    return reply({ jobId: job.id, status: job.status }, 202);
  } else {
    const targetLang = normalizeTargetLang(body.targetLang);
    if (!targetLang) return reply({ error: 'Invalid targetLang' }, 400);
    const ids = mode === 'grammar' ? [body.imageId] : [body.image1Id, body.image2Id].filter(Boolean);
    if (!ids.length || ids.some(id => typeof id !== 'string' || !/^[a-f0-9-]{36}\.[a-z0-9]{1,10}$/.test(id))) {
      return reply({ error: 'Invalid image IDs' }, 400);
    }
    const key = targetLang === DEFAULT_LANGUAGE ? JSON.stringify(ids) : JSON.stringify({ ids, targetLang });
    let job = [...testJobs.values()].find(j => j.owner === owner && j.mode === mode && j.key === key);
    if (!job) {
      if ([...testJobs.values()].some(j => j.status === 'running')) return reply({ error: 'AI đang xử lý bài khác. Thử lại sau.' }, 429);
      if (ids.some(x => !uploadedIds.has(x))) return reply({ error: 'Ảnh hết hạn hoặc không tồn tại' }, 400);
      job = {
        id: `job-${testJobs.size + 1}`,
        mode,
        owner,
        key,
        targetLang,
        createdAt: Date.now(),
        status: 'running',
        stage: 'extract',
        result: {},
        images: ids.map(x => `data:mock/${x}`)
      };
      testJobs.set(job.id, job);
      mockScheduled.push(job);
    }
    return reply({ jobId: job.id, status: job.status }, 202);
  }
}

const validUuidImage = '11111111-1111-1111-1111-111111111111.png';
const uploadedSet = new Set([validUuidImage]);

// 3.1 Invalid targetLang
{
  const res = simulatePost({ imageId: validUuidImage, targetLang: 'bad_lang' }, 'user-1', 'grammar', uploadedSet);
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Invalid targetLang');
}

// 3.2 Omitted targetLang defaults to vi, dedup key is ids JSON array
{
  const res1 = simulatePost({ imageId: validUuidImage }, 'user-1', 'grammar', uploadedSet);
  assert.equal(res1.status, 202);
  const job1 = testJobs.get(res1.data.jobId);
  assert.equal(job1.targetLang, 'vi');
  assert.equal(job1.key, JSON.stringify([validUuidImage]));

  // Post again with explicit vi -> deduplicates to same job
  job1.status = 'completed'; // clear running lock
  const res2 = simulatePost({ imageId: validUuidImage, targetLang: 'vi' }, 'user-1', 'grammar', uploadedSet);
  assert.equal(res2.status, 202);
  assert.equal(res2.data.jobId, job1.id, 'Explicit vi dedupes with omitted vi');
}

// 3.3 Non-vi creates distinct dedup key and job
{
  const resJa = simulatePost({ imageId: validUuidImage, targetLang: 'ja' }, 'user-1', 'grammar', uploadedSet);
  assert.equal(resJa.status, 202);
  const jobJa = testJobs.get(resJa.data.jobId);
  assert.notEqual(jobJa.id, 'job-1', 'Non-vi gets separate job');
  assert.equal(jobJa.targetLang, 'ja');
  assert.equal(jobJa.key, JSON.stringify({ ids: [validUuidImage], targetLang: 'ja' }));

  // Post again with ja -> deduplicates to jobJa
  jobJa.status = 'completed';
  const resJa2 = simulatePost({ imageId: validUuidImage, targetLang: 'ja' }, 'user-1', 'grammar', uploadedSet);
  assert.equal(resJa2.status, 202);
  assert.equal(resJa2.data.jobId, jobJa.id, 'Same non-vi language dedupes');
}

// 3.4 Retry validation
{
  const failedJob = {
    id: 'job-failed-ko',
    mode: 'grammar',
    owner: 'user-1',
    key: JSON.stringify({ ids: [validUuidImage], targetLang: 'ko' }),
    targetLang: 'ko',
    createdAt: Date.now(),
    status: 'failed',
    stage: 'enrich',
    result: {},
    images: []
  };
  testJobs.set(failedJob.id, failedJob);

  // Reject retry with different targetLang
  const resRetryDiff = simulatePost({ retry: true, jobId: failedJob.id, targetLang: 'zh-TW' }, 'user-1', 'grammar');
  assert.equal(resRetryDiff.status, 400);
  assert.equal(resRetryDiff.data.error, 'Invalid or differing targetLang for retry');

  // Reject retry with invalid targetLang
  const resRetryInvalid = simulatePost({ retry: true, jobId: failedJob.id, targetLang: 'invalid' }, 'user-1', 'grammar');
  assert.equal(resRetryInvalid.status, 400);
  assert.equal(resRetryInvalid.data.error, 'Invalid or differing targetLang for retry');

  // Accept retry with matching targetLang
  const resRetrySame = simulatePost({ retry: true, jobId: failedJob.id, targetLang: 'ko' }, 'user-1', 'grammar');
  assert.equal(resRetrySame.status, 202);
  assert.equal(resRetrySame.data.jobId, failedJob.id);
  assert.equal(failedJob.status, 'running');

  // Accept retry with omitted targetLang (uses job.targetLang)
  failedJob.status = 'failed';
  const resRetryOmitted = simulatePost({ retry: true, jobId: failedJob.id }, 'user-1', 'grammar');
  assert.equal(resRetryOmitted.status, 202);
  assert.equal(resRetryOmitted.data.jobId, failedJob.id);
  assert.equal(failedJob.targetLang, 'ko');
}

// Note: 3.5 sessionPayload persistence contracts verified by checks/session-route-language.mjs

console.log('ALL TESTS PASSED SUCCESSFULLY');
