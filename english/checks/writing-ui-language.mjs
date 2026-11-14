import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';

console.log('=== TEST WRITING UI LANGUAGE WIRING & TRANSLATIONS ===');

const requiredLocales = ['en', 'ja', 'ko', 'zh-TW'];
const writingSource = fs.readFileSync(path.resolve('src/app/Writing.js'), 'utf8');

// 1. Hook destructuring contract
console.log('--- 1. Testing useLanguage contract ---');
assert(
  writingSource.includes('const { targetLang } = useLanguage();'),
  'Writing.js must preserve exact targetLang destructuring line'
);
assert(
  /const\s*\{\s*t(\s*=\s*[^}]+)?\s*\}\s*=\s*useLanguage\(\)/.test(writingSource),
  'Writing.js must destructure t from useLanguage()'
);

// 2. Extract literal t(...) calls from Writing.js
console.log('--- 2. Testing literal t calls and catalog completeness ---');
const tCalls = [...writingSource.matchAll(/\bt\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
assert(tCalls.length >= 25, `Expected at least 25 t('...') calls, found ${tCalls.length}`);

// Key functional groups
const keyGroups = {
  tabs: ['📖 1. Bài mẫu', '📋 2. Đề bài & Word Bank', '🧭 3. Dàn ý gợi ý', '✍️ 4. Viết & Chấm AI', '📋 Đề bài', '🧭 Dàn ý', '✍️ Viết & chấm', '🗺️ Cấu trúc', '🧩 Câu mẫu', '✅ Tự viết & kiểm tra'],
  preferences: ['Trình độ viết (CEFR)', '− Đóng tùy chỉnh prompt', '+ Tùy chỉnh prompt', 'Tùy chỉnh cách AI viết', 'Chọn cách diễn đạt phù hợp với bạn', 'Yêu cầu của bạn', 'Khôi phục prompt mặc định', 'Lưu prompt cho tài khoản', 'Đang tạo bài mẫu…', 'Áp dụng & tạo lại bài mẫu'],
  modelDraft: ['🇻🇳 🇬🇧 Bài mẫu email đơn giản', 'Đoạn văn email tự nhiên (Bấm vào câu để tra chi tiết)', '🇻🇳 Tiếng Việt', '🇬🇧 English', '✨ Tạo bài mẫu email', 'Đang soạn bài mẫu...', '🔍 Chi tiết đối chiếu câu & từ vựng', 'Đóng'],
  review: ['🤖 AI chấm bài & nhận xét', 'AI đang phân tích và chấm bài...', '🤖 AI chấm, dùng để học tập & tham khảo', 'Đối chiếu yêu cầu đề bài:', 'Điểm tốt:', 'Các điểm cần cải thiện:', 'Bản viết lại hoàn chỉnh (tham khảo):', 'Checklist trước khi nộp']
};

for (const [group, keys] of Object.entries(keyGroups)) {
  for (const k of keys) {
    assert(
      writingSource.includes(`t("${k}")`) || writingSource.includes(`t('${k}')`),
      `Writing.js must wrap "${k}" (group: ${group}) with t()`
    );
  }
}

// Every extracted literal must have full nonempty translations across en, ja, ko, zh-TW
for (const phrase of tCalls) {
  assert(
    Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, phrase),
    `UI_TRANSLATIONS catalog must contain phrase: "${phrase}"`
  );
  const entry = UI_TRANSLATIONS[phrase];
  for (const loc of requiredLocales) {
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
  // Vietnamese identity returns original text
  assert.equal(translateUi(phrase, 'vi'), phrase);
  assert.equal(translateUi(phrase), phrase);
}

// 3. Payload and cache safety contracts
console.log('--- 3. Testing payload and cache preservation ---');
// API endpoints intact with targetLang
assert(writingSource.includes('/api/writing-lookup'), 'Preserves /api/writing-lookup');
assert(writingSource.includes('/api/writing-model'), 'Preserves /api/writing-model');
assert(writingSource.includes('/api/writing-review'), 'Preserves /api/writing-review');
assert(writingSource.includes('/api/writing-preferences'), 'Preserves /api/writing-preferences');

// targetLang is passed in all payloads
assert(/body:\s*JSON\.stringify\(\{\s*word:\s*wordClean,\s*sentence:\s*fullSentence,\s*context:\s*paraContext,\s*targetLang\s*\}\)/.test(writingSource), 'writing-lookup payload preserved');
assert(/body:\s*JSON\.stringify\(\{\s*task,\s*title:\s*w\.title,\s*level,\s*customPrompt,\s*targetLang\s*\}\)/.test(writingSource), 'writing-model payload preserved');
assert(/body:\s*JSON\.stringify\(\{\s*task:\s*\{\s*\.\.\.task,\s*title:\s*w\.title\s*\},\s*draft,\s*level,\s*customPrompt,\s*targetLang\s*\}\)/.test(writingSource), 'writing-review payload preserved');

// Local lookup cache namespaced with targetLang
assert(
  writingSource.includes('const cacheKey = `${targetLang || \'vi\'}::${wordClean.toLowerCase()}::${fullSentence}`;'),
  'Cache key must namespace by targetLang'
);

// English source and schema fieldnames preserved
assert(writingSource.includes('DEFAULT_WRITING_PROMPT'), 'DEFAULT_WRITING_PROMPT preserved');
assert(writingSource.includes('w.title'), 'w.title preserved');
assert(writingSource.includes('w.goal'), 'w.goal preserved');
assert(writingSource.includes('x.english'), 'x.english preserved');
assert(writingSource.includes('x.vietnamese'), 'x.vietnamese preserved');
assert(writingSource.includes('sample.scenario'), 'sample.scenario preserved');
assert(writingSource.includes('task.scenario'), 'task.scenario preserved');
assert(writingSource.includes('p.pattern'), 'p.pattern preserved');
assert(writingSource.includes('b.word'), 'b.word preserved');

console.log('PASS checks/writing-ui-language.mjs: All Writing UI controls translated across en, ja, ko, zh-TW; payloads, cache & contracts preserved.');
