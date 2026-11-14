import { NextResponse } from 'next/server';
import { cacheOwner } from '../session/owner';
import { callJson } from '../../../lib/lessons/ai';
import { cachedLookup, cacheLookup } from '../../../lib/lookup/cache';
import { normalizeTargetLang, DEFAULT_LANGUAGE } from '../../../lib/lookup/languages.mjs';
import { languageInstruction } from '../../../lib/lessons/language.mjs';

const memCache = new Map();

function practiceKey(word, targetLang = DEFAULT_LANGUAGE) {
  if (targetLang === DEFAULT_LANGUAGE) {
    return JSON.stringify(['pron-practice-v1', word.trim().toLowerCase()]);
  }
  return JSON.stringify(['pron-practice-i18n-v1', targetLang, word.trim().toLowerCase()]);
}

function memCacheKey(owner, targetLang, word) {
  return `${owner}:${targetLang}:${word.trim().toLowerCase()}`;
}

export async function GET(request) {
  const owner = cacheOwner(request);
  if (!owner) return NextResponse.json({ error: 'Cần đăng nhập qua Kong' }, { status: 401 });

  const url = new URL(request.url);
  const targetLang = normalizeTargetLang(url.searchParams.get('targetLang'));
  if (!targetLang) {
    return NextResponse.json({ error: 'Ngôn ngữ không được hỗ trợ' }, { status: 400 });
  }

  const word = (url.searchParams.get('word') || '').trim();
  if (!word || word.length > 160 || /[\x00-\x1f]/.test(word)) {
    return NextResponse.json({ error: 'Từ không hợp lệ' }, { status: 400 });
  }

  const normalized = word.toLowerCase();
  const mKey = memCacheKey(owner, targetLang, normalized);
  const cKey = practiceKey(normalized, targetLang);

  // 1. Memory cache check
  if (memCache.has(mKey)) {
    return NextResponse.json(memCache.get(mKey), {
      headers: { 'Cache-Control': 'private, no-store', 'X-Practice-Cache': 'MEM' },
    });
  }

  // 2. Sqlite lookup cache check
  try {
    const cached = cachedLookup(owner, cKey);
    if (cached && cached.collocation?.phrase && cached.sentence?.text) {
      memCache.set(mKey, cached);
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'private, no-store', 'X-Practice-Cache': 'SQLITE' },
      });
    }
  } catch {}

  // 3. AI call via callJson
  try {
    const viPrompt = `Create one natural, common English collocation and one natural sentence for the word ${JSON.stringify(word)}.
The sentence MUST contain both the word and the collocation.
Provide Vietnamese meanings.
Return ONLY JSON with this shape:
{
  "word": ${JSON.stringify(word)},
  "collocation": {
    "phrase": "common English collocation/phrase",
    "meaning": "Vietnamese meaning of the collocation"
  },
  "sentence": {
    "text": "English sentence containing the word and collocation",
    "meaning": "Vietnamese translation of the sentence"
  }
}
No markdown.`;

    const prompt = targetLang === DEFAULT_LANGUAGE
      ? viPrompt
      : `${viPrompt}${languageInstruction(targetLang)}
- Ensure collocation.meaning and sentence.meaning are translated into the target language; keep English source (word, collocation.phrase, sentence.text) in English untouched.`;

    const result = await callJson(
      [{ type: 'text', text: prompt }],
      {
        shape: 'object',
        maxTokens: 800,
        stage: 'pronunciation-practice',
      }
    );

    if (
      !result ||
      typeof result.collocation?.phrase !== 'string' ||
      typeof result.collocation?.meaning !== 'string' ||
      typeof result.sentence?.text !== 'string' ||
      typeof result.sentence?.meaning !== 'string'
    ) {
      throw new Error('AI output format invalid');
    }

    const payload = {
      word,
      collocation: {
        phrase: result.collocation.phrase.trim(),
        meaning: result.collocation.meaning.trim(),
      },
      sentence: {
        text: result.sentence.text.trim(),
        meaning: result.sentence.meaning.trim(),
      },
    };

    memCache.set(mKey, payload);
    try {
      cacheLookup(owner, cKey, payload);
    } catch {}

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Không tạo được bài luyện tập' }, { status: 500 });
  }
}
