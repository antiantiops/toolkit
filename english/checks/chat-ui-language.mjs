import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

console.log('=== TEST CHAT UI LANGUAGE WIRING & CATALOG ===');

const requiredLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify required chat UI phrases exist in UI_TRANSLATIONS with all 4 target languages
const chatUiKeys = [
  'Mở chat với AI; kéo để di chuyển',
  'Chat AI · kéo để di chuyển',
  'Chat với AI về bài học',
  'Kéo để đổi chiều cao chat',
  'Kéo lên để mở rộng, kéo xuống để thu gọn. Phím mũi tên để điều chỉnh.',
  'Thu nhỏ chat',
  'Hỏi thêm về câu, từ hoặc quy tắc đang học. Nội dung bài hiện tại được gửi cùng câu hỏi; không gửi ảnh hay toàn màn hình.',
  'Bạn',
  'AI',
  'Đã lưu',
  'từ/cụm vào My Words:',
  'Hoàn tác',
  'Nối lại',
  'Tải lại / đăng nhập',
  'Công cụ và câu hỏi gợi ý',
  'Công cụ chat',
  'Tự lưu từ vào My Words',
  'Lịch sử riêng theo tài khoản · Lưu 7 ngày',
  'Tạo prompt luyện với AI khác',
  'Giải thích bài dễ hiểu hơn',
  'Cho ví dụ khác',
  'Hỏi tôi từng câu',
  'Xóa chat',
  'Câu hỏi cho AI',
  'Vì sao câu này dùng thì đó?',
  'Gửi',
  'Bảng trong câu trả lời',
  'Prompt / nội dung sao chép',
  'Copy prompt',
  'Đã sao chép',
  'Đã sao chép nội dung',
  'Trình duyệt chặn clipboard. Nội dung đã được chọn; nhấn giữ và chọn Sao chép.',
  'Nội dung prompt để sao chép thủ công',
  'Xem nội dung đầy đủ',
  'Không đổi được tự lưu. Thử lại.',
  'Không hoàn tác được. Thử lại.',
  'AI đang trả lời…',
  'Không tải được lịch sử chat. Tải lại để thử.',
];

