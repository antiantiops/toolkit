import { cacheOwner } from './owner';
import { NextResponse } from "next/server";
import { loadSession, deleteSession } from "./storage";
import { pronunciation } from '../../../lib/lookup/pronunciation';
import { normalizeTargetLang } from '../../../lib/lookup/languages.mjs';

const VALID_DELETE_TYPES = new Set(['vocab', 'grammar', 'writing', 'listening']);

export async function GET(request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!cacheOwner(request)) return NextResponse.json({ error: "Cần đăng nhập qua Kong" }, { status: 401, headers });
  const sid = cacheOwner(request);
  if (!sid) return NextResponse.json({ session: null }, { headers });

  const query = new URL(request.url).searchParams;
  const rawTargetLang = query.get('targetLang');
  const targetLang = normalizeTargetLang(rawTargetLang);
  if (!targetLang) return NextResponse.json({ error: 'Invalid targetLang' }, { status: 400, headers });

  const data = loadSession(sid, targetLang);
  const type = query.get('type');
  const fields = { vocab: ['words'], grammar: ['grammar'], writing: ['writing', 'modelDraft'], listening: ['listening'], previews: ['preview', 'gPreview', 'wPreview1', 'wPreview2', 'lPreview'] };
  if (type === 'manifest') return NextResponse.json({ available: { vocab: !!data?.words?.length, grammar: !!data?.grammar, writing: !!data?.writing, listening: !!data?.listening } }, { headers });
  if (type && !fields[type]) return NextResponse.json({ error: 'Invalid session type' }, { status: 400, headers });
  const enrichWords = words => (words || []).map(w => {
    if (w.pronunciation) return w;
    const p = typeof w.word === 'string' ? pronunciation(w.word) : null;
    return p ? { ...w, pronunciation: p } : w;
  });
  if (type === 'vocab') {
    const offset = Number(query.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return NextResponse.json({ error: 'Invalid offset' }, { status: 400, headers });
    const words = enrichWords(data?.words);
    return NextResponse.json({ session: { words: words.slice(offset, offset + 10) }, next: offset + 10 < words.length ? offset + 10 : null, total: words.length }, { headers });
  }
  if (data?.words) data.words = enrichWords(data.words);
  const session = !data ? null : type ? Object.fromEntries(fields[type].filter(k => k in data).map(k => [k, data[k]])) : data;
  return NextResponse.json({ session }, { headers });
}

export async function DELETE(request) {
  if (!cacheOwner(request)) return NextResponse.json({ error: "Cần đăng nhập qua Kong" }, { status: 401 });
  const sid = cacheOwner(request);
  const query = new URL(request.url).searchParams;
  const rawTargetLang = query.get('targetLang');
  const targetLang = normalizeTargetLang(rawTargetLang);
  if (!targetLang) return NextResponse.json({ error: 'Invalid targetLang' }, { status: 400 });

  const type = query.get("type");
  if (type !== null && type !== '' && !VALID_DELETE_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid session type' }, { status: 400 });
  }

  const effectiveType = type || undefined;
  if (sid) deleteSession(sid, effectiveType, targetLang);
  const res = NextResponse.json({ ok: true });
  if (!effectiveType) res.cookies.delete("vocab_sid");
  return res;
}
