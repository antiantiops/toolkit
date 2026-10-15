'use client';
// Lucian UX/UI Prompt #032 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#032
import { useRef,useState } from 'react';
import './lucian.css';
const size=b=>b>1048576?`${(b/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(b/1024))} KB`;
export default function LucianAudioUpload({onFile,busy,stage,error,cachedName}){
 const input=useRef(null),[over,setOver]=useState(false),[file,setFile]=useState(null);
 const pick=f=>{if(!f)return;setFile(f);onFile(f);};
 const state=error?'fail':busy?'work':file||cachedName?'done':'';
 const label=file?.name||cachedName, bytes=file?.size;
 return <div className={`ux u032 u032-live ${over?'is-over':''}`} onDragEnter={e=>{e.preventDefault();setOver(true)}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{if(e.currentTarget===e.target)setOver(false)}} onDrop={e=>{e.preventDefault();setOver(false);pick(e.dataTransfer.files?.[0])}}>
  <button className="u032-zone" type="button" disabled={busy} onClick={()=>input.current?.click()}><svg className="u032-dash" aria-hidden="true"><rect width="100%" height="100%" rx="25"/></svg><span className="u032-orb" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M8.5 20.5H7a5 5 0 0 1-.6-10 7 7 0 0 1 13.4-1.6A5.5 5.5 0 0 1 21 20.5h-1.5M14 13v10M10.5 16.5L14 13l3.5 3.5"/></svg></span><b>Kéo file nghe vào hoặc <em>chọn file</em></b><small>MP3, M4A, WAV · tối đa 25 MB · tối đa 15 phút</small></button>
  <input ref={input} className="u032-file" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" onChange={e=>{pick(e.target.files?.[0]);e.target.value=''}}/>
  {label&&<ul className="u032-list" aria-live="polite"><li className={`u032-row ${state==='done'?'done':state==='fail'?'fail':''}`} style={{'--p':busy?.62:1}}><span className="u032-ic" style={{'--c':'#22A06B'}} aria-hidden="true">AUD</span><span className="u032-meta"><b>{label}</b><small>{error||busy?stage||'Đang chuẩn bị…':bytes?`${size(bytes)} · Sẵn sàng học`:'Đã khôi phục · giữ 24 giờ'}</small></span>{busy?<span className="u032-st"><span className="u032-spin"/></span>:error?<button className="u032-retry" type="button" onClick={()=>file&&pick(file)}>Thử lại</button>:<span className="u032-st"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.4"/></svg></span>}<span className="u032-bar" aria-hidden="true"/></li></ul>}
 </div>;
}
