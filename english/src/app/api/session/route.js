import { NextResponse } from "next/server";
import { loadSession, deleteSession } from "./storage";

export async function GET(request) {
  const sid = request.cookies.get("vocab_sid")?.value;
  if (!sid) return NextResponse.json({ session: null });
  const data = loadSession(sid);
  const query = new URL(request.url).searchParams;
  const type = query.get('type');
  const fields = { vocab: ['words'], grammar: ['grammar'], writing: ['writing', 'modelDraft'], listening: ['listening'], previews: ['preview', 'gPreview', 'wPreview1', 'wPreview2', 'lPreview'] };
  const headers = { 'Cache-Control': 'private, no-store' };
  if (type === 'manifest') return NextResponse.json({ available: { vocab: !!data?.words?.length, grammar: !!data?.grammar, writing: !!data?.writing, listening: !!data?.listening } }, { headers });
  if (type && !fields[type]) return NextResponse.json({ error: 'Invalid session type' }, { status: 400, headers });
  if (type === 'vocab') {
    const offset = Number(query.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: 'Invalid offset' }, { status: 400, headers });
    const words = data?.words || [];
    return NextResponse.json({ session: { words: words.slice(offset, offset + 10) }, next: offset + 10 < words.length ? offset + 10 : null, total: words.length }, { headers });
  }
  const session = !data ? null : type ? Object.fromEntries(fields[type].filter(k => k in data).map(k => [k, data[k]])) : data;
  return NextResponse.json({ session }, { headers });
}

export async function DELETE(request) {
  const sid = request.cookies.get("vocab_sid")?.value;
  const type = new URL(request.url).searchParams.get("type");
  if (sid) deleteSession(sid, type);
  const res = NextResponse.json({ ok: true });
  if (!type) res.cookies.delete("vocab_sid");
  return res;
}
