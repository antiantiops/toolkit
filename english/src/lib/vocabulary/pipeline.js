import { EXTRACT_PROMPT, ENRICH_PROMPT } from './prompts.js';

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
      job.words = job.entries.map(e => ({ word: e.word, example: e.context || '', synonyms: e.synonyms || '', antonyms: e.antonyms || '', synonymsInBook: Boolean(e.synonyms), antonymsInBook: Boolean(e.antonyms), pending: true }));
      job.batches = [];
      for (let i = 0; i < job.entries.length; i += 3) job.batches.push({ offset: i, entries: job.entries.slice(i, i + 3), status: 'pending' });
    }
    delete job.error;
    job.stage = 'enrich';
    const pending = job.batches.filter(b => b.status !== 'completed');
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const batch = pending[cursor++];
        batch.status = 'running'; delete batch.error;
        try {
          const result = await call(`${ENRICH_PROMPT}\nInput: ${JSON.stringify(batch.entries)}`, { requestId: job.id, stage: `batch-${batch.offset / 3 + 1}`, maxTokens: 4096 });
          if (result.length !== batch.entries.length || result.some((w, i) => w.word !== batch.entries[i].word || typeof w.meaning !== 'string')) throw new Error('Batch schema/order mismatch');
          const terms = value => String(value || '').replace(/\([^)]*\)/g, '').split(/[,;\n]/).map(t => t.trim().toLowerCase()).filter(Boolean);
          result.forEach((w, i) => {
            for (const field of ['synonyms', 'antonyms']) {
              const source = terms(batch.entries[i][field]);
              if (source.length && JSON.stringify(terms(w[field])) !== JSON.stringify(source)) throw new Error(`AI changed printed ${field} for ${w.word}`);
            }
          });
          result.forEach((w, i) => {
            const original = batch.entries[i];
            job.words[batch.offset + i] = { ...w, synonyms: original.synonyms ? w.synonyms || original.synonyms : '', antonyms: original.antonyms ? w.antonyms || original.antonyms : '', synonymsInBook: Boolean(original.synonyms), antonymsInBook: Boolean(original.antonyms), pending: false };
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
