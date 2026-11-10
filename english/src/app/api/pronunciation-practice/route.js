import { NextResponse } from 'next/server';
import { cacheOwner } from '../session/owner';
import { callJson } from '../../../lib/lessons/ai';
import { cachedLookup, cacheLookup } from '../../../lib/lookup/cache';

const memCache = new Map();

function practiceKey(word) {
  return JSON.stringify(['pron-practice-v1', word.trim().toLowerCase()]);
}

export async function GET(request) {
  const owner = cacheOwner(request);
  if (!owner) return NextResponse.json({ error: 'Cần đăng nhập qua Kong' }, { status: 401 });

  const url = new URL(request.url);
  const word = (url.searchParams.get('word') || '').trim();
  if (!word || word.length > 160 || /[\x00-\x1f]/.test(word)) {
    return NextResponse.json({ error: 'Từ không hợp lệ' }, { status: 400 });
  }

  const normalized = word.toLowerCase();
  const cKey = practiceKey(normalized);

  // 1. Memory cache check
  if (memCache.has(normalized)) {
    return NextResponse.json(memCache.get(normalized), {
      headers: { 'Cache-Control': 'private, no-store', 'X-Practice-Cache': 'MEM' },
    });
  }

  // 2. Sqlite lookup cache check
  try {
    const cached = cachedLookup(owner, cKey);
    if (cached && cached.collocation?.phrase && cached.sentence?.text) {
      memCache.set(normalized, cached);
      return NextResponse.json(cached, {
        headers: { 'Cache-Control': 'private, no-store', 'X-Practice-Cache': 'SQLITE' },
      });
    }
  } catch {}

  // 3. AI call via callJson
  try {
    const prompt = `Create one natural, common English collocation and one natural sentence for the word ${JSON.stringify(word)}.
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

    memCache.set(normalized, payload);
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
