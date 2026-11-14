import { EXTRACT_PROMPT, ENRICH_PROMPT } from './prompts.js';
import { languageInstruction } from '../lessons/language.mjs';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../lookup/languages.mjs';

export function progress(job) {
  const completed = job.batches.filter(b => b.status === 'completed').reduce((n, b) => n + b.entries.length, 0);
  return { completed, total: job.entries.length };
}

export async function runPipeline(job, { call, image, persist }) {
  job.status = 'running';
  try {
    if (!job.entries.length) {
      job.stage = 'extract';
      job.entries = await call([{ type: 'text', text: EXTRACT_PROMPT }, { type: 'image_url', image_url: { url: image } }], { requestId: job.id, stage: 'extract', maxTokens: 4096 });
      if (!Array.isArray(job.entries) || !job.entries.length || job.entries.length>100 || job.entries.some(e=>!e||typeof e.word!=='string'||!e.word.trim()||e.word.length>100||['context','definition','synonyms','antonyms'].some(f=>e[f]!==undefined&&(typeof e[f]!=='string'||e[f].length>2000))||e.unclear!==undefined&&(!Array.isArray(e.unclear)||e.unclear.length))) throw new Error('Ảnh có nội dung không đọc rõ hoặc dữ liệu không hợp lệ. Cắt/chụp rõ hơn rồi thử lại.');
      job.words = job.entries.map(e => ({ word: e.word, example: e.context || '', definition: e.definition || '', synonyms: e.synonyms || '', antonyms: e.antonyms || '', synonymsInBook: Boolean(e.synonyms), antonymsInBook: Boolean(e.antonyms), pending: true }));
      job.batches = [];
      for (let i = 0; i < job.entries.length; i += 3) job.batches.push({ offset: i, entries: job.entries.slice(i, i + 3), status: 'pending' });
    }
    delete job.error;
    job.stage = 'enrich';
    const pending = job.batches.filter(b => b.status !== 'completed');
    let cursor = 0;
    const targetLang = job.targetLang || DEFAULT_LANGUAGE;
    let enrichPrompt = ENRICH_PROMPT;
    if (targetLang !== DEFAULT_LANGUAGE) {
      const langConfig = SUPPORTED_LANGUAGES[targetLang] || SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE];
      const promptName = langConfig.promptName;
      const respellingOverride = `\nPRONUNCIATION / EASYREADING OVERRIDE — mandatory:
- In easyReading, provide IPA for both 🇬🇧 UK and 🇺🇸 US, mark primary stress, and give 1-2 SHORT practical tongue/lip placement tips in ${promptName} for tricky sounds (e.g. touch alveolar ridge for /l/, lip position for /w/ vs /v/, mouth openness for vowels).
- Do NOT use Vietnamese syllables, words, or Vietnamese respelling (no ơ/ờ/ô/ồ/o/u/i/ê/a Vietnamese vowels, no Vietnamese accents/rhymes).`;
      enrichPrompt = `${ENRICH_PROMPT}${languageInstruction(targetLang)}${respellingOverride}`;
    }
    const worker = async () => {
      while (cursor < pending.length) {
        const batch = pending[cursor++];
        batch.status = 'running'; delete batch.error;
        try {
          const result = await call(`${enrichPrompt}\nInput: ${JSON.stringify(batch.entries)}`, { requestId: job.id, stage: `batch-${batch.offset / 3 + 1}`, maxTokens: 4096 });
          if (result.length !== batch.entries.length || result.some((w, i) => w.word !== batch.entries[i].word || typeof w.meaning !== 'string')) throw new Error('Batch schema/order mismatch');
          result.forEach((w, i) => {
            const original = batch.entries[i];
            job.words[batch.offset + i] = { ...w, example: original.context || '', definition: original.definition || '', exampleVietnamese: original.context ? w.exampleVietnamese || '' : '', definitionVietnamese: original.definition ? w.definitionVietnamese || '' : '', synonyms: original.synonyms || '', antonyms: original.antonyms || '', synonymsInBook: Boolean(original.synonyms), antonymsInBook: Boolean(original.antonyms), pending: false };
          });
          batch.status = 'completed';
          persist(job.words);
        } catch (e) { batch.status = 'failed'; batch.error = e.message; }
      }
    };
    await Promise.all([worker(), worker()]);
    job.status = job.batches.some(b => b.status === 'failed') ? 'partial' : 'completed';
  } catch (e) { job.status = 'failed'; job.error = e.message; }
}
