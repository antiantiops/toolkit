import { NextResponse } from 'next/server';
import { currentUser } from '../me/auth';
import { saveWord, listWords, listWeeks, moveWord, tagWord } from '../../../lib/words/store';
export const dynamic = 'force-dynamic';
const reply = (data,status=200) => NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request) {
  const user = currentUser(request);
  if (!user) return reply({error:'Cần đăng nhập qua Kong'},401);
  const params = new URL(request.url).searchParams;
  const week = params.get('week');
  if (week && (!/^\d{4}-\d{2}-\d{2}$/.test(week) || Number.isNaN(Date.parse(week)))) return reply({error:'Invalid week'},400);
  const raw = params.get('before');
  const before = raw === null ? Number.MAX_SAFE_INTEGER : Number(raw);
  if (!Number.isSafeInteger(before) || before <= 0) return reply({error:'Invalid cursor'},400);
  try { const rows = listWords(user.id,before,week); return reply({weeks:listWeeks(user.id),words:rows.slice(0,50),next:rows.length>50 ? (week ? (raw === null ? 0 : before)+50 : rows[49].id) : null}); }
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

export async function PATCH(request) {
 const user=currentUser(request);if(!user)return reply({error:'Cần đăng nhập qua Kong'},401);
 const origin=request.headers.get('origin');if(origin&&origin!=='https://english.nimtechnology.com')return reply({error:'Invalid origin'},403);
 if(Number(request.headers.get('content-length'))>4096)return reply({error:'Input too large'},413);
 try {
  const {week,id,beforeId,needsReview}=await request.json();
  if(needsReview!==undefined){
   if(!Number.isSafeInteger(id)||id<=0||typeof needsReview!=='boolean')return reply({error:'Invalid tag'},400);
   tagWord(user.id,id,needsReview);return reply({ok:true});
  }
  if(typeof week!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(week)||!Number.isSafeInteger(id)||id<=0||!Number.isSafeInteger(beforeId)||beforeId<=0||id===beforeId)return reply({error:'Invalid move'},400);
  moveWord(user.id,week,id,beforeId);return reply({ok:true});
 }catch{return reply({error:'Không lưu được thứ tự. Làm mới rồi thử lại.'},400);}
}
