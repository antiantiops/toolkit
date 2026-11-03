import { NextResponse } from 'next/server';
const cache = globalThis.wordClassCache ||= new Map();
const allowed = new Set(['noun','verb','adjective','adverb','pronoun','preposition','conjunction','determiner','interjection','article','numeral']);
export async function GET(request) {
  const word = (new URL(request.url).searchParams.get('word') || '').toLowerCase();
  if (!/^[a-z][a-z'-]{0,63}$/.test(word)) return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
  const hit = cache.get(word);
  if (hit && Date.now() - hit.at < 604800000) return NextResponse.json(hit.data);
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return NextResponse.json({ partsOfSpeech: [] });
    const entries = await response.json();
    const partsOfSpeech = [...new Set((Array.isArray(entries) ? entries : []).flatMap(e => (e.meanings || []).map(m => m.partOfSpeech)).filter(p => allowed.has(p)))];
    const data = { partsOfSpeech, source: 'Free Dictionary API' };
    if (cache.size >= 2000) cache.delete(cache.keys().next().value);
    cache.set(word, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ partsOfSpeech: [] }); }
}
