import assert from 'node:assert/strict';
import fs from 'node:fs';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

const EXPECTED_LABELS = [
  'Từ vựng',
  'Ngữ pháp',
  'Luyện viết',
  'Nghe',
  'Tra từ',
  'Đang tải…',
  'Đang lưu…',
  'Lưu',
  'Hủy',
  'Đóng',
  'Xóa',
  'Thử lại',
  'Sao chép',
  'Đã sao chép',
  'Kiểm tra',
  'Đáp án',
  'Giải thích',
  'Ví dụ',
  'Nghĩa',
  'Phát âm',
  'Bài tập',
  'Tạo bài tập',
  'Ảnh bài nghe',
  'File audio',
  'Văn bản',
  'Bài nghe gần đây',
  'Thêm file nghe',
  'Nhập bài mới',
  'Xóa bài',
  'Tiêu đề bài nghe',
  'Sửa tiêu đề bài nghe',
  'Gửi',
  'Ngôn ngữ',
  'Chọn ảnh',
  'Phân tích',
];

// Check catalog count
const catalogKeys = Object.keys(UI_TRANSLATIONS);
assert(catalogKeys.length >= 35, 'Catalog must contain at least 35 entries');

// Check all 35 expected common labels exist in catalog
for (const label of EXPECTED_LABELS) {
  assert(
    Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, label),
    `Catalog missing expected label: ${label}`
  );
}

// Check all catalog keys have all 4 nonempty values (en, ja, ko, zh-TW)
const requiredLocales = ['en', 'ja', 'ko', 'zh-TW'];
for (const key of catalogKeys) {
  const entry = UI_TRANSLATIONS[key];
  assert(entry, `Entry missing for key: ${key}`);
  for (const loc of requiredLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Key "${key}" must have nonempty translation for "${loc}"`
    );
  }
}

// Check translateUi behavior: default vi identical
for (const label of EXPECTED_LABELS) {
  assert.equal(translateUi(label), label, 'Default vi must return source label');
  assert.equal(translateUi(label, 'vi'), label, 'Explicit vi must return source label');
}

// Check all 5 exact common labels in all locales
const sampleLabels = ['Từ vựng', 'Nghe', 'Lưu', 'Hủy', 'Gửi'];
for (const label of sampleLabels) {
  assert.equal(translateUi(label, 'vi'), label);
  assert.equal(translateUi(label, 'en'), UI_TRANSLATIONS[label].en);
  assert.equal(translateUi(label, 'ja'), UI_TRANSLATIONS[label].ja);
  assert.equal(translateUi(label, 'ko'), UI_TRANSLATIONS[label].ko);
  assert.equal(translateUi(label, 'zh-TW'), UI_TRANSLATIONS[label]['zh-TW']);
}

// Check unknown English source preserved
assert.equal(translateUi('Unknown label', 'en'), 'Unknown label');
assert.equal(translateUi('Hello world', 'ja'), 'Hello world');
assert.equal(translateUi('Not in catalog', 'ko'), 'Not in catalog');

// Check non-string or falsy input safe
assert.equal(translateUi(null, 'en'), null);
assert.equal(translateUi(undefined, 'en'), undefined);
assert.equal(translateUi('', 'en'), '');

// Check LanguageContext contract
const contextSrc = fs.readFileSync('src/app/LanguageContext.js', 'utf8');
assert(contextSrc.includes('translateUi'), 'LanguageContext must import translateUi');
assert(contextSrc.includes('t = useCallback'), 'LanguageContext must define t callback');
assert(contextSrc.includes('translateUi(text, language)'), 'LanguageContext t must wire translateUi with language');
assert(contextSrc.includes('t: defaultT') || contextSrc.includes('t: (text) => text') || contextSrc.includes('t: (text) =>'), 'LanguageContext fallback context must provide identity t');

console.log('PASS checks/ui-language.mjs: 35 keys, 4 locales, default vi, unknown preserved, context wires locale');
