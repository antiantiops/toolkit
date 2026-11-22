import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  clientEnv,
  createOxfordAttemptController,
  describeMediaFailure,
  logOxfordFailure,
  oxfordAudioUrl,
  oxfordPageUrl,
} from '../src/lib/lookup/oxford-playback.mjs';

// 1. Strict Oxford audio URL validation (exact HTTPS host, no port/creds/non-Oxford/blob/proxy)
assert.equal(
  oxfordAudioUrl('https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/s/sch/sched/schedule__gb_1.mp3'),
  'https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/s/sch/sched/schedule__gb_1.mp3'
);
assert.equal(
  oxfordAudioUrl('https://oxfordlearnersdictionaries.com/us/media/us/test.mp3'),
  'https://oxfordlearnersdictionaries.com/us/media/us/test.mp3'
);
for (const bad of [
  '',
  null,
  'http://www.oxfordlearnersdictionaries.com/media/uk/test.mp3',
  'https://evil.example/media/uk/test.mp3',
  'https://www.oxfordlearnersdictionaries.com.evil.example/media/uk/test.mp3',
  'https://www.oxfordlearnersdictionaries.com:8443/media/uk/test.mp3',
  'https://user:pass@www.oxfordlearnersdictionaries.com/media/uk/test.mp3',
  'blob:https://example.com/123',
]) {
  assert.equal(oxfordAudioUrl(bad), '', `must reject ${String(bad)}`);
}

// 2. Same-tab Oxford page fallback: canonical /definition/english/ validated or encoded search fallback
assert.equal(
  oxfordPageUrl('https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1', 'blemish'),
  'https://www.oxfordlearnersdictionaries.com/us/definition/english/blemish_1'
);
assert.equal(
  oxfordPageUrl('https://oxfordlearnersdictionaries.com/definition/english/schedule', 'schedule'),
  'https://oxfordlearnersdictionaries.com/definition/english/schedule'
);
// Invalid/missing/non-definition sourceUrl must fall back to Oxford search with encoded query, never guessed entry URL
for (const badSource of [
  '',
  null,
  'https://www.oxfordlearnersdictionaries.com/definition/english/',
  'https://www.oxfordlearnersdictionaries.com/search/english/?q=old',
  'http://www.oxfordlearnersdictionaries.com/definition/english/schedule',
  'https://evil.example/definition/english/schedule',
  'https://www.oxfordlearnersdictionaries.com:8443/definition/english/schedule',
]) {
  assert.equal(
    oxfordPageUrl(badSource, "Rock & Roll"),
    'https://www.oxfordlearnersdictionaries.com/search/english/?q=rock%20%26%20roll'
  );
}
assert.equal(
  oxfordPageUrl('', "mother-in-law"),
  'https://www.oxfordlearnersdictionaries.com/search/english/?q=mother-in-law'
);

// 3. Positive lifecycle: loading -> playing (only playing counts as played) -> ended
{
  const states = [];
  const logs = [];
  const audio = { error: null, networkState: 2, readyState: 4 };
  const ctrl = createOxfordAttemptController({
    getAudio: () => audio,
    onPlaying: (a) => states.push(['playing', a.id, a.played]),
    onWaiting: (a) => states.push(['waiting', a.id]),
    onEnded: (a) => states.push(['ended', a.id, a.played]),
    onPause: (a) => states.push(['pause', a.id]),
    onFail: (cause, a) => states.push(['fail', cause, a.id]),
    logger: (_tag, payload) => logs.push(payload),
  });

  const a1 = ctrl.start({ word: 'schedule', accent: 'uk' });
  assert.equal(ctrl.hasActive(), true);
  assert.equal(ctrl.handleWaiting(a1), true);
  assert.equal(ctrl.handlePlaying(a1), true);
  assert.equal(a1.played, true);
  assert.equal(ctrl.handleEnded(a1), true);
  assert.equal(ctrl.hasActive(), false);
  assert.deepEqual(states, [
    ['waiting', a1.id],
    ['playing', a1.id, true],
    ['ended', a1.id, true],
  ]);
  assert.equal(logs.length, 0);
}

// 4. Ended without ever emitting playing counts as failure, not success
{
  const events = [];
  const logs = [];
  const audio = { error: null, networkState: 3, readyState: 0 };
  const ctrl = createOxfordAttemptController({
    getAudio: () => audio,
    onEnded: () => events.push('ended'),
    onFail: (cause) => events.push(['fail', cause]),
    logger: (_tag, payload) => logs.push(payload),
  });
  const a = ctrl.start({ word: 'enclose', accent: 'us' });
  assert.equal(ctrl.handleEnded(a), false);
  assert.deepEqual(events, [['fail', 'ended-without-playing']]);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].word, 'enclose');
  assert.equal(logs[0].accent, 'us');
  assert.equal(logs[0].cause, 'ended-without-playing');
}

