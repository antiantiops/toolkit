import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';

console.log('=== TEST HOME UI LANGUAGE WIRING & TRANSLATIONS ===');

const pageSource = fs.readFileSync(path.join(process.cwd(), 'src/app/page.js'), 'utf8');

// 1. Check useLanguage destructuring includes t
assert(
  pageSource.includes('const { targetLang, setLanguage, t } = useLanguage()') ||
  /const\s*\{\s*[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\(\)/.test(pageSource),
  'page.js must destructure t from useLanguage'
);

// 2. Check primary mode tabs wired with t
assert(pageSource.includes('aria-label={t("Chọn kỹ năng")}'), 'Mode tabs navigation must use t("Chọn kỹ năng")');
assert(pageSource.includes('{t("Từ vựng")}'), 'Vocabulary mode tab must use t("Từ vựng")');
assert(pageSource.includes('{t("Ngữ pháp")}'), 'Grammar mode tab must use t("Ngữ pháp")');
assert(pageSource.includes('{t("Luyện viết")}'), 'Writing mode tab must use t("Luyện viết")');
assert(pageSource.includes('{t("Nghe")}'), 'Listening mode tab must use t("Nghe")');
assert(pageSource.includes('{t("Từ của tôi")}'), 'My words mode tab must use t("Từ của tôi")');

// 3. Check quick lookup labels, placeholders, direction buttons wired with t
assert(pageSource.includes('quickDirection === "en-vi" ? t("Tra từ / câu tiếng Anh") : t("Dịch câu tiếng Việt → Anh")'), 'Quick lookup header direction string must use t()');
assert(pageSource.includes('{t("Anh")}'), 'English toggle button must use t("Anh")');
assert(pageSource.includes('{t("Việt")}'), 'Vietnamese toggle button must use t("Việt")');
assert(pageSource.includes('title={t("Đổi chiều tra cứu (Anh ⇄ Việt)")}'), 'Direction switch button title must use t()');
assert(pageSource.includes('aria-label={t("Đổi chiều tra cứu")}'), 'Direction switch button aria-label must use t()');
assert(pageSource.includes('aria-label={t("Từ hoặc câu cần tra")}'), 'Quick input aria-label must use t()');
assert(pageSource.includes('t("Ví dụ: I goed to school yesterday")'), 'Quick input en placeholder must use t()');
assert(pageSource.includes('t("Ví dụ: Hôm qua tôi đi học muộn vì kẹt xe")'), 'Quick input vi placeholder must use t()');
assert(pageSource.includes('title={quickDirection === "en-vi" ? t("Chọn hoặc chụp ảnh tiếng Anh") : t("Chọn hoặc chụp ảnh tiếng Việt")}'), 'Camera button title must use t()');
assert(pageSource.includes('aria-label={t("Chụp ảnh")}'), 'Camera button aria-label must use t()');
assert(pageSource.includes('{t("Đang tra...")}'), 'Lookup button loading text must use t("Đang tra...")');
assert(pageSource.includes('quickDirection === "vi-en" ? t("Dịch") : t("Tra")'), 'Lookup button action text must use t()');
assert(pageSource.includes('t("Đang tra cứu nghĩa và phiên âm...")'), 'Scan beam en-vi text must use t()');
assert(pageSource.includes('t("Đang tra cứu bản dịch tiếng Anh...")'), 'Scan beam vi-en text must use t()');
assert(pageSource.includes('{t("Tra cứu")}'), 'Scan beam badge must use t("Tra cứu")');
assert(pageSource.includes('quickResult.direction === "vi-en" ? t("🇻🇳 → 🇺🇸 Dịch sang tiếng Anh") : t("🇺🇸 → 🇻🇳 Tra cứu tiếng Anh")'), 'Result direction badge must use t()');
assert(pageSource.includes('{t("Chạm từ tiếng Anh để tra từ điển")}'), 'Result hint must use t()');
assert(pageSource.includes('title={t("Nghe đọc tiếng Anh")}'), 'Speak button title must use t()');
assert(pageSource.includes('aria-label={t("Nghe tiếng Anh")}'), 'Speak button aria-label must use t()');
assert(pageSource.includes('{t("Sửa:")}'), 'Correction tag must use t("Sửa:")');
assert(pageSource.includes('{t("Nghĩa")}:'), 'Meaning tag must use t("Nghĩa"):');
assert(pageSource.includes('{t("Giải thích")}:'), 'Note tag must use t("Giải thích"):');

// 4. Verify catalog completeness for all newly introduced keys across 4 locales
const newKeys = [
  'Chọn kỹ năng',
  'Từ của tôi',
  'Tra từ / câu tiếng Anh',
  'Dịch câu tiếng Việt → Anh',
  'Anh',
  'Việt',
  'Đổi chiều tra cứu (Anh ⇄ Việt)',
  'Đổi chiều tra cứu',
  'Từ hoặc câu cần tra',
  'Ví dụ: I goed to school yesterday',
  'Ví dụ: Hôm qua tôi đi học muộn vì kẹt xe',
  'Chọn hoặc chụp ảnh tiếng Anh',
  'Chọn hoặc chụp ảnh tiếng Việt',
  'Chụp ảnh',
  'Đang tra...',
  'Dịch',
  'Tra',
  'Đang tra cứu nghĩa và phiên âm...',
  'Đang tra cứu bản dịch tiếng Anh...',
  'Tra cứu',
  'Gõ câu tiếng Anh hoặc bấm 📷 để sửa lỗi & dịch nghĩa.',
  'Gõ câu tiếng Việt hoặc bấm 📷 để dịch sang tiếng Anh tự nhiên.',
  'Phím Enter ↵ để tra',
  '🇻🇳 → 🇺🇸 Dịch sang tiếng Anh',
  '🇺🇸 → 🇻🇳 Tra cứu tiếng Anh',
  'Chạm từ tiếng Anh để tra từ điển',
  'Nghe đọc tiếng Anh',
  'Nghe tiếng Anh',
  'Sửa:',
];

const locales = ['en', 'ja', 'ko', 'zh-TW'];
for (const key of newKeys) {
  assert(UI_TRANSLATIONS[key], `Missing catalog key: ${key}`);
  for (const loc of locales) {
    assert(
      typeof UI_TRANSLATIONS[key][loc] === 'string' && UI_TRANSLATIONS[key][loc].trim().length > 0,
      `Key "${key}" must have nonempty translation for locale "${loc}"`
    );
  }
  // Default vi must return original text
  assert.equal(translateUi(key, 'vi'), key);
  assert.equal(translateUi(key), key);
}

// 5. Verify API payloads remain untranslated and intact
assert(pageSource.includes('body: JSON.stringify({ imageId, targetLang })'), 'Analyze payload must remain untranslated');
assert(pageSource.includes('form.append("direction", dir)'), 'Lookup direction payload must remain intact');

console.log('PASS checks/home-ui-language.mjs: All controls wired with t(), 4 locales complete, payloads preserved');
