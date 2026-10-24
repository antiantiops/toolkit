import { NextResponse } from 'next/server';
import { pronunciation } from '../../../lib/lookup/pronunciation';
export async function GET(request) {
  const word = new URL(request.url).searchParams.get('word') || '';
  if (!/^[A-Za-z][A-Za-z'-]{0,63}$/.test(word)) return NextResponse.json({ error: 'Invalid word' }, { status: 400 });
  return NextResponse.json({ pronunciation: pronunciation(word) }, { headers: { 'Cache-Control': 'public, max-age=604800' } });
}
