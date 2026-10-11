'use client';
import { useEffect, useRef, useState } from 'react';
import { weekStart } from '../lib/words/week';
import { parseApiResponse, formatErrorMessage } from './fetch-helper';
export default function MyWords({onLookup}) {
  const [rows,setRows]=useState([]), [next,setNext]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [week,setWeek]=useState(weekStart()), [weeks,setWeeks]=useState([]), [review,setReview]=useState(false), [card,setCard]=useState(0);
  const requestVersion = useRef(0);
  const load = async (cursor=null) => {
    const version = ++requestVersion.current;
    setBusy(true); setError('');
    try { const data=await parseApiResponse(await fetch('/api/my-words?week='+week+(cursor?'&before='+cursor:''),{cache:'no-store'})); if (version !== requestVersion.current) return; setRows(current=>cursor?[...current,...data.words]:data.words); setNext(data.next); setWeeks(data.weeks); }
    catch(e){if(version === requestVersion.current)setError(formatErrorMessage(e));} finally{if(version === requestVersion.current)setBusy(false);}
  };
  useEffect(() => { setRows([]); setNext(null); setReview(false); setCard(0); load(); return () => { requestVersion.current++; }; }, [week]);
  return <section className="mb-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
    <header className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-indigo-200">Từ đã tra</h2><p className="mt-1 text-sm text-slate-400">Bộ từ riêng của bạn. Chọn một mục để xem nghĩa và ôn lại.</p></div>
      <button disabled={busy} onClick={()=>load()} className="min-h-11 shrink-0 rounded-xl bg-slate-800 px-3 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">Làm mới</button>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950/50 p-3">
      <label className="text-xs text-slate-400">Tuần · giờ Việt Nam<select aria-label="Tuần ôn tập" value={week} onChange={e=>setWeek(e.target.value)} className="mt-1 block min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-200">{[...new Set([weekStart(),...weeks.map(w=>w.week)])].sort().reverse().map(w=><option key={w} value={w}>{w}{w===weekStart()?' · tuần này':''}</option>)}</select></label>
      <div className="text-right"><p className="text-lg font-semibold text-indigo-200">{weeks.find(w=>w.week===week)?.count || 0} mục</p><button disabled={!rows.length||busy} onClick={()=>{setReview(!review);setCard(0);}} className="min-h-11 text-sm text-indigo-200 disabled:opacity-40">{review?'Xem danh sách':'Ôn tuần này'}</button></div>
    </div>
    {review && rows[card] && <div className="space-y-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 text-center"><p className="text-xs text-slate-400">Tự nhớ nghĩa trước khi mở · {card+1}/{rows.length}{next?' mục đã tải':''}</p><p className="break-words text-2xl font-semibold text-indigo-100">{rows[card].english}</p><button onClick={()=>onLookup(rows[card].english)} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white">Xem nghĩa</button><div className="flex justify-between"><button disabled={card===0} onClick={()=>setCard(card-1)} className="min-h-11 text-sm text-slate-300 disabled:opacity-30">Trước</button><button disabled={card===rows.length-1} onClick={()=>setCard(card+1)} className="min-h-11 text-sm text-indigo-200 disabled:opacity-30">Tiếp</button></div></div>}
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!busy&&!error&&!rows.length&&<div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center"><p className="font-medium text-slate-300">Chưa có từ đã tra</p><p className="mt-2 text-sm text-slate-500">Tra Anh–Việt hoặc Việt–Anh để thêm vào bộ từ của bạn.</p></div>}
    {!review && <ul className="space-y-2">{rows.map(row=><li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"><span className="min-w-0 break-words text-sm font-medium text-slate-200">{row.english}{row.searches>1&&<span title={`Tra lại ${row.searches-1} lần (tổng cộng)`} aria-label={`Tra lại ${row.searches-1} lần`} className="ml-2 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200">↻ {row.searches-1}</span>}</span><button onClick={()=>onLookup(row.english)} className="min-h-11 shrink-0 rounded-lg bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20">Xem nghĩa</button></li>)}</ul>}
    {busy&&<p role="status" className="text-sm text-slate-400">Đang tải…</p>}
    {next&&<button disabled={busy} onClick={()=>load(next)} className="min-h-11 w-full rounded-xl bg-slate-800 text-sm text-indigo-200 hover:bg-slate-700 disabled:opacity-50">Tải thêm</button>}
  </section>;
}
export async function rememberEnglish(english) {
  const res=await fetch('/api/my-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({english})});
  if (!res.ok && res.status!==401) throw new Error('Không lưu được từ đã tra');
}
