import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { IMAGE_UI_TRANSLATIONS, translateImage } from '../src/lib/lookup/image-ui.mjs';

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all catalog entries have non-empty strings across all target locales
const catalogKeys = Object.keys(IMAGE_UI_TRANSLATIONS);
assert(catalogKeys.length > 0, 'Catalog IMAGE_UI_TRANSLATIONS must not be empty');

for (const key of catalogKeys) {
  const entry = IMAGE_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Entry for "${key}" must be an object`);
  for (const locale of targetLocales) {
    assert(
      typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
      `Key "${key}" must have a nonempty translation for locale "${locale}"`
    );
    assert.equal(translateImage(key, locale), entry[locale]);
  }

  // vi identity and fallback behavior
  assert.equal(translateImage(key, 'vi'), key);
  assert.equal(translateImage(key), key);
  assert.equal(translateImage(key, null), key);
  assert.equal(translateImage(key, undefined), key);
}

// 2. Unknown keys and non-string inputs are preserved as-is
assert.equal(translateImage('Unknown UI key', 'en'), 'Unknown UI key');
assert.equal(translateImage('Unknown UI key', 'ja'), 'Unknown UI key');
assert.equal(translateImage(null, 'en'), null);
assert.equal(translateImage(12345, 'en'), 12345);
assert.equal(translateImage(undefined, 'en'), undefined);

// 3. Extract literal it(...) keys from ListeningImage.js and assert catalog entries exist
const listeningSrc = fs.readFileSync(path.resolve('src/app/ListeningImage.js'), 'utf8');
const literalMatches = [...listeningSrc.matchAll(/\bit\(\s*(['"])(.*?)\1\s*\)/g)].map((m) => m[2]);
assert(literalMatches.length > 0, 'Must find literal it(...) calls in ListeningImage.js');

for (const literal of literalMatches) {
  assert(
    Object.prototype.hasOwnProperty.call(IMAGE_UI_TRANSLATIONS, literal),
    `Literal key "${literal}" used in ListeningImage.js must exist in IMAGE_UI_TRANSLATIONS`
  );
}

// 4. Source invariant checks: predicates, payloads, and handlers
assert(listeningSrc.includes('const { targetLang } = useLanguage();'), 'useLanguage targetLang retained');
assert(listeningSrc.includes('const { t: sharedT } = useLanguage();') || listeningSrc.includes('const { t } = useLanguage();'), 'shared t retained');
assert(listeningSrc.includes('it = text => translateImage(text, targetLang);') || listeningSrc.includes('const it = text => translateImage(text, targetLang);'), 'dedicated it helper defined');
assert(listeningSrc.includes('setCrop(files.length===1?files[0]:null)'), 'single image immediate crop predicate preserved');
assert(listeningSrc.includes('pages.length===2&&!crop&&!joining'), 'multipage dialog predicate preserved');
assert(listeningSrc.includes('session?type=listening&targetLang='), 'locale API payload preserved');
assert(listeningSrc.includes('session?type=previews&targetLang='), 'preview session query preserved');
assert(listeningSrc.includes('pollLesson(\'listening-image\', id ? { imageId: id, targetLang } : { targetLang }'), 'pollLesson targetLang payload preserved');

console.log('PASS checks/image-ui-language.mjs: all catalog entries, literal it keys, vi identity, unknown fallback, and source predicates verified.');
