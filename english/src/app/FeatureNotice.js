"use client";
import { useEffect, useRef, useState } from 'react';
export default function FeatureNotice({id,onExplore}) {
 const anchor=useRef(null),requested=useRef(false);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  let active=true;
  const observer=new IntersectionObserver(entries=>{
   if(!entries.some(e=>e.isIntersecting)||requested.current)return;
   requested.current=true;
   fetch('/api/feature-notices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}).then(async r=>{if(r.ok){const data=await r.json();if(active)setVisible(data.show);}}).catch(()=>{});
  });
  observer.observe(anchor.current);
  return ()=>{active=false;observer.disconnect();};
 },[id]);
 return <div ref={anchor} data-feature-notice-anchor={id}>{visible && <aside aria-label="Tính năng mới" className="mb-3 rounded-2xl border border-teal-500/40 bg-teal-950/50 p-4">
  <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wider text-teal-300">Mới dành cho bạn</span><h4 className="mt-1 text-sm font-semibold text-white">Prompt viết riêng, ghi nhớ theo tài khoản</h4></div><button type="button" aria-label="Đóng thông báo tính năng mới" onClick={()=>setVisible(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800">×</button></div>
  <p className="mt-1 text-sm leading-relaxed text-slate-300">Ngay bên dưới: tùy chỉnh cách AI viết bằng tiếng Việt, rồi lưu prompt để dùng lại trên mọi thiết bị. Không ghi trình độ thì dùng ô CEFR.</p>
  <button type="button" onClick={()=>{setVisible(false);onExplore();}} className="mt-3 min-h-11 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500">Mở phần tùy chỉnh bên dưới</button>
 </aside>}</div>;
}
