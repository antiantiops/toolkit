"use client";
import {useEffect,useRef,useState} from 'react';
export default function ListeningText({onContextChange}) {
 const [text,setText]=useState(''),[spoken,setSpoken]=useState(''),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[speed,setSpeed]=useState(1);
 const audio=useRef(null),resource=useRef(''),abort=useRef(null);
 useEffect(()=>()=>{abort.current?.abort();if(resource.current)URL.revokeObjectURL(resource.current);},[]);
 useEffect(()=>{onContextChange?.({source:'text',text:spoken||text});},[spoken,text,onContextChange]);
 async function generate(){
  if(busy||!text.trim())return;setBusy(true);setError('');abort.current=new AbortController();
  try{
   const response=await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.trim(),lang:'en-US'}),signal:abort.current.signal});
   if(!response.ok){const data=await response.json();throw Error(data.error||'Không tạo được audio');}
   const blob=await response.blob();if(!blob.size||!blob.type.startsWith('audio/'))throw Error('Dịch vụ không trả audio hợp lệ');
   audio.current?.pause();if(resource.current)URL.revokeObjectURL(resource.current);
   resource.current=URL.createObjectURL(blob);setUrl(resource.current);setSpoken(text.trim());
  }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{setBusy(false);}
 }
 return <section data-testid="listening-text" className="space-y-4">
  <h2 className="text-xl font-semibold text-teal-300">Nghe từ văn bản</h2>
  <p className="text-sm text-slate-300">Dán đoạn tiếng Anh rồi bấm Tạo audio. Giữ nguyên nội dung, không gọi AI viết lại. Giọng Mỹ.</p>
  <label className="block text-sm text-slate-300">Văn bản tiếng Anh<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={1000} disabled={busy} rows={7} placeholder="Dán nội dung tiếng Anh vào đây…" className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white disabled:opacity-60" /></label>
  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{text.length}/1000 ký tự</span><button type="button" onClick={generate} disabled={busy||!text.trim()} className="min-h-11 rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy?'Đang tạo audio…':'Tạo audio'}</button></div>
  {busy&&<p role="status" className="text-sm text-amber-200">Đang chuyển văn bản thành giọng đọc…</p>}
  {error&&<p role="alert" className="text-red-300">{error}</p>}
  {url&&<div className="space-y-3 rounded-xl border border-slate-700 p-3"><audio ref={audio} controls src={url} onLoadedMetadata={()=>{audio.current.playbackRate=speed;}} className="w-full" /><div className="flex flex-wrap items-center gap-3"><label className="text-sm text-slate-300">Tốc độ <select value={speed} onChange={e=>{setSpeed(Number(e.target.value));if(audio.current)audio.current.playbackRate=Number(e.target.value);}} className="rounded bg-slate-800 p-2">{[.5,.75,1,1.25,1.5].map(v=><option key={v} value={v}>{v}×</option>)}</select></label><a href={url} download="listening-text.mp3" className="inline-flex min-h-11 items-center rounded-lg bg-sky-800 px-3 text-sm text-white">Tải file audio</a></div><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">{spoken}</p>{text.trim()!==spoken&&<p className="text-xs text-amber-200">Văn bản đã đổi. Bấm Tạo audio để cập nhật bản đọc.</p>}</div>}
 </section>;
}
