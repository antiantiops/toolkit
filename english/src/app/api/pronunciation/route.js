import { NextResponse } from 'next/server';
import { lookupOxford, validateWord } from '../../../lib/lookup/oxford.js';

export async function GET(request) {
  const word = new URL(request.url).searchParams.get('word') || '';
  if (!validateWord(word)) {
    return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
  }

  try {
    const result = await lookupOxford(word);
    return NextResponse.json(
      { pronunciation: result },
      {
        headers: {
          'Cache-Control': result ? 'public, max-age=604800' : 'public, max-age=600',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Oxford upstream error' },
      {
        status: 502,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}
