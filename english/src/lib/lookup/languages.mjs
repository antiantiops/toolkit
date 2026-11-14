export const SUPPORTED_LANGUAGES = Object.freeze({
  vi: Object.freeze({
    code: 'vi',
    nativeLabel: 'Tiếng Việt',
    flag: '🇻🇳',
    promptName: 'Vietnamese',
  }),
  en: Object.freeze({
    code: 'en',
    nativeLabel: 'English',
    flag: '🇺🇸',
    promptName: 'English',
  }),
  ja: Object.freeze({
    code: 'ja',
    nativeLabel: '日本語',
    flag: '🇯🇵',
    promptName: 'Japanese',
  }),
  ko: Object.freeze({
    code: 'ko',
    nativeLabel: '한국어',
    flag: '🇰🇷',
    promptName: 'Korean',
  }),
  'zh-TW': Object.freeze({
    code: 'zh-TW',
    nativeLabel: '繁體中文',
    flag: '🇹🇼',
    promptName: 'Traditional Chinese',
  }),
});

export const DEFAULT_LANGUAGE = 'vi';

export function normalizeTargetLang(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return DEFAULT_LANGUAGE;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_LANGUAGE;
  }
  if (Object.prototype.hasOwnProperty.call(SUPPORTED_LANGUAGES, trimmed)) {
    return trimmed;
  }
  // Case-insensitive match check for aliases like en, EN, etc.
  const lower = trimmed.toLowerCase();
  for (const code of Object.keys(SUPPORTED_LANGUAGES)) {
    if (code.toLowerCase() === lower) {
      return code;
    }
  }
  return null;
}
