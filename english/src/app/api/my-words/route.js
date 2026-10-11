import { NextResponse } from 'next/server';
import { currentUser } from '../me/auth';
import { saveWord, listWords } from '../../../lib/words/store';
export const dynamic = 'force-dynamic';
const reply = (data,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request) {
  const user = currentUser(request);
  if (!user) return reply({error:'Cần đăng nhập qua Kong'},401);
  const raw = new URL(request.url).searchParams.get('before');
  const before = raw === null ? Number.MAX_SAFE_INTEGER : Number(raw);
  if (!Number.isSafeInteger(before) || before <= 0) return reply({error:'Invalid cursor'},400);
  try { const rows = listWords(user.id,before); return reply({words:rows.slice(0,50),next:rows.length>50 ? rows[49].id : null}); }
  catch { return reply({error:'Không tải được từ đã tra'},503); }
}
export async function POST(request) {
  const user = currentUser(request);
  if (!user) return reply({error:'Cần đăng nhập qua Kong'},401);
  const origin = request.headers.get('origin');
  if (origin && origin !== 'https://english.nimtechnology.com') return reply({error:'Invalid origin'},403);
  if (Number(request.headers.get('content-length')) > 4096) return reply({error:'Input too large'},413);
  try {
    const {english} = await request.json();
    if (typeof english !== 'string' || !english.trim() || english.length>500 || !/^[A-Za-z\s\d'’.,!?;:()\-]+$/.test(english)) return reply({error:'Invalid English text'},400);
    saveWord(user.id,english); return reply({ok:true});
  } catch { return reply({error:'Không lưu được từ'},503); }
}
