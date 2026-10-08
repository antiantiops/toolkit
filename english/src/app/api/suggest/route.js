import { NextResponse } from 'next/server';

export async function GET(request) {
  const prefix = new URL(request.url).searchParams.get('q') || '';
  if (!/^[a-zA-Z]{2,40}$/.test(prefix)) return NextResponse.json({ words: [] });
  try {
    // ponytail: Datamuse word completion; ship local dictionary if offline support is required.
    const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(prefix.toLowerCase())}&max=5`, { signal: AbortSignal.timeout(3000), next: { revalidate: 86400 } });
    if (!res.ok) throw new Error('Suggestion provider unavailable');
    const data = await res.json();
    const words = data.filter(x => typeof x.word === 'string' && /^[a-zA-Z'-]{2,60}$/.test(x.word) && x.word.toLowerCase().startsWith(prefix.toLowerCase())).map(x => x.word).slice(0, 5);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ words: [] });
  }
}