// 5. Event + play() rejection dedup per attempt + structured client log without invented HTTP status
{
  const fails = [];
  const logs = [];
  const audio = { error: { code: 4 }, networkState: 3, readyState: 0 };
  const ctrl = createOxfordAttemptController({
    getAudio: () => audio,
    onFail: (cause, a) => fails.push([cause, a.id]),
    logger: (_tag, payload) => logs.push(payload),
  });

  // Case A: error event fires first, then play() rejects -> only 1 failure, 1 log
  const a1 = ctrl.start({ word: 'embrace', accent: 'uk' });
  assert.equal(ctrl.handleError(a1), true);
  assert.equal(ctrl.handlePlayRejected({ name: 'NotSupportedError' }, a1), false);
  assert.equal(ctrl.handleError(a1), false);
  assert.equal(fails.length, 1);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].word, 'embrace');
  assert.equal(logs[0].accent, 'uk');
  assert.equal(logs[0].audioErrorCode, 4);
  assert.equal(logs[0].networkState, 3);
  assert.equal(logs[0].readyState, 0);
  assert.equal(logs[0].cause, 'MEDIA_ERR_SRC_NOT_SUPPORTED');
  assert.equal('httpStatus' in logs[0], false);
  assert.ok(logs[0].timestamp && !Number.isNaN(Date.parse(logs[0].timestamp)));

  // Case B: play() rejects first, then trailing error event fires -> only 1 failure, 1 log
  const a2 = ctrl.start({ word: 'exclude', accent: 'us' });
  assert.equal(ctrl.handlePlayRejected({ name: 'NotAllowedError' }, a2), true);
  assert.equal(ctrl.handleError(a2), false);
  assert.equal(fails.length, 2);
  assert.equal(logs.length, 2);
  assert.equal(logs[1].cause, 'play-rejected:NotAllowedError');
}

// 6. Cancelled and stale attempt events are ignored
{
  const calls = [];
  const logs = [];
  const audio = { error: { code: 2 }, networkState: 2, readyState: 1 };
  const ctrl = createOxfordAttemptController({
    getAudio: () => audio,
    onPlaying: (a) => calls.push(['playing', a.id]),
    onEnded: (a) => calls.push(['ended', a.id]),
    onPause: (a) => calls.push(['pause', a.id]),
    onFail: (cause, a) => calls.push(['fail', cause, a.id]),
    logger: (_tag, payload) => logs.push(payload),
  });

  const stale = ctrl.start({ word: 'first', accent: 'uk' });
  const current = ctrl.start({ word: 'second', accent: 'us' });

  // Stale events from first attempt must all be ignored
  assert.equal(ctrl.handlePlaying(stale), false);
  assert.equal(ctrl.handlePause(stale), false);
  assert.equal(ctrl.handleError(stale), false);
  assert.equal(ctrl.handlePlayRejected({ name: 'AbortError' }, stale), false);
  assert.equal(ctrl.handleEnded(stale), false);
  assert.deepEqual(calls, []);
  assert.deepEqual(logs, []);

  // Cancelling current attempt (e.g. unmount / word change) ignores subsequent late events
  ctrl.cancel();
  assert.equal(ctrl.hasActive(), false);
  assert.equal(ctrl.handlePlaying(current), false);
  assert.equal(ctrl.handleError(current), false);
  assert.equal(ctrl.handlePlayRejected({ name: 'AbortError' }, current), false);
  assert.deepEqual(calls, []);
  assert.deepEqual(logs, []);
}

// 7. Browser / OS detection & logOxfordFailure structured payload
{
  assert.deepEqual(
    clientEnv({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' }),
    { browser: 'Safari', os: 'iOS' }
  );
  assert.deepEqual(
    clientEnv({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36', platform: 'Linux armv81' }),
    { browser: 'Chrome', os: 'Android' }
  );
  assert.deepEqual(
    describeMediaFailure({ error: { code: 2 }, networkState: 2, readyState: 1 }, ''),
    { audioErrorCode: 2, networkState: 2, readyState: 1, cause: 'MEDIA_ERR_NETWORK' }
  );
  let captured = null;
  logOxfordFailure({
    word: 'omit',
    accent: 'uk',
    player: { error: { code: 3 }, networkState: 3, readyState: 2 },
    nav: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/121.0', platform: 'MacIntel' },
    logger: (tag, payload) => { captured = { tag, payload }; },
  });
  assert.equal(captured.tag, '[oxford-playback]');
  assert.equal(captured.payload.word, 'omit');
  assert.equal(captured.payload.accent, 'uk');
  assert.equal(captured.payload.browser, 'Firefox');
  assert.equal(captured.payload.os, 'macOS');
  assert.equal(captured.payload.audioErrorCode, 3);
  assert.equal(captured.payload.cause, 'MEDIA_ERR_DECODE');
}

// 8. Static contract checks on OxfordPronunciation.js and SpeakBtn.js
const oxfordSrc = fs.readFileSync(new URL('../src/app/OxfordPronunciation.js', import.meta.url), 'utf8');
const speakSrc = fs.readFileSync(new URL('../src/app/SpeakBtn.js', import.meta.url), 'utf8');

// No crossorigin, no proxy, no Blob for Oxford, no retries/cachebusting on Oxford audio
assert.equal(/crossOrigin|crossorigin/.test(oxfordSrc), false);
assert.equal(/crossOrigin|crossorigin/.test(speakSrc), false);
assert.equal(/cachebust|_cb=/.test(oxfordSrc), false);
// Same-tab 'Nghe trên Oxford' link (no target="_blank" on it)
assert.match(oxfordSrc, /<a href=\{oxfordListenUrl\}[^>]*>Nghe trên Oxford<\/a>/);
assert.doesNotMatch(oxfordSrc, /target="_blank"[^>]*>Nghe trên Oxford/);
assert.match(speakSrc, /<a href=\{oxfordLink\}[^>]*>Nghe trên Oxford<\/a>/);
assert.doesNotMatch(speakSrc, /target="_blank"[^>]*>Nghe trên Oxford/);
// Preserves TTS fallback & phrase path
assert.match(oxfordSrc, /Giọng tổng hợp/);
assert.match(speakSrc, /audio\.playbackRate=!isOxford&&lang==='en-US'\?0\.85:1/);

console.log('PASS oxford-playback: URL validation, safe search fallback, attempt lifecycle/dedup/stale cancellation, client logging, and static safety checks');
