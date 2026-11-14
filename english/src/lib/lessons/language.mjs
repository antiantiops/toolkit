import { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../lookup/languages.mjs';

/**
 * Returns prompt instruction snippet for target language, or '' if default (vi).
 * Preserves legacy Vietnamese keys, English source/examples untouched.
 * For non-vi languages, explicitly overrides Vietnamese output in templates to promptName.
 */
export function languageInstruction(targetLang) {
  const lang = normalizeTargetLang(targetLang);
  if (!lang || !SUPPORTED_LANGUAGES[lang]) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }
  if (lang === DEFAULT_LANGUAGE) {
    return '';
  }
  const promptName = SUPPORTED_LANGUAGES[lang].promptName;
  return `\nTARGET LANGUAGE OVERRIDE — mandatory:
- Output language for all explanations, translations, descriptions, labels, hints, strategies, checklists, and notes must be ${promptName}, NOT Vietnamese.
- Despite Vietnamese property names in schema (such as *Vietnamese, e.g. titleVietnamese, ruleVietnamese, scenarioVietnamese, labelVietnamese, etc.), provide their values in ${promptName}.
- Keep all JSON object keys exactly as defined in the schema (do NOT rename keys).
- Keep all original English source text, formulas, quotes, sentences, patterns, and English examples in English untouched.
- Translate only user-facing explanations, guidelines, and translations into ${promptName}.`;
}

export { normalizeTargetLang, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };
