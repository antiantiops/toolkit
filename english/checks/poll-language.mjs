import assert from 'node:assert/strict';
import { pollLesson } from '../src/app/fetch-helper.js';

console.log('=== TEST pollLesson LOCALE PENDING-JOB COLLISION & FUNCTIONALITY ===');

// Setup mock sessionStorage
function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

const originalSessionStorage = globalThis.sessionStorage;
const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;

try {
  // Fast timers for test (keep >= 15000 check for timeout if needed)
  globalThis.setTimeout = (fn, ms) => originalSetTimeout(fn, ms >= 15000 ? ms : 0);

  // -------------------------------------------------------------------------
  // Test 1: Invalid provided locale throws before fetch / storage
  // -------------------------------------------------------------------------
  console.log('\n--- Test 1: Invalid provided locale throws before fetch/storage ---');
  for (const badLang of ['fr', 'es', 'de', 123, {}, true, 'not-a-lang']) {
    let storage = createMockStorage();
    globalThis.sessionStorage = storage;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response('{}');
    };

    await assert.rejects(
      async () => {
        await pollLesson('grammar', { targetLang: badLang }, () => {});
      },
      (err) => {
        assert.ok(err instanceof Error, 'Must throw Error');
        assert.match(err.message, /Invalid targetLang/, `Throws Invalid targetLang on ${badLang}`);
        return true;
      }
    );
    assert.equal(fetchCalled, false, 'Fetch must not be called when locale is invalid');
    assert.equal(storage.store.size, 0, 'Storage must not be touched when locale is invalid');
  }

  // -------------------------------------------------------------------------
  // Test 2: Default vi legacy key `${mode}-pending-job` & start payload includes targetLang='vi'
  // -------------------------------------------------------------------------
  console.log('\n--- Test 2: Default vi uses legacy key `${mode}-pending-job` ---');
  for (const viVal of [undefined, null, '', '   ', 'vi', 'VI']) {
    let storage = createMockStorage();
    globalThis.sessionStorage = storage;
    let postBody = null;
    let pollUrl = null;

    globalThis.fetch = async (url, opts) => {
      if (opts.method === 'POST') {
        postBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({ jobId: 'job-vi-123', status: 'running' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      pollUrl = url;
      return new Response(JSON.stringify({ status: 'completed', grammar: { test: true } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const payload = viVal !== undefined ? { targetLang: viVal, imageId: 'img1' } : { imageId: 'img1' };
    const res = await pollLesson('grammar', payload, () => {});

    assert.equal(res.status, 'completed');
    assert.equal(postBody.targetLang, 'vi', 'Start payload must include normalized targetLang=vi');
    assert.equal(postBody.imageId, 'img1', 'Original payload properties preserved');
    assert.equal(storage.getItem('grammar-pending-job'), null, 'Completed job removed from key');
    assert.ok(pollUrl.includes('/api/grammar?jobId=job-vi-123&targetLang=vi'), `Poll URL includes targetLang=vi: ${pollUrl}`);
  }

  // -------------------------------------------------------------------------
  // Test 3: Non-vi key isolated `${mode}-pending-job-${targetLang}` & matching page pendingJobKey
  // -------------------------------------------------------------------------
  console.log('\n--- Test 3: Non-vi key isolated `${mode}-pending-job-${targetLang}` ---');
  for (const lang of ['en', 'ja', 'ko', 'zh-TW', 'zh-tw']) {
    const normalized = lang.toLowerCase() === 'zh-tw' ? 'zh-TW' : lang.toLowerCase();
    const expectedKey = `writing-pending-job-${normalized}`;

    let storage = createMockStorage();
    globalThis.sessionStorage = storage;
    let postBody = null;
    let pollUrl = null;
    let keyDuringRun = null;

    globalThis.fetch = async (url, opts) => {
      if (opts.method === 'POST') {
        postBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({ jobId: `job-${normalized}-456`, status: 'running' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      pollUrl = url;
      keyDuringRun = storage.getItem(expectedKey);
      return new Response(JSON.stringify({ status: 'completed', writing: { test: true } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const res = await pollLesson('writing', { targetLang: lang, task: 'essay' }, () => {});

    assert.equal(res.status, 'completed');
    assert.equal(postBody.targetLang, normalized, `Start payload includes normalized targetLang=${normalized}`);
    assert.equal(postBody.task, 'essay', 'Original properties preserved');
    assert.equal(keyDuringRun, `job-${normalized}-456`, `Stored under isolated key: ${expectedKey}`);
    assert.equal(storage.getItem(expectedKey), null, 'Removed after completion');
    assert.equal(storage.getItem('writing-pending-job'), null, 'Legacy vi key not touched');
    assert.ok(pollUrl.includes(`targetLang=${encodeURIComponent(normalized)}`), `Poll URL includes targetLang: ${pollUrl}`);
  }

  // -------------------------------------------------------------------------
  // Test 4: Key isolation prevents stale vi resume for non-vi and vice versa
  // -------------------------------------------------------------------------
  console.log('\n--- Test 4: Stale vi job does not resume for non-vi ---');
  {
    // Storage has a pending vi job
    let storage = createMockStorage({
      'writing-pending-job': 'old-vi-job-id',
    });
    globalThis.sessionStorage = storage;
    let postCalled = false;
    let polledJobId = null;

    globalThis.fetch = async (url, opts) => {
      if (opts.method === 'POST') {
        postCalled = true;
        return new Response(JSON.stringify({ jobId: 'new-ja-job-id', status: 'running' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const u = new URL(url, 'http://localhost');
      polledJobId = u.searchParams.get('jobId');
      return new Response(JSON.stringify({ status: 'completed', writing: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Poll for Japanese
    await pollLesson('writing', { targetLang: 'ja' }, () => {});

    assert.equal(postCalled, true, 'Must start new job for ja instead of reusing vi job');
    assert.equal(polledJobId, 'new-ja-job-id', 'Polled the new ja job');
    assert.equal(storage.getItem('writing-pending-job'), 'old-vi-job-id', 'Old vi job in storage remains untouched');
    assert.equal(storage.getItem('writing-pending-job-ja'), null, 'Ja job removed on completion');
  }

  console.log('\n--- Test 4b: Existing non-vi job resumes from its own isolated key ---');
  {
    // Storage has a pending ja job
    let storage = createMockStorage({
      'grammar-pending-job-ja': 'existing-ja-job-id',
    });
    globalThis.sessionStorage = storage;
    let postCalled = false;
    let polledJobId = null;

    globalThis.fetch = async (url, opts) => {
      if (opts.method === 'POST') {
        postCalled = true;
        return new Response('{}');
      }
      const u = new URL(url, 'http://localhost');
      polledJobId = u.searchParams.get('jobId');
      return new Response(JSON.stringify({ status: 'completed', grammar: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await pollLesson('grammar', { targetLang: 'ja' }, () => {});

    assert.equal(postCalled, false, 'Did not call POST because job was resumed from storage');
    assert.equal(polledJobId, 'existing-ja-job-id', 'Resumed existing-ja-job-id');
    assert.equal(storage.getItem('grammar-pending-job-ja'), null, 'Removed after completion');
  }

  // -------------------------------------------------------------------------
  // Test 5: Successful removal and failure cleanup
  // -------------------------------------------------------------------------
  console.log('\n--- Test 5a: 404 removes key immediately ---');
  {
    let storage = createMockStorage({
      'writing-pending-job-ko': 'dead-job-id',
    });
    globalThis.sessionStorage = storage;

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    await assert.rejects(
      async () => {
        await pollLesson('writing', { targetLang: 'ko' }, () => {});
      },
      /HTTP 404/
    );

    assert.equal(storage.getItem('writing-pending-job-ko'), null, '404 removes key from storage');
  }

  console.log('\n--- Test 5b: status=failed removes key and throws error with jobId ---');
  {
    let storage = createMockStorage({
      'grammar-pending-job-zh-TW': 'failed-job-id',
    });
    globalThis.sessionStorage = storage;

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ status: 'failed', error: 'AI failed', stage: 'rules' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    let caughtError = null;
    try {
      await pollLesson('grammar', { targetLang: 'zh-TW' }, () => {});
    } catch (e) {
      caughtError = e;
    }

    assert.ok(caughtError, 'Must throw error on failed status');
    assert.equal(caughtError.jobId, 'failed-job-id', 'Error attaches jobId for retry');
    assert.equal(storage.getItem('grammar-pending-job-zh-TW'), null, 'Failed removes key from storage');
  }

  // -------------------------------------------------------------------------
  // Test 6: Retries preserve payload and error semantics
  // -------------------------------------------------------------------------
  console.log('\n--- Test 6: Retry preserves targetLang in payload and reconnect keeps job ---');
  {
    let storage = createMockStorage();
    globalThis.sessionStorage = storage;
    let postBody = null;
    let pollCount = 0;
    const stages = [];

    globalThis.fetch = async (url, opts) => {
      if (opts?.method === 'POST') {
        postBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({ jobId: 'retry-job-id', status: 'running' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      pollCount++;
      if (pollCount <= 3) {
        throw new TypeError('Network connection lost');
      }
      return new Response(JSON.stringify({ status: 'completed', result: {} }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };

    // Simulate explicit retry payload: { jobId: 'retry-job-id', retry: true, targetLang: 'ja' }
    const result = await pollLesson(
      'writing',
      { jobId: 'retry-job-id', retry: true, targetLang: 'ja' },
      (d) => stages.push(d.stage)
    );

    assert.equal(result.status, 'completed');
    assert.equal(postBody.retry, true);
    assert.equal(postBody.targetLang, 'ja');
    assert.equal(postBody.jobId, 'retry-job-id');
    assert.ok(stages.includes('reconnecting'), 'Reconnection stage surfaced to onProgress');
    assert.equal(storage.getItem('writing-pending-job-ja'), null, 'Cleaned up on completion');
  }

  console.log('\nALL pollLesson TESTS PASSED!');
} finally {
  globalThis.sessionStorage = originalSessionStorage;
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
}
