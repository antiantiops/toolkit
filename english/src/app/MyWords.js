'use client';
import { useEffect, useState } from 'react';
import { parseApiResponse, formatErrorMessage } from './fetch-helper';
export default function MyWords({onLookup}) {
  const [rows,setRows]=useState([]), [next,setNext]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const load = async (cursor=null) => {
    setBusy(true); setError('');
    try { const data=await parseApiResponse(await fetch('/api/my-words'+(cursor?'?before='+cursor:''),{cache:'no-store'})); setRows(current=>cursor?[...current,...data.words]:data.words); setNext(data.next); }
    catch(e){setError(formatErrorMessage(e));} finally{setBusy(false);}
  };
  useEffect(() => { load(); }, []);
  return <section className="mb-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
    <header className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-indigo-200">Từ đã tra</h2><p className="mt-1 text-sm text-slate-400">Bộ từ riêng của bạn. Chọn một mục để xem nghĩa và ôn lại.</p></div>
      <button disabled={busy} onClick={()=>load()} className="min-h-11 shrink-0 rounded-xl bg-slate-800 px-3 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50">Làm mới</button>
    </header>
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!busy&&!error&&!rows.length&&<div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center"><p className="font-medium text-slate-300">Chưa có từ đã tra</p><p className="mt-2 text-sm text-slate-500">Tra Anh–Việt hoặc Việt–Anh để thêm vào bộ từ của bạn.</p></div>}
    <ul className="space-y-2">{rows.map(row=><li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2"><span className="min-w-0 break-words text-sm font-medium text-slate-200">{row.english}</span><button onClick={()=>onLookup(row.english)} className="min-h-11 shrink-0 rounded-lg bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20">Xem nghĩa</button></li>)}</ul>
    {busy&&<p role="status" className="text-sm text-slate-400">Đang tải…</p>}
    {next&&<button disabled={busy} onClick={()=>load(next)} className="min-h-11 w-full rounded-xl bg-slate-800 text-sm text-indigo-200 hover:bg-slate-700 disabled:opacity-50">Tải thêm</button>}
  </section>;
}
export async function rememberEnglish(english) {
  const res=await fetch('/api/my-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({english})});
  if (!res.ok && res.status!==401) throw new Error('Không lưu được từ đã tra');
}
