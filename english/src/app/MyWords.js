'use client';
import { useState } from 'react';
import { parseApiResponse, formatErrorMessage } from './fetch-helper';
export default function MyWords({onLookup}) {
  const [open,setOpen]=useState(false), [rows,setRows]=useState([]), [next,setNext]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const load = async (cursor=null) => {
    setBusy(true); setError('');
    try { const data=await parseApiResponse(await fetch('/api/my-words'+(cursor?'?before='+cursor:''),{cache:'no-store'})); setRows(current=>cursor?[...current,...data.words]:data.words); setNext(data.next); }
    catch(e){setError(formatErrorMessage(e));} finally{setBusy(false);}
  };
  return <section className="mb-4 rounded-xl border border-slate-700 bg-slate-900 p-3">
    <button aria-expanded={open} onClick={()=>{setOpen(!open);if(!open)load();}} className="min-h-11 text-sm font-semibold text-teal-200">My Words · Từ đã tra</button>
    {open && <div className="space-y-2"><p className="text-xs text-slate-400">Từ/cụm từ tiếng Anh đã tra. Bấm Xem nghĩa để gọi AI.</p>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}{!busy&&!error&&!rows.length&&<p className="text-sm text-slate-400">Chưa có từ đã lưu.</p>}
    <ul className="max-h-96 overflow-y-auto">{rows.map(row=><li key={row.id} className="flex items-center justify-between gap-3 border-b border-slate-800 py-2"><span className="break-words text-sm">{row.english}</span><button onClick={()=>onLookup(row.english)} className="min-h-11 shrink-0 rounded-lg bg-slate-800 px-3 text-xs text-teal-200">Xem nghĩa</button></li>)}</ul>
    {busy&&<p role="status" className="text-xs text-slate-400">Đang tải…</p>}{next&&<button disabled={busy} onClick={()=>load(next)} className="min-h-11 text-sm text-teal-200">Tải thêm</button>}</div>}
  </section>;
}
export async function rememberEnglish(english) {
  const res=await fetch('/api/my-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({english})});
  if (!res.ok && res.status!==401) throw new Error('Không lưu được từ đã tra');
}
