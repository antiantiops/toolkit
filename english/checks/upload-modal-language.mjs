import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_UI_TRANSLATIONS, translatePage } from '../src/lib/lookup/page-ui.mjs';

console.log('=== TEST UPLOAD CONFIRMATION MODAL LANGUAGE & PREDICATES ===');

const pageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/page.js'), 'utf8');

// 1. Verify exact static modal labels wrapped with ptext
const modalSnippets = [
  'confirmAnalyze.loading ? ptext("Đang tải ảnh lên server...") : confirmAnalyze.error ? ptext("Tải ảnh không thành công") : ptext("Ảnh đã sẵn sàng!")',
  'ptext("Đang tải lên server (")',
  'ptext(" MB)...")',
  'ptext("✓ Đã lưu ảnh trên server (")',
  'ptext(" MB). Nhấn bên dưới để AI phân tích.")',
  'ptext("Để sau")',
  'ptext("Thử lại")',
  'ptext("Đang tải...")',
  'ptext("OK, phân tích")',
];

for (const snippet of modalSnippets) {
  assert(pageSource.includes(snippet), `page.js must contain snippet: ${snippet}`);
}

// 2. Verify catalog completeness for all modal keys across 4 locales
const modalKeys = [
  'Đang tải ảnh lên server...',
  'Tải ảnh không thành công',
  'Ảnh đã sẵn sàng!',
  'Đang tải lên server (',
  ' MB)...',
  '✓ Đã lưu ảnh trên server (',
  ' MB). Nhấn bên dưới để AI phân tích.',
  'Để sau',
  'Thử lại',
  'Đang tải...',
  'OK, phân tích',
];

const locales = ['en', 'ja', 'ko', 'zh-TW'];

for (const key of modalKeys) {
  assert(PAGE_UI_TRANSLATIONS[key], `Missing catalog key: ${key}`);
  for (const loc of locales) {
    const val = translatePage(key, loc);
    assert(typeof val === 'string' && val.length > 0, `Locale ${loc} translation for "${key}" is missing or empty`);
    assert(val !== key || key === ' MB)...', `Locale ${loc} translation for "${key}" should not equal Vietnamese key unless intentionally identical`);
  }
}

// 3. Verify size interpolation preserves numeric MB value unchanged
const sampleBytes = 2.5 * 1024 * 1024;
const mbStr = ((sampleBytes || 0) / (1024 * 1024)).toFixed(1);
assert.equal(mbStr, '2.5');

for (const loc of locales) {
  const loadingProgress = `${translatePage('Đang tải lên server (', loc)}${mbStr}${translatePage(' MB)...', loc)}`;
  assert(loadingProgress.includes('2.5 MB)...'), `Progress string in ${loc} must contain unchanged 2.5 MB)...`);

  const successProgress = `${translatePage('✓ Đã lưu ảnh trên server (', loc)}${mbStr}${translatePage(' MB). Nhấn bên dưới để AI phân tích.', loc)}`;
  assert(successProgress.includes('2.5 MB)'), `Success string in ${loc} must contain unchanged 2.5 MB)`);
}

// 4. Verify predicates, disabled flags, and callbacks remain preserved
assert(pageSource.includes('disabled={confirmAnalyze.loading}'), 'Cancel/defer button must retain disabled={confirmAnalyze.loading}');
assert(pageSource.includes('onClick={() => setConfirmAnalyze(null)}'), 'Cancel/defer button must retain onClick={() => setConfirmAnalyze(null)}');
assert(pageSource.includes('onClick={() => startConfirmUpload(confirmAnalyze.file, confirmAnalyze.target)}'), 'Retry button must retain startConfirmUpload callback');
assert(pageSource.includes('if (target === "grammar") analyzeGrammar(imageId || file);'), 'Analyze button must retain grammar check');
assert(pageSource.includes('else analyze(imageId || file);'), 'Analyze button must retain analyze check');
assert(pageSource.includes('confirmAnalyze.target === "grammar" ? "bg-purple-600 hover:bg-purple-500" : "bg-blue-600 hover:bg-blue-500"'), 'Analyze button styling must retain target check');

console.log('PASS checks/upload-modal-language.mjs: Modal strings, catalog entries, numeric MB, predicates and callbacks intact.');
