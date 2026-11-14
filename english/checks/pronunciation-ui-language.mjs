import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRONUNCIATION_UI_TRANSLATIONS, translatePronunciation } from '../src/lib/lookup/pronunciation-ui.mjs';

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all dictionary entries have non-empty strings across all target locales
const catalogKeys = Object.keys(PRONUNCIATION_UI_TRANSLATIONS);
assert(catalogKeys.length > 0, 'Catalog PRONUNCIATION_UI_TRANSLATIONS must not be empty');

for (const key of catalogKeys) {
  const entry = PRONUNCIATION_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Entry for "${key}" must be an object`);
  for (const locale of targetLocales) {
    assert(
      typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
      `Key "${key}" must have a nonempty translation for locale "${locale}"`
    );
    assert.equal(translatePronunciation(key, locale), entry[locale]);
  }

  // vi identity and fallback behavior
  assert.equal(translatePronunciation(key, 'vi'), key);
  assert.equal(translatePronunciation(key), key);
  assert.equal(translatePronunciation(key, null), key);
  assert.equal(translatePronunciation(key, undefined), key);
}

// 2. Unknown keys and non-string inputs are preserved as-is
assert.equal(translatePronunciation('Unknown UI key', 'en'), 'Unknown UI key');
assert.equal(translatePronunciation('Unknown UI key', 'ja'), 'Unknown UI key');
assert.equal(translatePronunciation(null, 'en'), null);
assert.equal(translatePronunciation(12345, 'en'), 12345);
assert.equal(translatePronunciation(undefined, 'en'), undefined);

// 3. Extract literal t(...) keys from PronunciationRecorder.js and assert catalog entries exist
const recorderSrc = fs.readFileSync(path.resolve('src/app/PronunciationRecorder.js'), 'utf8');
const literalMatches = [...recorderSrc.matchAll(/\bt\(\s*(['"])(.*?)\1\s*\)/g)].map((m) => m[2]);
assert(literalMatches.length > 0, 'Must find literal t(...) calls in PronunciationRecorder.js');

for (const key of literalMatches) {
  assert(
    Object.prototype.hasOwnProperty.call(PRONUNCIATION_UI_TRANSLATIONS, key),
    `Literal t("${key}") in PronunciationRecorder.js must exist in PRONUNCIATION_UI_TRANSLATIONS`
  );
}

// 4. Source contract: targetLang payload/keys and CoachScoreCircle uses tProp fallback
assert.ok(
  recorderSrc.includes("const { targetLang } = useLanguage();"),
  'Recorder must read targetLang from LanguageContext'
);
assert.ok(
  recorderSrc.includes("const t = (text) => translatePronunciation(text, targetLang);"),
  'Recorder panel must construct t helper with translatePronunciation and targetLang'
);
assert.ok(
  recorderSrc.includes("const t = tProp || ((text) => translatePronunciation(text, targetLang));"),
  'CoachScoreCircle must support tProp with fallback to translatePronunciation'
);
assert.ok(
  recorderSrc.includes("form.set('targetLang',targetLang);"),
  'FormData payload must include targetLang'
);
assert.ok(
  recorderSrc.includes("body:JSON.stringify({jobId:activeJobId,retry:true,targetLang})"),
  'Retry JSON payload must include targetLang'
);
assert.ok(
  recorderSrc.includes("const pendingKey = 'pronunciation-job:'+word+(targetLang==='vi'?'':':'+targetLang);"),
  'pendingKey must account for targetLang'
);
