'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { weekStart } from '../lib/words/week';
import { parseApiResponse, formatErrorMessage } from './fetch-helper';
export default function MyWords({onLookup}) {
  const [rows,setRows]=useState([]), [next,setNext]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [week,setWeek]=useState(weekStart()), [weeks,setWeeks]=useState([]), [review,setReview]=useState(false), [card,setCard]=useState(0);
  const [tagging,setTagging]=useState(null);
  const tagWord=async row=>{
    if(tagging!==null)return;
    const version=requestVersion.current;setTagging(row.id);setError('');
    try{await parseApiResponse(await fetch('/api/my-words',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,needsReview:!row.needsReview})}));if(version===requestVersion.current)setRows(current=>current.map(r=>r.id===row.id?{...r,needsReview:!row.needsReview}:r));}
    catch(e){if(version===requestVersion.current)setError(formatErrorMessage(e));}finally{setTagging(null);}
  };
  const [pronunciations,setPronunciations] = useState({});
  const pronunciationCache = useRef(new Map());
  useEffect(() => {
    const word = review && rows[card]?.english;
    if (!word) return;
    if (pronunciationCache.current.has(word)) { setPronunciations(current=>({...current,[word]:pronunciationCache.current.get(word)})); return; }
    const controller = new AbortController();
    fetch('/api/word',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word}),signal:controller.signal})
      .then(parseApiResponse).then(data=>{
        const ipa = data.word.ipa || '';
        const usIpa = ipa.match(/US[^/]*(\/[^/]+\/)/i)?.[1] || ipa.match(/(\/[^/]+\/)\s*\(US\)/i)?.[1];
        const value = { ipa: usIpa || (!/UK|US|🇬🇧|🇺🇸/.test(ipa) ? ipa : 'Chưa có IPA US xác định') };
        pronunciationCache.current.set(word,value);
        if (!controller.signal.aborted) setPronunciations(current=>({...current,[word]:value}));
      }).catch(()=>{ if(!controller.signal.aborted)setPronunciations(current=>({...current,[word]:{ipa:'Chưa tải được phiên âm. Bấm thẻ để thử tra chi tiết.',easy:''}})); });
    return ()=>controller.abort();
  }, [review,card,rows]);
  const viewMeaning = word => {
    onLookup(word);
    const selectedWeek=week,version=requestVersion.current;
    rememberEnglish(word).then(saved=>{
      if(!saved||version!==requestVersion.current)return;
      setRows(current=>current.map(row=>row.english===word?{...row,searches:row.searches+1,weekSearches:row.weekSearches+(selectedWeek===weekStart()?1:0)}:row));
      if(selectedWeek===weekStart())setWeeks(current=>current.map(w=>w.week===selectedWeek?{...w,searches:w.searches+1}:w));
    }).catch(e=>setError(formatErrorMessage(e)));
  };
  const pronunciation = word => <p className="mt-3 text-sm italic text-purple-300" title="Phiên âm do AI cung cấp, chưa xác thực từ điển">{pronunciations[word]?.ipa ? `US · ${pronunciations[word].ipa}` : 'Đang tải IPA US…'}</p>;
  const requestVersion = useRef(0);
  const gesture = useRef(null), suppressClick = useRef(false);
  const [drag,setDrag] = useState(0);
  const topCard = useRef(null), underCard = useRef(null), animating = useRef(false), animations = useRef([]);
  const [under,setUnder] = useState(null);
  const [ordering,setOrdering]=useState(false),[dragging,setDragging]=useState(null);
  const reorderDrag=useRef(null), listRef=useRef(null), positions=useRef(new Map());
  const [floating,setFloating]=useState(null),[dropTarget,setDropTarget]=useState(null);
  const capturePositions=()=>{positions.current=new Map([...listRef.current.querySelectorAll('[data-word-id]')].map(el=>[+el.dataset.wordId,el.getBoundingClientRect().top]));};
  useLayoutEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    listRef.current?.querySelectorAll('[data-word-id]').forEach(el=>{const old=positions.current.get(+el.dataset.wordId),dy=old-el.getBoundingClientRect().top;if(Number.isFinite(dy)&&dy)el.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:220,easing:'ease-out'});});
    positions.current.clear();
  },[rows]);
  const reorder = async (id,beforeId) => {
    if(ordering||id===beforeId)return;
    const original=rows,updated=[...rows],index=updated.findIndex(r=>r.id===id);
    if(index<0||!updated.some(r=>r.id===beforeId))return;
    capturePositions();const [row]=updated.splice(index,1);updated.splice(updated.findIndex(r=>r.id===beforeId),0,row);setRows(updated);
    setOrdering(true);setError('');
    try {await parseApiResponse(await fetch('/api/my-words',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({week,id,beforeId})}));}
    catch(e){setRows(original);setError(formatErrorMessage(e));}finally{setOrdering(false);}
  };
  const moveToEdge=async(id,edge)=>{
    if(ordering||busy)return;
    setOrdering(true);setError('');
    try{
      await parseApiResponse(await fetch('/api/my-words',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({week,id,edge})}));
      await load();
    }catch(e){setError(formatErrorMessage(e));}finally{setOrdering(false);}
  };
  const startOrder=e=>{
    if(e.button!==0||ordering||busy)return;
    e.preventDefault();const el=e.currentTarget.closest('[data-word-id]'),rect=el.getBoundingClientRect(),id=+el.dataset.wordId;
    reorderDrag.current={id,offset:e.clientY-rect.top};setDragging(id);setDropTarget(null);
    setFloating({left:rect.left,top:rect.top,width:rect.width,height:rect.height,english:rows.find(r=>r.id===id).english});e.currentTarget.setPointerCapture(e.pointerId);
  };
  const moveOrder=e=>{
    const start=reorderDrag.current;if(!start)return;
    setFloating(current=>({...current,top:e.clientY-start.offset}));
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-word-id]');setDropTarget(target&&+target.dataset.wordId!==start.id?+target.dataset.wordId:null);
    if(e.clientY<90)window.scrollBy(0,-18);else if(e.clientY>window.innerHeight-90)window.scrollBy(0,18);
  };
  const cancelOrder=()=>{reorderDrag.current=null;setDragging(null);setFloating(null);setDropTarget(null);};
  const dropOrder = e => {
    const start=reorderDrag.current,target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-word-id]');cancelOrder();
    if(start&&target)reorder(start.id,+target.dataset.wordId);
  };
  const moveCard = async direction => {
    const target = card+direction;
    if (animating.current || target<0 || target>=rows.length) { setDrag(0); return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCard(target);setDrag(0);return; }
    animating.current = true; suppressClick.current = true;
    setUnder(target);
    const outgoing = topCard.current.animate([
      {transform:`translateX(${drag}px) rotate(${drag/20}deg)`,opacity:1},
      {transform:`translateX(${direction*420}px) rotate(${direction*22}deg)`,opacity:0}
    ],{duration:300,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
    const incoming = underCard.current.animate([{transform:'translateY(14px) scale(.94)',opacity:.45},{transform:'translateY(0) scale(1)',opacity:1}],{duration:300,easing:'ease-out',fill:'forwards'});
    animations.current = [outgoing,incoming];
    try { await Promise.all(animations.current.map(a=>a.finished)); setCard(target);setDrag(0);setUnder(null); await new Promise(resolve=>requestAnimationFrame(resolve)); }
    catch {} finally { animations.current.forEach(a=>a.cancel());animations.current=[];animating.current=false; }
  };
  useEffect(() => () => { animations.current.forEach(a=>a.cancel());animating.current=false;setUnder(null);setDrag(0); }, [week,review]);
  const finishSwipe = e => {
    const start = gesture.current; gesture.current = null;
    if (!start) return;
    const dx = e.clientX-start.x, dy=e.clientY-start.y;
    suppressClick.current = Math.abs(dx)>12 || Math.abs(dy)>12;
    if (Math.abs(dx)>=60 && Math.abs(dx)>Math.abs(dy)*1.3) moveCard(dx>0?1:-1);
    else setDrag(0);
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
      <button aria-label="Làm mới danh sách" title="Làm mới" disabled={busy||ordering} onClick={()=>load()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xl text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50">↻</button>
    </header>
    <div className="space-y-3">
      <label className="block text-xs text-slate-400">Tuần học · giờ Việt Nam<select aria-label="Tuần ôn tập" disabled={ordering||dragging!==null} value={week} onChange={e=>setWeek(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm font-medium text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">{[...new Set([weekStart(),...weeks.map(w=>w.week)])].sort().reverse().map(w=><option key={w} value={w}>{weekLabel(w)}{w===weekStart()?' · tuần này':''}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-500/10 px-4 py-3"><p className="text-2xl font-semibold tabular-nums text-indigo-200">{summary?.count || 0}</p><p className="mt-1 text-xs text-slate-400">Từ / cụm từ</p></div>
        <div className="rounded-xl bg-slate-800/60 px-4 py-3"><p className="text-2xl font-semibold tabular-nums text-slate-200">{summary?.searches || 0}</p><p className="mt-1 text-xs text-slate-400">Lượt tra / xem nghĩa trong tuần</p></div>
      </div>
      <button disabled={!rows.length||busy||ordering} onClick={()=>{setReview(!review);setCard(0);}} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-40"><span aria-hidden="true">{review?'☰':'▷'}</span>{review?'Trở về danh sách':'Bắt đầu ôn tuần đã chọn'}</button>
    </div>
    {review && rows[card] && <div style={{overflowAnchor:"none"}} className="relative overflow-hidden px-1 pb-2 pt-2">
      <div ref={underCard} aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-2 flex h-96 flex-col items-center justify-center rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-center"><p className="break-words text-3xl font-semibold text-indigo-100">{rows[under ?? Math.min(rows.length-1,card+1)]?.english}</p><span className="mt-8 text-sm text-indigo-200">Bấm thẻ để xem nghĩa chi tiết</span></div>
      <div ref={topCard} role="button" tabIndex={0} aria-label={`${rows[card].english}. Bấm xem nghĩa chi tiết. Phím phải: từ tiếp theo; phím trái: từ trước.`}
        onPointerDown={e=>{ if(e.button!==0||animating.current)return; suppressClick.current=false; gesture.current={x:e.clientX,y:e.clientY}; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e=>{const start=gesture.current;if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)>Math.abs(dy)*1.3)setDrag(Math.max(-120,Math.min(120,dx)));}}}
        onPointerUp={finishSwipe} onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;setDrag(0);}}
        onClick={()=>{if(!animating.current&&!suppressClick.current)viewMeaning(rows[card].english);suppressClick.current=false;}}
        onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();moveCard(1);}else if(e.key==='ArrowLeft'){e.preventDefault();moveCard(-1);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();viewMeaning(rows[card].english);}}}
        style={{touchAction:'pan-y',transform:`translateX(${drag}px) rotate(${drag/20}deg)`}}
        className={`relative flex h-96 cursor-pointer select-none flex-col items-center justify-between rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-center shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${drag?'':'transition-transform motion-reduce:transition-none'}`}>
        <p aria-live="polite" className="text-xs text-slate-400">{card+1}/{rows.length}{next?' mục đã tải':''} · Tự nhớ nghĩa trước khi mở</p>
        <div className="my-4 min-h-0 w-full overflow-y-auto overscroll-contain"><p className="break-words text-3xl font-semibold text-indigo-100">{rows[card].english}</p>{pronunciation(rows[card].english)}{rows[card].searches>1&&<span className="mt-3 inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-200">↻ Xem lại {rows[card].searches-1} lần</span>}</div>
        <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm text-indigo-200">Bấm thẻ để xem nghĩa chi tiết</span>
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-2"><button disabled={card===0} onClick={()=>moveCard(-1)} className="min-h-11 rounded-full bg-slate-800 px-4 text-sm text-slate-300 disabled:opacity-30">← Trước</button><span className="text-center text-xs text-slate-500">Quẹt trái: trước<br/>Quẹt phải: tiếp</span><button disabled={card===rows.length-1} onClick={()=>moveCard(1)} className="min-h-11 rounded-full bg-indigo-500/15 px-4 text-sm text-indigo-200 disabled:opacity-30">Tiếp →</button></div>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!busy&&!error&&!rows.length&&<div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center"><p className="font-medium text-slate-300">Chưa có từ đã tra</p><p className="mt-2 text-sm text-slate-500">Tra Anh–Việt hoặc Việt–Anh để thêm vào bộ từ của bạn.</p></div>}
    {!review && !!rows.length && <div className="flex items-center justify-between border-t border-slate-800 pt-4"><h3 className="text-sm font-semibold text-slate-300">Từ trong tuần</h3><span className="text-xs text-slate-500">↻ Số lần xem lại tổng cộng</span></div>}
    {!review && !!rows.length && <p role="status" className="text-xs text-slate-400">{ordering?"Đang lưu thứ tự…":dragging!==null?"Thả tay trên từ muốn đặt phía sau.":"Kéo tay nắm ⠿ để đặt từ lên trước. Hoặc bấm nút đưa lên đầu / xuống cuối. Thứ tự ôn lưu theo tuần."}</p>}
    {!review && <ul ref={listRef} className="space-y-2">{rows.map((row,index)=><li data-word-id={row.id} key={row.id} className={`relative flex items-center gap-2 rounded-xl border p-3 ${dropTarget===row.id?'border-indigo-400 bg-indigo-950/60':'border-transparent bg-slate-950/40'} ${dragging===row.id?'opacity-30':''}`}>
      {dropTarget===row.id&&<span aria-hidden="true" className="absolute -top-1 inset-x-2 h-1 rounded-full bg-indigo-400"/>}
      <div className="flex w-9 shrink-0 flex-col items-center">
        <button disabled={busy||ordering||index===0} aria-label={`Đưa ${row.english} lên đầu`} title="Đưa lên đầu danh sách tuần" onClick={()=>moveToEdge(row.id,'top')} className="h-6 w-9 rounded text-sm text-slate-400 hover:bg-indigo-500/10 disabled:opacity-25"><svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16M12 20V8m-5 5 5-5 5 5"/></svg></button>
        <button disabled={busy||ordering} aria-label={`Kéo ${row.english} đổi vị trí`} onPointerDown={startOrder} onPointerMove={moveOrder} onPointerUp={dropOrder} onPointerCancel={cancelOrder} style={{touchAction:'none'}} className="flex h-8 w-9 items-center justify-center rounded-lg text-lg text-slate-400 active:bg-indigo-500/20">⠿</button>
        <button disabled={busy||ordering||(!next&&index===rows.length-1)} aria-label={`Đưa ${row.english} xuống cuối`} title="Đưa xuống cuối danh sách tuần" onClick={()=>moveToEdge(row.id,'bottom')} className="h-6 w-9 rounded text-sm text-slate-400 hover:bg-indigo-500/10 disabled:opacity-25"><svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20h16M12 4v12m-5-5 5 5 5-5"/></svg></button>
      </div>
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium leading-6 text-slate-200">{row.english}</p><div className="mt-2 flex flex-wrap items-center gap-2">{row.searches>1&&<span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200">↻ {row.searches-1}</span>}<button type="button" disabled={tagging!==null} aria-pressed={!!row.needsReview} aria-label={`${row.needsReview?'Bỏ nhãn chưa nhớ':'Đánh dấu chưa nhớ'}: ${row.english}`} title={row.needsReview?'Bỏ nhãn chưa nhớ':'Đánh dấu từ chưa nhớ'} onClick={()=>tagWord(row)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-50 ${row.needsReview?'text-indigo-200':'opacity-30 hover:opacity-70 focus-visible:opacity-100'}`}><span aria-hidden="true">📖</span></button></div></div>
      <button onClick={()=>viewMeaning(row.english)} className="min-h-11 shrink-0 rounded-lg bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200">Xem nghĩa</button>
    </li>)}</ul>}
    {floating&&<div aria-hidden="true" style={{position:'fixed',left:floating.left,top:floating.top,width:floating.width,minHeight:floating.height,zIndex:1000,pointerEvents:'none'}} className="flex items-center gap-3 rounded-xl border border-indigo-400 bg-slate-800 p-4 shadow-2xl shadow-black/60"><span className="text-xl text-indigo-300">⠿</span><p className="min-w-0 flex-1 break-words text-sm font-medium text-white">{floating.english}</p><span className="text-xs text-indigo-200">Đang kéo</span></div>}
    {busy&&<p role="status" className="text-sm text-slate-400">Đang tải…</p>}
    {next&&<button disabled={busy||ordering} onClick={()=>load(next)} className="min-h-11 w-full rounded-xl bg-slate-800 text-sm text-indigo-200 hover:bg-slate-700 disabled:opacity-50">Tải thêm</button>}
  </section>;
}
export async function rememberEnglish(english) {
  const res=await fetch('/api/my-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({english})});
  if (!res.ok) throw new Error('Không lưu được lượt xem. Kiểm tra đăng nhập rồi thử lại.');
  return true;
}
