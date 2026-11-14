import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PAGE_UI_TRANSLATIONS, translatePage } from '../src/lib/lookup/page-ui.mjs';

console.log('=== TEST PAGE UI LANGUAGE WIRING & TRANSLATIONS ===');

const pageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/page.js'), 'utf8');

// 1. Verify translatePage import and ptext definition in Home
assert(
  pageSource.includes('import { translatePage } from "../lib/lookup/page-ui.mjs";') ||
  pageSource.includes("import { translatePage } from '../lib/lookup/page-ui.mjs';"),
  'page.js must import translatePage from ../lib/lookup/page-ui.mjs'
);

assert(
  pageSource.includes('const ptext = (text) => translatePage(text, targetLang);') ||
  pageSource.includes('const ptext = text => translatePage(text, targetLang);') ||
  pageSource.includes('const ptext=(text)=>translatePage(text,targetLang)') ||
  pageSource.includes('const ptext=text=>translatePage(text,targetLang)'),
  'page.js must define ptext = text => translatePage(text, targetLang)'
);

// 2. Catalog completeness across all 4 locales (en, ja, ko, zh-TW)
const catalogKeys = Object.keys(PAGE_UI_TRANSLATIONS);
assert(catalogKeys.length > 0, 'PAGE_UI_TRANSLATIONS must not be empty');
assert(catalogKeys.length <= 60, `Catalog must not exceed 60 phrases, got ${catalogKeys.length}`);

const targetLocales = ['en', 'ja', 'ko', 'zh-TW'];

for (const key of catalogKeys) {
  const entry = PAGE_UI_TRANSLATIONS[key];
  assert(entry && typeof entry === 'object', `Catalog entry for "${key}" must be an object`);
  for (const loc of targetLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Key "${key}" must have non-empty translation for locale "${loc}"`
    );
    assert.equal(translatePage(key, loc), entry[loc]);
  }

  // vi identity and fallback behavior
  assert.equal(translatePage(key, 'vi'), key);
  assert.equal(translatePage(key), key);
  assert.equal(translatePage(key, null), key);
  assert.equal(translatePage(key, undefined), key);
}

// 3. Unknown keys and non-string inputs are preserved as-is
assert.equal(translatePage('Unknown text', 'en'), 'Unknown text');
assert.equal(translatePage(null, 'en'), null);
assert.equal(translatePage(1234, 'en'), 1234);
assert.equal(translatePage(undefined, 'en'), undefined);

// 4. Verify Listening source tabs wiring
assert(
  pageSource.includes('ptext(label)') || pageSource.includes('{ptext(label)}'),
  'Listening source tab label must be rendered with ptext(label)'
);

// 5. Verify Popup loading text is generic 'Đang tra nghĩa…' rendered with ptext
assert(
  pageSource.includes('ptext("Đang tra nghĩa…")') || pageSource.includes("ptext('Đang tra nghĩa…')"),
  'Popup loading text must use ptext("Đang tra nghĩa…") and not be Vietnamese-specific'
);
assert(
  !pageSource.includes('Đang tra nghĩa tiếng Việt...'),
  'Vietnamese-specific popup loading string must be replaced'
);

// 6. Verify static controls in lower section use ptext
const wiredControls = [
  'ptext("Kéo thả ảnh trang từ vựng vào đây hoặc bấm chọn")',
  'ptext("🔍 Phân tích từ vựng")',
  'ptext("Thử lại nhóm lỗi")',
  'ptext("✕ Xóa bài / Bài mới")',
  'ptext("✍️ Practice test")',
  'ptext("← Quay lại từ vựng")',
  'ptext("Bài 1: Chọn từ lạc nhóm")',
  'ptext("Bài 2: Điền từ")',
  'ptext("Tạo bài 1")',
  'ptext("Chấm điểm")',
  'ptext("Điền từ vào đây")',
  'ptext("Kéo thả ảnh trang ngữ pháp vào đây hoặc bấm chọn")',
  'ptext("🔍 Phân tích ngữ pháp")',
  'ptext("Thử lại phần lỗi")',
  'ptext("✍️ Luyện tập")',
  'ptext("← Quay lại ngữ pháp")',
  'ptext("Bài 1: Trắc nghiệm")',
  'ptext("Bài 2: Viết lại câu")',
  'ptext("Viết lại câu ở đây")',
  'ptext("Trang 1 · Bài mẫu (Sample)")',
  'ptext("✓ Đã lưu server")',
  'ptext("✕ Xóa")',
  'ptext("Thử tải lại")',
  'ptext("Đổi ảnh khác")',
  'ptext("Ảnh trang bài mẫu")',
  'ptext("Trang 2 · Bài tập (Self-Writing)")',
  'ptext("Chờ Trang 1 tải lên xong")',
  'ptext("Bỏ qua Trang 1 → Tải thẳng Trang 2")',
  'ptext("Ảnh trang bài tập")',
  'ptext("Đang phân tích bài viết...")',
  'ptext("Đang tải ảnh lên server...")',
  'ptext("Vui lòng chọn ảnh")',
  'ptext("🔍 Phân tích trọn bộ Unit (Bài mẫu + Bài tập Self-Writing)")',
  'ptext("🔍 Phân tích bài mẫu (Trang 1)")',
  'ptext("🔍 Phân tích bài tập (Trang 2)")',
  'ptext("Ghi âm để luyện phát âm")',
  'ptext("Luyện nói")',
  'ptext("Thu gọn")',
];

for (const snippet of wiredControls) {
  assert(pageSource.includes(snippet), `page.js must include wired snippet: ${snippet}`);
}

// 7. Verify API payloads remain untranslated and intact
assert(pageSource.includes('body: JSON.stringify({ imageId, targetLang })'), 'Analyze payload must remain intact');
assert(pageSource.includes('form.append("direction", dir)'), 'Lookup direction payload must remain intact');

console.log('PASS checks/page-ui-language.mjs: All controls wired with ptext, catalog complete, payloads preserved');
