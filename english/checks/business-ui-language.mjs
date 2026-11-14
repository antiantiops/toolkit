import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BUSINESS_UI_TRANSLATIONS, translateBusiness } from '../src/lib/lookup/business-ui.mjs';

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all catalog entries have non-empty strings across all target locales
const catalogKeys = Object.keys(BUSINESS_UI_TRANSLATIONS);
assert(catalogKeys.length > 0, 'Catalog BUSINESS_UI_TRANSLATIONS must not be empty');

for (const key of catalogKeys) {
  const entry = BUSINESS_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Entry for "${key}" must be an object`);
  for (const locale of targetLocales) {
    assert(
      typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
      `Key "${key}" must have a nonempty translation for locale "${locale}"`
    );
    assert.equal(translateBusiness(key, locale), entry[locale]);
  }

  // vi identity and fallback behavior
  assert.equal(translateBusiness(key, 'vi'), key);
  assert.equal(translateBusiness(key), key);
  assert.equal(translateBusiness(key, null), key);
  assert.equal(translateBusiness(key, undefined), key);
}

// 2. Unknown keys and non-string inputs are preserved as-is
assert.equal(translateBusiness('Unknown UI key', 'en'), 'Unknown UI key');
assert.equal(translateBusiness('Unknown UI key', 'ja'), 'Unknown UI key');
assert.equal(translateBusiness(null, 'en'), null);
assert.equal(translateBusiness(12345, 'en'), 12345);
assert.equal(translateBusiness(undefined, 'en'), undefined);

// 3. Extract literal t(...) keys from BusinessPractice.js and assert catalog entries exist
const practiceSrc = fs.readFileSync(path.resolve('src/app/BusinessPractice.js'), 'utf8');
const literalMatches = [...practiceSrc.matchAll(/\bt\(\s*(['"])(.*?)\1\s*\)/g)].map((m) => m[2]);
assert(literalMatches.length > 0, 'Must find literal t(...) calls in BusinessPractice.js');

for (const key of literalMatches) {
  assert(
    Object.prototype.hasOwnProperty.call(BUSINESS_UI_TRANSLATIONS, key),
    `Literal t("${key}") in BusinessPractice.js must exist in BUSINESS_UI_TRANSLATIONS`
  );
}

// 4. Source invariant checks: targetLang payload, scoring, state, keyboard, swipe, tokens untouched
assert.ok(
  practiceSrc.includes("const { targetLang } = useLanguage();"),
  'BusinessPractice must consume targetLang from LanguageContext'
);
assert.ok(
  practiceSrc.includes("body:JSON.stringify({mode,words,grammar,targetLang})"),
  'Payload body must preserve targetLang along with mode, words, grammar'
);
assert.ok(
  practiceSrc.includes("['SYN','ANT'].map"),
  'Technical tokens SYN / ANT buttons must remain untouched'
);
assert.ok(
  practiceSrc.includes("normal(answers[key])===normal(q.answer)"),
  'Scoring normalization logic normal(...) must be untouched'
);
assert.ok(
  practiceSrc.includes("onTouchStart") && practiceSrc.includes("onTouchEnd"),
  'Swipe handling logic must remain intact'
);

console.log('All business-ui-language checks passed successfully.');
