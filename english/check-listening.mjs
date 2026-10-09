import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = text => import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
const source = readFileSync('src/lib/listening/transcript.js', 'utf8');
const { validateTranscript, lyricsTag, stripId3, measuredLrc } = await load(source);
const lesson = { title: 'Test', sentences: [{ en: 'First sentence.', vi: 'Câu đầu.' }, { en: 'Second sentence.', vi: 'Câu sau.' }] };
assert.deepEqual(validateTranscript(lesson), lesson);
for (const value of [null, {}, { ...lesson, sentences: [] }, { ...lesson, sentences: [{ en: '', vi: 'x' }] }, { ...lesson, sentences: Array(31).fill(lesson.sentences[0]) }]) assert.throws(() => validateTranscript(value));
assert.equal(measuredLrc(lesson.sentences, [2.345, 3]), '[00:00.00]First sentence.\n[00:02.35]Second sentence.');
assert.equal(measuredLrc(lesson.sentences, [61.01, 3]).split('\n')[1], '[01:01.01]Second sentence.');
assert.throws(() => measuredLrc(lesson.sentences, [2]));
assert.throws(() => measuredLrc(lesson.sentences, [2, Infinity]));
const tag = lyricsTag('First sentence.\nCâu đầu.'), mp3 = new Uint8Array([255, 251, 144, 0]);
assert.equal(new TextDecoder().decode(tag.subarray(0, 3)), 'ID3');
assert.equal(new TextDecoder().decode(tag.subarray(10, 14)), 'USLT');
assert.equal(new TextDecoder().decode(tag.subarray(25)), 'First sentence.\nCâu đầu.');
const joined = new Uint8Array(tag.length + mp3.length); joined.set(tag); joined.set(mp3, tag.length);
assert.deepEqual(stripId3(joined), mp3);
assert.throws(() => stripId3(new Uint8Array([73,68,51,4,0,0,127,127,127,127])));
const page = readFileSync('src/app/page.js', 'utf8');
assert(page.indexOf('>Listening</button>') > page.indexOf('>✍️ Writing</button>'));
assert(page.includes('overflow-x-auto whitespace-nowrap'));
assert(page.includes('<Listening key={JSON.stringify(words.map(w => w.word))} words={words} />'));
const client = readFileSync('src/app/ListeningImage.js', 'utf8');
for (const marker of ['<ImageCrop', "'/api/upload'", "pollLesson('listening-image'", 'probe.duration', 'onEnded=', 'aria-current=', 'lyricsTag(text)', 'measuredLrc(', 'OK, phân tích']) assert(client.includes(marker), marker);
let scheduled = [], calls = 0, saves = [];
const fileId = '11111111-1111-1111-1111-111111111111.jpg';
const mock = {
  NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200, cookies: { set() {} } }) },
  after: fn => scheduled.push(fn), randomUUID: () => `job-${Math.random()}`,
  getUploadedFile: id => id === fileId ? { buffer: Buffer.from([255,216,0]), mime: 'image/jpeg' } : null,
  saveSession: (...args) => saves.push(args),
  callJson: async () => { calls++; return lesson; }, validateTranscript,
};
globalThis.listeningTest = mock;
let route = readFileSync('src/app/api/listening-image/route.js', 'utf8').replace(/^import .*;\n/gm, '');
route = 'const { NextResponse, after, randomUUID, getUploadedFile, saveSession, callJson, validateTranscript } = globalThis.listeningTest;\n' + route;
const { POST, GET } = await load(route);
const request = (body, owner = 'owner') => ({ json: async () => body, cookies: { get: () => owner ? { value: owner } : undefined } });
assert.equal((await POST(request(null))).status, 400);
assert.equal((await POST(request({ imageId: '../a.jpg' }))).status, 400);
assert.equal((await POST(request({ imageId: '22222222-2222-2222-2222-222222222222.jpg' }))).status, 400);
const first = await POST(request({ imageId: fileId }));
assert.equal(first.status, 202);
const duplicate = await POST(request({ imageId: fileId }));
assert.equal(duplicate.data.jobId, first.data.jobId);
assert.equal(scheduled.length, 1); assert.equal(calls, 0);
const getRequest = owner => ({ ...request(null, owner), url: `http://localhost/api/listening-image?jobId=${first.data.jobId}` });
assert.equal((await GET(getRequest('other'))).status, 404);
await scheduled.shift()();
assert.equal(calls, 1); assert.equal(saves.length, 1);
assert.deepEqual(saves[0][1].listening, lesson);
const completed = await GET(getRequest('owner'));
assert.equal(completed.data.status, 'completed'); assert.deepEqual(completed.data['listening-image'], lesson);
assert.equal((await POST(request({ imageId: fileId }))).data.jobId, first.data.jobId);
mock.callJson = async () => { throw new Error('injected failure'); };
// Route transport captured at import; use distinct module to inject failure.
globalThis.listeningImageJobs = new Map();
const failureRoute = await load(route + '\n// injected failure check');
const failed = await failureRoute.POST(request({ imageId: fileId })); await scheduled.shift()();
const failure = await failureRoute.GET({ ...getRequest('owner'), url: `http://localhost/api/listening-image?jobId=${failed.data.jobId}` });
assert.equal(failure.data.status, 'failed'); assert.equal(failure.data.stage, 'ai-request'); assert.match(failure.data.error, /injected failure/);
console.log('Listening checks passed: schema, measured timing, USLT, tab order, vocabulary preservation, invalid input, deduplication, ownership, completion, failure.');