for (const key of chatUiKeys) {
  assert(
    Object.prototype.hasOwnProperty.call(UI_TRANSLATIONS, key),
    `UI_TRANSLATIONS must contain key: "${key}"`
  );
  const entry = UI_TRANSLATIONS[key];
  for (const loc of requiredLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Key "${key}" must have nonempty translation for locale "${loc}"`
    );
    assert.equal(translateUi(key, loc), entry[loc]);
  }
  // Default 'vi' returns original Vietnamese string unchanged
  assert.equal(translateUi(key, 'vi'), key);
  assert.equal(translateUi(key), key);
}

// 2. Verify LessonChat.js source wiring contracts
console.log('--- Checking LessonChat.js source code contracts ---');
const chatSource = fs.readFileSync(path.resolve('src/app/LessonChat.js'), 'utf8');

// Preservation checks
assert(chatSource.includes('const { targetLang } = useLanguage();'), 'Preserves targetLang destructuring line');
assert(chatSource.includes('pendingChat(targetLang)'), 'Preserves pendingChat(targetLang)');
assert(chatSource.includes('targetLang,requestId:'), 'Preserves targetLang in requestChat payload');
assert(chatSource.includes('/api/chat?history=1&targetLang='), 'Preserves targetLang in history query');

// Wiring checks: useLanguage must supply t
assert(chatSource.includes('useLanguage()'), 'LessonChat calls useLanguage()');
assert(/const\s*\{\s*t(\s*=\s*[^}]+)?\s*\}\s*=\s*useLanguage\(\)/.test(chatSource), 'LessonChat destructures t from useLanguage()');

// Visible static UI labels wrapped in t(...)
assert(chatSource.includes("aria-label={t('Mở chat với AI; kéo để di chuyển')}"), 'Toggle aria-label wrapped with t()');
assert(chatSource.includes("title={t('Chat AI · kéo để di chuyển')}"), 'Toggle title wrapped with t()');
assert(chatSource.includes("aria-label={t('Chat với AI về bài học')}"), 'Panel aria-label wrapped with t()');
assert(chatSource.includes("aria-label={t('Kéo để đổi chiều cao chat')}"), 'Resize handle aria-label wrapped with t()');
assert(chatSource.includes("title={t('Kéo lên để mở rộng, kéo xuống để thu gọn. Phím mũi tên để điều chỉnh.')}"), 'Resize handle title wrapped with t()');
assert(chatSource.includes("aria-label={t('Thu nhỏ chat')}"), 'Close button aria-label wrapped with t()');
assert(chatSource.includes("t('Hỏi thêm về câu, từ hoặc quy tắc đang học. Nội dung bài hiện tại được gửi cùng câu hỏi; không gửi ảnh hay toàn màn hình.')"), 'Empty state message wrapped with t()');
assert(chatSource.includes('t("Bạn")'), 'User label wrapped with t()');
assert(chatSource.includes('t("AI")'), 'AI label wrapped with t()');
assert(chatSource.includes("t('Đã lưu')"), 'Saved words label wrapped with t()');
assert(chatSource.includes("t('từ/cụm vào My Words:')"), 'My words count label wrapped with t()');
assert(chatSource.includes("t('Hoàn tác')"), 'Undo button wrapped with t()');
assert(chatSource.includes("t('Nối lại')"), 'Resume button wrapped with t()');
assert(chatSource.includes("t('Tải lại / đăng nhập')"), 'Reload button wrapped with t()');
assert(chatSource.includes("aria-label={t('Công cụ và câu hỏi gợi ý')}"), 'Tools button aria-label wrapped with t()');
assert(chatSource.includes("aria-label={t('Công cụ chat')}"), 'Tools menu aria-label wrapped with t()');
assert(chatSource.includes("t('Tự lưu từ vào My Words')"), 'Auto-save checkbox label wrapped with t()');
assert(chatSource.includes("t('Lịch sử riêng theo tài khoản · Lưu 7 ngày')"), 'History notice wrapped with t()');
assert(chatSource.includes("t('Tạo prompt luyện với AI khác')"), 'Export prompt button label wrapped with t()');
assert(chatSource.includes('t("Giải thích bài dễ hiểu hơn")'), 'Suggested question 1 wrapped with t()');
assert(chatSource.includes('t("Cho ví dụ khác")'), 'Suggested question 2 wrapped with t()');
assert(chatSource.includes('t("Hỏi tôi từng câu")'), 'Suggested question 3 wrapped with t()');
assert(chatSource.includes("t('Xóa chat')"), 'Clear chat button wrapped with t()');
assert(chatSource.includes("aria-label={t('Câu hỏi cho AI')}"), 'Input textarea aria-label wrapped with t()');
assert(chatSource.includes("placeholder={t('Vì sao câu này dùng thì đó?')}"), 'Input placeholder wrapped with t()');
assert(chatSource.includes("t('Gửi')"), 'Submit button wrapped with t()');
assert(chatSource.includes("aria-label={t('Bảng trong câu trả lời')}"), 'Markdown table aria-label wrapped with t()');
assert(chatSource.includes("t('Prompt / nội dung sao chép')"), 'PromptBlock title wrapped with t()');
assert(chatSource.includes('t("Copy prompt")'), 'PromptBlock copy button wrapped with t()');
assert(chatSource.includes('t("Đã sao chép")'), 'PromptBlock copied state wrapped with t()');
assert(chatSource.includes('t("Đã sao chép nội dung")'), 'PromptBlock status wrapped with t()');
assert(chatSource.includes("t('Trình duyệt chặn clipboard. Nội dung đã được chọn; nhấn giữ và chọn Sao chép.')"), 'PromptBlock manual copy warning wrapped with t()');
assert(chatSource.includes("aria-label={t('Nội dung prompt để sao chép thủ công')}"), 'PromptBlock manual textarea label wrapped with t()');
assert(chatSource.includes("t('Xem nội dung đầy đủ')"), 'PromptBlock details summary wrapped with t()');

// Verify export prompt content semantics preserved (Vietnamese prompt to AI)
assert(chatSource.includes('Tạo một prompt tự chứa để tôi copy sang AI khác luyện tập đúng bài hiện tại.'), 'Preserves raw model prompt request content');
assert(chatSource.includes('Đặt toàn bộ prompt trong một khối ```prompt riêng; lời dẫn ngoài khối thật ngắn.'), 'Preserves raw prompt instructions');

// Markdown, resize, drag controls payloads keys preserved
assert(chatSource.includes('ReactMarkdown'), 'Preserves ReactMarkdown');
assert(chatSource.includes('remarkGfm'), 'Preserves remarkGfm');
assert(chatSource.includes('heightDrag.current'), 'Preserves height drag');
assert(chatSource.includes('drag.current'), 'Preserves bubble drag');

console.log('PASS checks/chat-ui-language.mjs: All chat visible controls translated and verified across en, ja, ko, zh-TW');
