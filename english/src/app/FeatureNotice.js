"use client";
import { useEffect, useRef, useState } from 'react';
import { WRITING_PROMPT_NOTICE } from '../lib/feature-notices.mjs';
export default function FeatureNotice({onNavigate,hasWriting}) {
 const requested=useRef(false),dialog=useRef(null);
 const [step,setStep]=useState(-1);
 useEffect(()=>{
  if(requested.current)return;
  requested.current=true;
  fetch('/api/feature-notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:WRITING_PROMPT_NOTICE})}).then(async r=>{if(r.ok && (await r.json()).show)setStep(0);}).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(step<0)return;
  const old=document.activeElement;
  dialog.current?.showModal();
  return ()=>{dialog.current?.close();old?.focus?.({preventScroll:true});};
 },[step]);
 const go=()=>{
  onNavigate();setStep(1);
  requestAnimationFrame(()=>{
   const target=document.querySelector('[data-writing-custom-prompt]') || document.getElementById('writing-upload-tour');
   target?.scrollIntoView({behavior:'instant',block:'center'});
  });
 };
 return <dialog ref={dialog} aria-labelledby="feature-tour-title" onCancel={()=>setStep(-1)} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-teal-500/50 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/80">
  <div className="p-5 sm:p-6" data-feature-tour>
   <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-widest text-teal-300">Có gì mới · {step===0?'1':'2'}/2</span><button type="button" aria-label="Bỏ qua hướng dẫn" onClick={()=>setStep(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-slate-400 hover:bg-slate-800">×</button></div>
   <div aria-hidden="true" className="mb-5 mt-2 flex gap-2"><span className="h-1 flex-1 rounded-full bg-teal-400"/><span className={`h-1 flex-1 rounded-full ${step===1?'bg-teal-400':'bg-slate-700'}`}/></div>
   <h2 id="feature-tour-title" className="text-xl font-bold">{step===0?'AI viết theo cách bạn muốn':hasWriting?'Đây là nơi chỉnh prompt của bạn':'Bắt đầu từ tab Writing'}</h2>
   <p className="mt-3 text-sm leading-7 text-slate-300">{step===0?'Bạn có thể tự chỉnh yêu cầu viết bằng tiếng Việt, dùng từ dễ nhớ và lưu riêng theo tài khoản. Hướng dẫn này sẽ đưa bạn tới đúng chỗ.':hasWriting?'Đã mở Writing và phần tùy chỉnh. Đóng hướng dẫn để sửa prompt, rồi bấm “Lưu prompt cho tài khoản”. Không ghi trình độ thì dùng ô CEFR (mặc định A2).':'Đã chuyển tới Writing và vùng tải đề. Tải ảnh đề bài, phân tích, rồi mở “Dàn ý gợi ý”. Phần “Tùy chỉnh cách AI viết” nằm dưới dàn ý; tại đó bạn sửa và lưu prompt riêng.'}</p>
   {step===1 && <div className="mt-4 rounded-xl border border-teal-800 bg-teal-950/40 p-3 text-sm leading-6 text-teal-200">{hasWriting?'Writing · Dàn ý gợi ý · Tùy chỉnh cách AI viết':'Writing · Tải ảnh đề · Phân tích · Dàn ý gợi ý · Tùy chỉnh cách AI viết'}</div>}
   <div className="mt-6 flex gap-3"><button type="button" onClick={()=>setStep(-1)} className="min-h-11 rounded-xl px-3 py-2 text-sm text-slate-400">Bỏ qua</button><button type="button" onClick={step===0?go:()=>setStep(-1)} className="min-h-11 flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500">{step===0?'Dẫn tôi tới tính năng':'Đã hiểu, bắt đầu dùng'}</button></div>
  </div>
 </dialog>;
}
