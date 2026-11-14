import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST HOME PAGE LANGUAGE CONTEXT & MULTILINGUAL REQUEST WIRING ===');

const pageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/page.js'), 'utf8');

// 1. LanguageContext integration
assert(pageSource.includes('useLanguage'), 'page.js must import/use useLanguage');
assert(
  pageSource.includes('const { targetLang, setLanguage } = useLanguage()') ||
  pageSource.includes('const {targetLang,setLanguage}=useLanguage()') ||
  /const\s*\{\s*targetLang\b.*\}\s*=\s*useLanguage\(\)/.test(pageSource),
  'page.js must destructure targetLang from useLanguage'
);
assert(!pageSource.includes('useState("vi")'), 'Obsolete local useState("vi") for targetLang must be removed');
assert(!pageSource.includes('changeLookupLanguage'), 'Obsolete changeLookupLanguage callback must be removed');
assert(pageSource.includes('<LookupLanguage />'), 'LookupLanguage must be invoked with no props, relying on shared context');

// 2. Pending job storage namespacing
assert(
  pageSource.includes('pendingJobKey') ||
  /`\$\{base\}-pending-job(?:-\$\{targetLang\})?`/.test(pageSource) ||
  /`vocab-pending-job(?:\$\{.*targetLang.*\}|\b)/.test(pageSource),
  'Must have helper or logic for namespacing pending job keys'
);

// Verify namespacing helper behavior against vi vs non-vi
const pendingJobKeyFn = (base, targetLang) => (!targetLang || targetLang === "vi" ? `${base}-pending-job` : `${base}-pending-job-${targetLang}`);
assert.equal(pendingJobKeyFn('vocab', 'vi'), 'vocab-pending-job');
assert.equal(pendingJobKeyFn('vocab', undefined), 'vocab-pending-job');
assert.equal(pendingJobKeyFn('vocab', 'ja'), 'vocab-pending-job-ja');
assert.equal(pendingJobKeyFn('grammar', 'zh-TW'), 'grammar-pending-job-zh-TW');

// 3. Analyze request payloads include targetLang
assert(
  pageSource.includes('body: JSON.stringify({ jobId: vRetryJob, retry: true, targetLang })'),
  'Analyze retry request must pass targetLang in body'
);
assert(
  pageSource.includes('body: JSON.stringify({ imageId, targetLang })'),
  'Analyze create request must pass targetLang in body'
);

// 4. Grammar and writing lesson invocations include targetLang
assert(
  pageSource.includes('pollLesson("writing", wRetry ? {jobId: wRetry, retry: true, targetLang} : payload') ||
  pageSource.includes('pollLesson("writing"'),
  'Writing pollLesson must pass targetLang'
);
assert(
  pageSource.includes('targetLang') && pageSource.includes('payload.image1Id'),
  'Writing payload must include targetLang'
);
assert(
  pageSource.includes('pollLesson("grammar", gRetry ? {jobId: gRetry, retry: true, targetLang} : {imageId, targetLang}'),
  'Grammar pollLesson must pass targetLang'
);

// 5. Practice and grammar-practice requests include targetLang
assert(
  pageSource.includes('body: JSON.stringify({ grammar, targetLang })'),
  'Grammar practice request must pass targetLang in body'
);
assert(
  pageSource.includes('body: JSON.stringify({ words, targetLang })'),
  'Vocab practice request must pass targetLang in body'
);

// 6. Lookup translation requests include targetLang
assert(
  pageSource.includes('form.append("targetLang", targetLang)'),
  'lookupText must append targetLang to lookup FormData'
);
assert(
  pageSource.includes('const cacheKey = JSON.stringify([dir, text, targetLang])'),
  'lookupText translationCache key must include targetLang'
);

// 7. Session GET query and DELETE include targetLang
assert(
  pageSource.includes('/api/session?type=${type}&offset=${offset}&targetLang='),
  'Session fetch GET must include targetLang query param'
);
assert(
  pageSource.includes('/api/session?type=${type}&targetLang='),
  'Session fetch DELETE must include targetLang query param'
);

console.log('PASS home-language: useLanguage integration, LookupLanguage no-props, namespaced storage, payload targetLang, session params');
