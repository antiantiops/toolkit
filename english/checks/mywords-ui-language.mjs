import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MYWORDS_UI_TRANSLATIONS, translateMyWords } from '../src/lib/lookup/mywords-ui.mjs';

console.log('=== TEST MYWORDS UI LANGUAGE & PREDICATES ===');

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all catalog entries have non-empty strings across all 4 target locales
const catalogKeys = Object.keys(MYWORDS_UI_TRANSLATIONS);
assert(catalogKeys.length >= 30, `Catalog MYWORDS_UI_TRANSLATIONS must have sufficient entries (found ${catalogKeys.length})`);

for (const key of catalogKeys) {
  const entry = MYWORDS_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Entry for "${key}" must be an object`);
  for (const locale of targetLocales) {
    assert(
      typeof entry[locale] === 'string' && (entry[locale].trim().length > 0 || ['Đưa ', 'Kéo '].includes(key)),
      `Key "${key}" must have a valid translation string for locale "${locale}"`
    );
    assert.equal(translateMyWords(key, locale), entry[locale]);
  }

  // vi identity and fallback behavior
  assert.equal(translateMyWords(key, 'vi'), key, 'vi returns identical text');
  assert.equal(translateMyWords(key), key, 'default locale returns identical text');
  assert.equal(translateMyWords(key, null), key, 'null locale returns identical text');
  assert.equal(translateMyWords(key, undefined), key, 'undefined locale returns identical text');
}

// 2. Unknown keys and non-string inputs are preserved verbatim
assert.equal(translateMyWords('Unknown UI key', 'en'), 'Unknown UI key');
assert.equal(translateMyWords('Unknown UI key', 'ja'), 'Unknown UI key');
assert.equal(translateMyWords(null, 'en'), null);
assert.equal(translateMyWords(12345, 'en'), 12345);
assert.equal(translateMyWords(undefined, 'en'), undefined);

// 3. Extract literal t(...) calls in MyWords.js and assert catalog entries exist
const myWordsSource = fs.readFileSync(path.resolve('src/app/MyWords.js'), 'utf8');
const literalMatches = [...myWordsSource.matchAll(/\bt\(\s*(['"])(.*?)\1\s*\)/g)].map((m) => m[2]);
assert(literalMatches.length > 0, 'Must find literal t(...) calls in MyWords.js');

for (const literal of literalMatches) {
  assert(
    Object.prototype.hasOwnProperty.call(MYWORDS_UI_TRANSLATIONS, literal),
    `Literal key "${literal}" used in MyWords.js must exist in MYWORDS_UI_TRANSLATIONS`
  );
}

// 4. Verify no residual unlocalized Vietnamese string literals in MyWords.js
const lines = myWordsSource.split('\n');
const viCharRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (viCharRegex.test(line)) {
    // Assert that the line passes string to t(...) or translateMyWords(...)
    assert(line.includes('t(') || line.includes('translateMyWords('), `Line ${i + 1} has un-localized Vietnamese text without t(): ${line}`);
  }
}

// 5. Invariant & contract safety checks
assert(myWordsSource.includes('const { targetLang } = useLanguage();'), 'MyWords must consume targetLang from useLanguage');
assert(myWordsSource.includes('const t = text => translateMyWords(text, targetLang);') || myWordsSource.includes('const t = (text) => translateMyWords(text, targetLang);'), 'MyWords defines t wrapper around translateMyWords');
assert(myWordsSource.includes('body:JSON.stringify({word,targetLang})'), 'POST /api/word must send {word, targetLang}');
assert(myWordsSource.includes("const locale = targetLang === 'vi' ? 'vi-VN' : targetLang;"), 'Date formatting handles vi-VN vs targetLang');
assert(myWordsSource.includes("timeZone:'UTC'"), 'Date formatting specifies timeZone: UTC');

// Ensure row dynamic properties are intact
assert(myWordsSource.includes('row.english'), 'row.english preserved');
assert(myWordsSource.includes('row.chat.meaning'), 'row.chat.meaning preserved');
assert(myWordsSource.includes('row.chat.example'), 'row.chat.example preserved');
assert(myWordsSource.includes("ipa.match(/US[^/]*(\\/[^/]+\\/)/i)"), 'IPA regex preserved');

// Ensure animations, gestures, pointer capture, and bookmarks-first logic remain intact
assert(myWordsSource.includes('finishSwipe'), 'finishSwipe preserved');
assert(myWordsSource.includes('moveCard'), 'moveCard preserved');
assert(myWordsSource.includes('setPointerCapture'), 'setPointerCapture preserved');
assert(myWordsSource.includes('toggleBookmarks'), 'toggleBookmarks preserved');
assert(myWordsSource.includes('data-bookmarks-first'), 'data-bookmarks-first preserved');
assert(myWordsSource.includes('data-word-id'), 'data-word-id preserved');
assert(myWordsSource.includes('rememberEnglish'), 'rememberEnglish export preserved');

// 6. Test date formatting across target languages
const weekLabel = (value, targetLang = 'vi') => {
  const start = new Date(value + 'T00:00:00Z'), end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const locale = targetLang === 'vi' ? 'vi-VN' : targetLang;
  const format = d => d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  return `${format(start)} – ${format(end)} · ${start.getUTCFullYear()}`;
};

for (const lang of ['vi', ...targetLocales]) {
  const label = weekLabel('2026-11-09', lang);
  assert(label.includes('2026'), `Date label for ${lang} must include 2026`);
  assert(label.includes('–'), `Date label for ${lang} must include dash separator`);
}

// 7. Dynamic button aria-labels formatting across locales
for (const loc of targetLocales) {
  const word = 'challenge';
  const topLabel = `${translateMyWords('Đưa ', loc)}${word}${translateMyWords(' lên đầu', loc)}`;
  assert(topLabel.includes(word), `Top label in ${loc} must contain the word`);

  const bottomLabel = `${translateMyWords('Đưa ', loc)}${word}${translateMyWords(' xuống cuối', loc)}`;
  assert(bottomLabel.includes(word), `Bottom label in ${loc} must contain the word`);

  const dragLabel = `${translateMyWords('Kéo ', loc)}${word}${translateMyWords(' đổi vị trí', loc)}`;
  assert(dragLabel.includes(word), `Drag label in ${loc} must contain the word`);
}

console.log('PASS checks/mywords-ui-language.mjs: All contracts, translations, fallbacks, and UI predicates passed.');
