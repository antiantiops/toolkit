import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

const allLocales = Object.keys(SUPPORTED_LANGUAGES);
const foreignLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all newly required phrases exist in UI_TRANSLATIONS with all 4 target languages
const requiredKeys = [
  'Nghe từ văn bản',
  'Nhập bài mới',
  'Tạo bài mới',
  'Dán tiếng Anh để tạo bài nghe theo câu. Giữ nguyên nội dung. Giọng Mỹ.',
  'Văn bản tiếng Anh',
  'Dán nội dung tiếng Anh vào đây…',
  'từ',
  'Đang dịch bài nghe…',
  'Tạo audio',
  'Tối đa 5.000 từ. Hãy rút ngắn văn bản trước khi tạo audio.',
  'Bài nghe gần đây',
  '· 7 ngày',
  'Đang tải…',
  'Chưa có bài nghe được lưu trong 7 ngày.',
  'File audio',
  'Văn bản',
  'Ảnh bài nghe',
  'Tiêu đề bài nghe',
  'Sửa tiêu đề bài nghe',
  'Đang lưu…',
  'Lưu',
  'Hủy',
];

for (const key of requiredKeys) {
  assert(
    Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, key),
    `UI_TRANSLATIONS must contain key: "${key}"`
  );
  const entry = UI_TRANSLATIONS[key];
  for (const loc of foreignLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Key "${key}" must have nonempty translation for locale "${loc}"`
    );
    // translateUi returns translation for non-vi
    assert.equal(translateUi(key, loc), entry[loc]);
  }
  // translateUi returns original key for default vi
  assert.equal(translateUi(key, 'vi'), key);
  assert.equal(translateUi(key), key);
}

// 2. Verify ListeningText source code contracts
const textSrc = fs.readFileSync(path.resolve('src/app/ListeningText.js'), 'utf8');
assert(textSrc.includes('useLanguage()'), 'ListeningText uses useLanguage()');
assert(textSrc.includes("t('Nghe từ văn bản')"), 'ListeningText translates "Nghe từ văn bản"');
assert(textSrc.includes("t('Nhập bài mới')"), 'ListeningText translates "Nhập bài mới"');
assert(textSrc.includes("t('Tạo bài mới')"), 'ListeningText translates "Tạo bài mới"');
assert(textSrc.includes("t('Dán tiếng Anh để tạo bài nghe theo câu. Giữ nguyên nội dung. Giọng Mỹ.')"), 'ListeningText translates help text');
assert(textSrc.includes("t('Văn bản tiếng Anh')"), 'ListeningText translates label');
assert(textSrc.includes("placeholder={t('Dán nội dung tiếng Anh vào đây…')}"), 'ListeningText translates placeholder');
assert(textSrc.includes("t('từ')"), 'ListeningText translates dynamic count label');
assert(textSrc.includes("t('Đang dịch bài nghe…')"), 'ListeningText translates busy state');
assert(textSrc.includes("t('Tạo audio')"), 'ListeningText translates button text');
assert(textSrc.includes("t('Tối đa 5.000 từ. Hãy rút ngắn văn bản trước khi tạo audio.')"), 'ListeningText translates limit warning');
// Preserves source transcript / sentences / payload
assert(textSrc.includes("JSON.stringify({title:'Bài nghe từ văn bản',sentences,targetLang})"), 'ListeningText preserves backend payload');
assert(textSrc.includes("historyEntry = (historyEntry?.lesson?.targetLang || historyEntry?.targetLang || 'vi') === targetLang ? historyEntry : null;"), 'ListeningText preserves history gate');

// 3. Verify ListeningHistory source code contracts
const historySrc = fs.readFileSync(path.resolve('src/app/ListeningHistory.js'), 'utf8');
assert(historySrc.includes('useLanguage()'), 'ListeningHistory uses useLanguage()');
assert(historySrc.includes("t('Bài nghe gần đây')"), 'ListeningHistory translates heading');
assert(historySrc.includes("t('· 7 ngày')"), 'ListeningHistory translates badge');
assert(historySrc.includes("t('Đang tải…')"), 'ListeningHistory translates loading state');
assert(historySrc.includes("t('Chưa có bài nghe được lưu trong 7 ngày.')"), 'ListeningHistory translates empty state');
assert(historySrc.includes("t(e.source==='audio'?'File audio':e.source==='text'?'Văn bản':'Ảnh bài nghe')"), 'ListeningHistory translates source type label');
assert(historySrc.includes('toLocaleString(targetLang)'), 'ListeningHistory preserves toLocaleString(targetLang)');
assert(historySrc.includes('/api/listening-history?targetLang='), 'ListeningHistory preserves targetLang in load query');
assert(historySrc.includes('&targetLang='), 'ListeningHistory preserves targetLang in open query');

// 4. Verify ListeningTitle source code contracts
const titleSrc = fs.readFileSync(path.resolve('src/app/ListeningTitle.js'), 'utf8');
assert(titleSrc.includes('useLanguage()'), 'ListeningTitle uses useLanguage()');
assert(titleSrc.includes("aria-label={t(\"Tiêu đề bài nghe\")}"), 'ListeningTitle translates aria-label on input');
assert(titleSrc.includes("aria-label={t(\"Sửa tiêu đề bài nghe\")}"), 'ListeningTitle translates aria-label on edit button');
assert(titleSrc.includes("t('Đang lưu…')"), 'ListeningTitle translates saving state');
assert(titleSrc.includes("t('Lưu')"), 'ListeningTitle translates Save button');
assert(titleSrc.includes("t('Hủy')"), 'ListeningTitle translates Cancel button');
assert(titleSrc.includes("JSON.stringify({id,title:draft,targetLang})"), 'ListeningTitle preserves PATCH payload with targetLang');

console.log('PASS checks/listening-ui-language.mjs: All listening UI controls translated and contracts verified across all 5 locales.');
