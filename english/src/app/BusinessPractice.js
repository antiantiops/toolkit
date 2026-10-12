'use client';
import { useRef, useState } from 'react';
import { fetchWithRetry, parseApiResponse, formatErrorMessage } from './fetch-helper';
import { normalizeGrammarAnswer as normal } from '../lib/grammar/answers';
export default function BusinessPractice({mode,words,grammar}) {
  const [test,setTest]=useState(null),[answers,setAnswers]=useState({}),[submitted,setSubmitted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [part,setPart]=useState(0), [checked,setChecked]=useState({});
  const panel=useRef(null), touch=useRef(null);
  const changePart = value => { setPart(value); requestAnimationFrame(()=>panel.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})); };
  const isChecked = key => mode==='grammar'?submitted:!!checked[key[0]==='p'?0:1];
  const create=async()=>{setBusy(true);setError('');setTest(null);setAnswers({});setSubmitted(false);setChecked({});setPart(0);try{setTest(await parseApiResponse(await fetchWithRetry('/api/business-practice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,words,grammar}),timeout:100000},0)));}catch(e){setError(formatErrorMessage(e));}finally{setBusy(false);}};
  const field=(key,base)=><input aria-label={`Câu ${key} (${base})`} disabled={isChecked(key)} value={answers[key]||''} onChange={e=>setAnswers(a=>({...a,[key]:e.target.value}))} className="mx-2 my-1 min-h-11 w-36 rounded-lg border border-slate-600 bg-slate-950 px-3 text-white focus:border-indigo-400"/>;
  const feedback=(key,q)=>isChecked(key)&&<p className={`mt-2 text-sm ${normal(answers[key])===normal(q.answer)?'text-emerald-300':'text-amber-300'}`}>{normal(answers[key])===normal(q.answer)?'Đúng':'Đáp án: '+q.answer} · {q.explanation}</p>;
  const questions=test ? mode==='vocab'?[...test.pairs.map((q,i)=>['p'+i,q]),...test.fills.map((q,i)=>['f'+i,q])]:test.blanks.map((q,i)=>['g'+i,q]):[];
  return <section className="my-5 space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-indigo-200">Business Class Test</h2><p className="mt-1 text-sm text-slate-400">{mode==='vocab'?'I · SYN / ANT   —   II · Word bank & correct form':'III · Hoàn thành đoạn văn, đổi dạng từ trong ngoặc'}</p></div><button disabled={busy} onClick={create} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy?'Đang tạo…':test?'Tạo đề mới':'Tạo bài tập'}</button></header>
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    {test&&mode==='vocab'&&<div ref={panel} className="scroll-mt-4">
      <div className="mb-4 flex gap-2" aria-label="Phần bài tập">{['I · SYN / ANT','II · Điền từ'].map((label,i)=><button key={label} aria-pressed={part===i} onClick={()=>changePart(i)} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${part===i?'bg-indigo-600 text-white':'bg-slate-800 text-slate-400'}`}>{label}{checked[i]?' ✓':''}</button>)}</div>
      <div className="overflow-hidden" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)changePart(dx<0?1:0);}}>
        <div className="flex items-start transition-transform duration-300 ease-out motion-reduce:transition-none" style={{transform:`translateX(-${part*100}%)`}}>
          <div inert={part!==0?true:undefined} className="w-full shrink-0 space-y-3">
            <h3 className="font-semibold text-slate-200">I. Chọn đồng nghĩa (SYN) hoặc trái nghĩa (ANT)</h3>
            {test.pairs.map((q,i)=><div key={i} className="rounded-xl bg-slate-950/50 p-3"><p className="text-sm">{i+1}. {q.left} — {q.right}</p><div className="mt-2 flex gap-2">{['SYN','ANT'].map(value=><button key={value} disabled={!!checked[0]} aria-pressed={answers['p'+i]===value} onClick={()=>setAnswers(a=>({...a,['p'+i]:value}))} className={`min-h-11 rounded-lg border px-5 text-sm ${answers['p'+i]===value?'border-indigo-400 bg-indigo-500/20 text-indigo-100':'border-slate-700 text-slate-300'}`}>{value}</button>)}</div>{feedback('p'+i,q)}</div>)}
          </div>
          <div inert={part!==1?true:undefined} className="w-full shrink-0 space-y-3">
            <h3 className="font-semibold text-slate-200">II. Chọn từ trong hộp, dùng đúng dạng từ.</h3>
            <p className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">{test.bank.join(' · ')}</p>
            {test.fills.map((q,i)=><div key={i} className="rounded-xl bg-slate-950/50 p-3"><label className="text-sm leading-8">{i+1}. {q.sentence}{field('f'+i,q.base)}</label>{feedback('f'+i,q)}</div>)}
          </div>
        </div>
      </div>
      <button onClick={()=>setChecked(current=>({...current,[part]:true}))} className="mt-4 min-h-12 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white">{checked[part]?`${(part===0?test.pairs:test.fills).filter((q,i)=>normal(answers[(part===0?'p':'f')+i])===normal(q.answer)).length}/5 đúng · Phần ${part+1}`:`Kiểm tra phần ${part+1}`}</button>
      {checked[part]&&<div className="mt-3 space-y-2"><p role="status" className="text-center text-sm text-slate-400">Đã kiểm tra phần {part+1}. Xem giải thích rồi tiếp tục.</p><button onClick={()=>changePart(part===0?1:0)} className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 font-semibold text-white">{part===0?'Tiếp tục phần II →':'← Xem lại phần I'}</button></div>}
    </div>}
    {test&&mode==='grammar'&&<><h3 className="font-semibold text-slate-200">{test.title||'III. Complete the text'}</h3><p className="rounded-xl bg-slate-950/50 p-4 text-sm leading-9">{test.segments.map((segment,i)=><span key={i}>{segment}{test.blanks[i]&&<><span className="text-indigo-300">({i+1}) [{test.blanks[i].base}]</span>{field('g'+i,test.blanks[i].base)}</>}</span>)}</p>{submitted&&test.blanks.map((q,i)=><div key={i}>{feedback('g'+i,q)}</div>)}</>}
    {test&&mode==='grammar'&&<button onClick={()=>setSubmitted(true)} className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white">{submitted?`${questions.filter(([key,q])=>normal(answers[key])===normal(q.answer)).length}/${questions.length} đúng`:'Nộp bài · Chấm điểm'}</button>}
  </section>;
}
