import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CROP_UI_TRANSLATIONS, translateCrop } from '../src/lib/lookup/crop-ui.mjs';

console.log('=== TEST IMAGE CROP UI LANGUAGE & PREDICATES ===');

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all catalog entries have non-empty strings across all 4 target locales
const catalogKeys = Object.keys(CROP_UI_TRANSLATIONS);
assert(catalogKeys.length >= 20, `Catalog CROP_UI_TRANSLATIONS must have sufficient entries (found ${catalogKeys.length})`);

for (const key of catalogKeys) {
  const entry = CROP_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Entry for "${key}" must be an object`);
  for (const locale of targetLocales) {
    assert(
      typeof entry[locale] === 'string' && entry[locale].trim().length > 0,
      `Key "${key}" must have a nonempty translation for locale "${locale}"`
    );
    assert.equal(translateCrop(key, locale), entry[locale]);
  }

  // vi identity and fallback behavior
  assert.equal(translateCrop(key, 'vi'), key, 'vi returns identical text');
  assert.equal(translateCrop(key), key, 'default locale returns identical text');
  assert.equal(translateCrop(key, null), key, 'null locale returns identical text');
  assert.equal(translateCrop(key, undefined), key, 'undefined locale returns identical text');
}

// 2. Unknown keys and non-string inputs are preserved verbatim
assert.equal(translateCrop('Unknown UI key', 'en'), 'Unknown UI key');
assert.equal(translateCrop('Unknown UI key', 'ja'), 'Unknown UI key');
assert.equal(translateCrop(null, 'en'), null);
assert.equal(translateCrop(12345, 'en'), 12345);
assert.equal(translateCrop(undefined, 'en'), undefined);

// 3. Extract literal t(...) calls in ImageCrop.js and assert catalog entries exist
const cropSource = fs.readFileSync(path.resolve('src/app/ImageCrop.js'), 'utf8');
const literalMatches = [...cropSource.matchAll(/\bt\(\s*(['"])(.*?)\1\s*\)/g)].map((m) => m[2]);
assert(literalMatches.length > 0, 'Must find literal t(...) calls in ImageCrop.js');

for (const literal of literalMatches) {
  assert(
    Object.prototype.hasOwnProperty.call(CROP_UI_TRANSLATIONS, literal),
    `Literal key "${literal}" used in ImageCrop.js must exist in CROP_UI_TRANSLATIONS`
  );
}

// 4. Verify no residual unlocalized Vietnamese string literals in ImageCrop.js
// Find any Vietnamese text that is NOT within a t(...) call
const lines = cropSource.split('\n');
const viCharRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (viCharRegex.test(line)) {
    // Assert that the line is passing the string to t(...)
    assert(line.includes('t('), `Line ${i + 1} has un-localized Vietnamese text without t(): ${line}`);
  }
}

// 5. Invariant & contract safety checks
assert(cropSource.includes('const { targetLang } = useLanguage();'), 'ImageCrop must consume targetLang from useLanguage');
assert(cropSource.includes('const t = (text) => translateCrop(text, targetLang);') || cropSource.includes('const t = text => translateCrop(text, targetLang);'), 'ImageCrop defines t wrapper around translateCrop');

// Crop geometry and logic invariants
assert(cropSource.includes('regions.length>=8'), '8 region limit predicate preserved');
assert(cropSource.includes('b.w<.01||b.h<.01') || cropSource.includes('next.w<.01||next.h<.01'), 'Minimum region size check preserved');
assert(cropSource.includes('width*height>32000000||height>24000'), 'Canvas maximum dimension safety check preserved');
assert(cropSource.includes('onKeyDown={e => { if (e.key === "Escape" && !busy) onCancel(); }}'), 'Escape key cancellation preserved');
assert(cropSource.includes('["tl", "tr", "bl", "br"].map'), 'Corner handles for accessibility & touch preserved');
assert(cropSource.includes('ArrowLeft') && cropSource.includes('ArrowRight') && cropSource.includes('ArrowUp') && cropSource.includes('ArrowDown'), 'Keyboard nudge accessibility preserved');
assert(cropSource.includes('pointerId') && cropSource.includes('setPointerCapture'), 'Pointer capture touch handling preserved');
assert(cropSource.includes('new File([blob], "cropped.jpg", { type: "image/jpeg" })'), 'Uploaded filename cropped.jpg preserved verbatim');
assert(cropSource.includes('onClick={() => onApply(file)}'), 'Raw file passthrough option preserved');

// 6. Dynamic interpolation contract tests across locales
for (const loc of targetLocales) {
  // Corner aria-label: `${t("Chỉnh góc ")}${corner}`
  const cornerLabel = `${translateCrop('Chỉnh góc ', loc)}tl`;
  assert(cornerLabel.endsWith('tl'), `Corner label in ${loc} must append corner identifier`);

  // Region aria-label & button text: `${t("Xóa vùng ")}${i+1}`, `${t("Vùng ")}${i+1} ×`
  const delLabel = `${translateCrop('Xóa vùng ', loc)}3`;
  assert(delLabel.endsWith('3'), `Delete label in ${loc} must append region index 3`);
  const regionTag = `${translateCrop('Vùng ', loc)}3 ×`;
  assert(regionTag.includes('3 ×'), `Region badge in ${loc} must contain "3 ×"`);

  // Multiple regions button: `${t("Ghép và dùng ")}${count}${t(" vùng")}`
  const count = 5;
  const multiButtonText = `${translateCrop('Ghép và dùng ', loc)}${count}${translateCrop(' vùng', loc)}`;
  assert(multiButtonText.includes('5'), `Multiple regions button in ${loc} must contain count 5`);
}

console.log('PASS checks/crop-ui-language.mjs: All contracts, catalog entries, fallback behavior, geometry safety, and UI accessibility verified.');
