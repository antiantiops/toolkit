import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UI_TRANSLATIONS, translateUi } from '../src/lib/lookup/ui-language.mjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../src/lib/lookup/languages.mjs';

const allLocales = Object.keys(SUPPORTED_LANGUAGES);
const foreignLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Verify all required keys in UI_TRANSLATIONS
const playbackKeys = [
  'Không có timestamp',
  'Chưa có audio',
  'Bản dịch tiếng Việt',
  'Bấm từ tiếng Anh để tra nghĩa',
  'Bấm câu để nghe lại · Tự cuộn theo câu đang phát',
  'Vị trí phát toàn bài',
  'Tốc độ',
  'Tốc độ phát',
  'Câu trước',
  'Tạm dừng',
  'Phát bài nghe',
  'Câu tiếp',
  'Lặp lại toàn bài',
  'Tắt lặp lại toàn bài',
  'Bật lặp lại toàn bài',
  'Lặp: bật',
  'Lặp: tắt',
  'Transcript Listening',
];

for (const key of playbackKeys) {
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
    assert.equal(translateUi(key, loc), entry[loc]);
  }
  assert.equal(translateUi(key, 'vi'), key);
  assert.equal(translateUi(key), key);
}

// 2. Verify ListeningPlayback source contracts
const playbackSrc = fs.readFileSync(path.resolve('src/app/ListeningPlayback.js'), 'utf8');

// Imports & Hook
assert(playbackSrc.includes('import {useLanguage} from "./LanguageContext";') || playbackSrc.includes('import { useLanguage } from "./LanguageContext";'), 'imports useLanguage');
assert(playbackSrc.includes('useLanguage()'), 'invokes useLanguage()');

// Literal t calls
assert(playbackSrc.includes("t('Không có timestamp')"), 'translates "Không có timestamp"');
assert(playbackSrc.includes("t('Chưa có audio')"), 'translates "Chưa có audio"');
assert(playbackSrc.includes("t('Bản dịch tiếng Việt')"), 'translates "Bản dịch tiếng Việt"');
assert(playbackSrc.includes("t('Bấm từ tiếng Anh để tra nghĩa')"), 'translates paragraph view tip');
assert(playbackSrc.includes("t('Bấm câu để nghe lại · Tự cuộn theo câu đang phát')"), 'translates sentence view tip');
assert(playbackSrc.includes('aria-label={t("Transcript Listening")}'), 'translates Transcript Listening aria-label');
assert(playbackSrc.includes('aria-label={t("Vị trí phát toàn bài")}'), 'translates slider aria-label');
assert(playbackSrc.includes("t('Tốc độ')"), 'translates sr-only speed label');
assert(playbackSrc.includes('aria-label={t("Tốc độ phát")}'), 'translates speed select aria-label');
assert(playbackSrc.includes('aria-label={t("Câu trước")}'), 'translates prev button aria-label');
assert(playbackSrc.includes("aria-label={t(playing ? 'Tạm dừng' : 'Phát bài nghe')}"), 'translates play/pause aria-label');
assert(playbackSrc.includes('aria-label={t("Câu tiếp")}'), 'translates next button aria-label');
assert(playbackSrc.includes('aria-label={t("Lặp lại toàn bài")}'), 'translates repeat aria-label');
assert(playbackSrc.includes("title={t(repeat ? 'Tắt lặp lại toàn bài' : 'Bật lặp lại toàn bài')}"), 'translates repeat title');
assert(playbackSrc.includes("t(repeat ? 'Lặp: bật' : 'Lặp: tắt')"), 'translates repeat badge text');

// Source playback English sentences and seek handlers preserved
assert(playbackSrc.includes("clickableText(transcriptParagraph(sentences,'en'))"), 'preserves en paragraph clickableText');
assert(playbackSrc.includes("transcriptParagraph(sentences,'vi')"), 'preserves vi paragraph translation');
assert(playbackSrc.includes("{s.en}"), 'preserves sentence en text');
assert(playbackSrc.includes("{s.vi}"), 'preserves sentence vi translation');
assert(playbackSrc.includes("onClick={() => selectSentence(i)}"), 'preserves sentence click handler');
assert(playbackSrc.includes("onClick={() => selectSentence(index - 1)}"), 'preserves prev sentence click handler');
assert(playbackSrc.includes("onClick={() => selectSentence(index + 1)}"), 'preserves next sentence click handler');
assert(playbackSrc.includes("onChange={e => seek(Number(e.target.value))}"), 'preserves seek slider handler');
assert(playbackSrc.includes("audio.current.playbackRate = speed;"), 'preserves speed logic');

console.log('PASS checks/playback-ui-language.mjs: All ListeningPlayback controls translated and invariant contracts verified.');
