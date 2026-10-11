'use client';
import { useEffect, useRef, useState } from 'react';
import { weekStart } from '../lib/words/week';
import { parseApiResponse, formatErrorMessage } from './fetch-helper';
export default function MyWords({onLookup}) {
  const [rows,setRows]=useState([]), [next,setNext]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [week,setWeek]=useState(weekStart()), [weeks,setWeeks]=useState([]), [review,setReview]=useState(false), [card,setCard]=useState(0);
  const requestVersion = useRef(0);
  const gesture = useRef(null), suppressClick = useRef(false);
  const [drag,setDrag] = useState(0);
  const moveCard = direction => setCard(current => Math.max(0,Math.min(rows.length-1,current+direction)));
  const finishSwipe = e => {
    const start = gesture.current; gesture.current = null;
    if (!start) return;
    const dx = e.clientX-start.x, dy=e.clientY-start.y;
    suppressClick.current = Math.abs(dx)>12 || Math.abs(dy)>12;
    if (Math.abs(dx)>=60 && Math.abs(dx)>Math.abs(dy)*1.3) moveCard(dx>0?1:-1);
    setDrag(0);
  };
  const load = async (cursor=null) => {
    const version = ++requestVersion.current;
    setBusy(true); setError('');
    try { const data=await parseApiResponse(await fetch('/api/my-words?week='+week+(cursor?'&before='+cursor:''),{cache:'no-store'})); if (version !== requestVersion.current) return; setRows(current=>cursor?[...current,...data.words]:data.words); setNext(data.next); setWeeks(data.weeks); }
    catch(e){if(version === requestVersion.current)setError(formatErrorMessage(e));} finally{if(version === requestVersion.current)setBusy(false);}
  };
  useEffect(() => { setRows([]); setNext(null); setReview(false); setCard(0); load(); return () => { requestVersion.current++; }; }, [week]);
  const weekLabel = value => {
    const start = new Date(value+'T00:00:00Z'), end = new Date(start); end.setUTCDate(end.getUTCDate()+6);
    const format = d => d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',timeZone:'UTC'});
    return `${format(start)} – ${format(end)} · ${start.getUTCFullYear()}`;
  };
  const summary = weeks.find(w=>w.week===week);
  return <section className="mb-6 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
    <header className="flex items-start justify-between gap-3">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-300">Bộ từ cá nhân</p><h2 className="text-xl font-semibold text-slate-100">Một tuần, một bước tiến</h2></div>
      <button aria-label="Làm mới danh sách" title="Làm mới" disabled={busy} onClick={()=>load()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50">↻</button>
    </header>
    <div className="space-y-3">
      <label className="block text-xs text-slate-400">Tuần học · giờ Việt Nam<select aria-label="Tuần ôn tập" value={week} onChange={e=>setWeek(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{[...new Set([weekStart(),...weeks.map(w=>w.week)])].sort().reverse().map(w=><option key={w} value={w}>{weekLabel(w)}{w===weekStart()?' · tuần này':''}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-500/10 px-4 py-3"><p className="text-2xl font-semibold tabular-nums text-indigo-200">{summary?.count || 0}</p><p className="mt-1 text-xs text-slate-400">Từ / cụm từ</p></div>
        <div className="rounded-xl bg-slate-800/60 px-4 py-3"><p className="text-2xl font-semibold tabular-nums text-slate-200">{summary?.searches || 0}</p><p className="mt-1 text-xs text-slate-400">Lượt tra trong tuần</p></div>
      </div>
      <button disabled={!rows.length||busy} onClick={()=>{setReview(!review);setCard(0);}} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-40"><span aria-hidden="true">{review?'☰':'▷'}</span>{review?'Trở về danh sách':'Bắt đầu ôn tuần đã chọn'}</button>
    </div>
    {review && rows[card] && <div className="relative px-1 pb-2 pt-2">
      <div aria-hidden="true" className="absolute inset-x-4 bottom-0 top-5 rounded-3xl border border-indigo-500/20 bg-indigo-950/30" />
      <div role="button" tabIndex={0} aria-label={`${rows[card].english}. Bấm xem nghĩa chi tiết. Phím phải: từ tiếp theo; phím trái: từ trước.`}
        onPointerDown={e=>{ if(e.button!==0)return; suppressClick.current=false; gesture.current={x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e=>{const start=gesture.current;if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>Math.abs(dy)*1.3)setDrag(Math.max(-120,Math.min(120,dx)));}}}
        onPointerUp={finishSwipe} onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;setDrag(0);}}
        onClick={()=>{if(!suppressClick.current)onLookup(rows[card].english);suppressClick.current=false;}}
        onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();moveCard(1);}else if(e.key==='ArrowLeft'){e.preventDefault();moveCard(-1);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();onLookup(rows[card].english);}}}
        style={{touchAction:'pan-y',transform:`translateX(${drag}px) rotate(${drag/20}deg)`}}
        className={`relative flex min-h-72 cursor-pointer select-none flex-col items-center justify-between rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-center shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${drag?'':'transition-transform motion-reduce:transition-none'}`}>
        <p aria-live="polite" className="text-xs text-slate-400">{card+1}/{rows.length}{next?' mục đã tải':''} · Tự nhớ nghĩa trước khi mở</p>
        <div className="my-8"><p className="break-words text-3xl font-semibold text-indigo-100">{rows[card].english}</p>{rows[card].searches>1&&<span className="mt-3 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">↻ Tra lại {rows[card].searches-1} lần</span>}</div>
        <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm text-indigo-200">Bấm thẻ để xem nghĩa chi tiết</span>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-2"><button disabled={card===0} onClick={()=>moveCard(-1)} className="min-h-11 rounded-full bg-slate-800 px-4 text-sm text-slate-300 disabled:opacity-30">← Trước</button><span className="text-center text-xs text-slate-500">Quẹt trái: trước<br/>Quẹt phải: tiếp</span><button disabled={card===rows.length-1} onClick={()=>moveCard(1)} className="min-h-11 rounded-full bg-indigo-500/15 px-4 text-sm text-indigo-200 disabled:opacity-30">Tiếp →</button></div>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!busy&&!error&&!rows.length&&<div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center"><p className="font-medium text-slate-300">Chưa có từ đã tra</p><p className="mt-2 text-sm text-slate-500">Tra Anh–Việt hoặc Việt–Anh để thêm vào bộ từ của bạn.</p></div>}
    {!review && !!rows.length && <div className="flex items-center justify-between border-t border-slate-800 pt-4"><h3 className="text-sm font-semibold text-slate-300">Từ trong tuần</h3><span className="text-xs text-slate-500">↻ Số lần tra lại tổng cộng</span></div>}
    {!review && <ul className="space-y-2">{rows.map(row=><li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/40 px-4 py-3 hover:bg-slate-800/60"><span className="min-w-0 break-words text-sm font-medium text-slate-200">{row.english}{row.searches>1&&<span title={`Tra lại ${row.searches-1} lần (tổng cộng)`} aria-label={`Tra lại ${row.searches-1} lần`} className="ml-2 inline-flex rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200">↻ {row.searches-1}</span>}</span><button onClick={()=>onLookup(row.english)} className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/10">Xem nghĩa</button></li>)}</ul>}
    {busy&&<p role="status" className="text-sm text-slate-400">Đang tải…</p>}
    {next&&<button disabled={busy} onClick={()=>load(next)} className="min-h-11 w-full rounded-xl bg-slate-800 text-sm text-indigo-200 hover:bg-slate-700 disabled:opacity-50">Tải thêm</button>}
  </section>;
}
export async function rememberEnglish(english) {
  const res=await fetch('/api/my-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({english})});
  if (!res.ok && res.status!==401) throw new Error('Không lưu được từ đã tra');
}
