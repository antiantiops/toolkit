import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';

const foreignLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Read actual ListeningAudio.js source code (under 60 lines)
const audioPath = path.resolve('src/app/ListeningAudio.js');
const audioSrc = fs.readFileSync(audioPath, 'utf8');
const lineCount = audioSrc.trim().split('\n').length;
assert(lineCount <= 60, `ListeningAudio.js must be <= 60 lines (got ${lineCount})`);

// 2. Extract all t('...') calls from actual ListeningAudio.js source code
const tCalls = [...audioSrc.matchAll(/\bt\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
assert(tCalls.length >= 10, `Expected at least 10 t('...') calls, found ${tCalls.length}`);

// 3. Assert every Vietnamese UI phrase has full en, ja, ko, zh-TW catalog and translates nonempty vi identity
for (const phrase of tCalls) {
  assert(
    Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, phrase),
    `UI_TRANSLATIONS must contain phrase from ListeningAudio: "${phrase}"`
  );
  const entry = UI_TRANSLATIONS[phrase];
  for (const loc of foreignLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Phrase "${phrase}" must have nonempty translation for locale "${loc}"`
    );
    assert.equal(
      translateUi(phrase, loc),
      entry[loc],
      `translateUi("${phrase}", "${loc}") must return catalog translation`
    );
  }
  // Vietnamese identity returns original phrase nonempty
  assert.equal(translateUi(phrase, 'vi'), phrase);
  assert.equal(translateUi(phrase), phrase);
}

// 4. Source invariants: targetLang, form/history gate, URLs, and version guards remain
assert.match(audioSrc, /const \{ targetLang \} = useLanguage\(\)/, 'targetLang extracted from useLanguage');
assert.match(audioSrc, /const \{ t \} = useLanguage\(\)/, 't extracted from useLanguage');
assert.match(
  audioSrc,
  /historyEntry = \(historyEntry\?\.lesson\?\.targetLang \|\| historyEntry\?\.targetLang \|\| 'vi'\) === targetLang \? historyEntry : null;/,
  'History gate matches targetLang'
);
assert.match(audioSrc, /\/api\/session\?type=listening&targetLang=/, 'Session fetch URL contains targetLang');
assert.match(audioSrc, /\/api\/listening-audio\/file\?targetLang=/, 'Audio file URL contains targetLang');
assert.match(audioSrc, /body\.set\('targetLang',targetLang\)/, 'FormData payload sets targetLang');
assert.match(audioSrc, /version\.current/, 'Version guard present');
assert.match(audioSrc, /token===version\.current/, 'Token matches version guard');

// 5. Assert no 'Anh–Việt' visible label in ListeningAudio
assert.doesNotMatch(audioSrc, /Anh[–-]Việt/, "ListeningAudio must not contain visible label 'Anh–Việt'");

// 6. Common file details / title and t used
assert.match(audioSrc, /<summary className="cursor-pointer text-center">\{t\('Tải file & thông tin'\)\}<\/summary>/);
assert.match(audioSrc, /title=\{name\}/);

console.log('PASS checks/listening-audio-ui-language.mjs: ListeningAudio UI translations, invariants, catalog completeness verified across all locales.');
