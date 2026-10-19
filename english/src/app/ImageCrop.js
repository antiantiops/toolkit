"use client";
import { useEffect, useRef, useState } from "react";

export default function ImageCrop({ file, onCancel, onApply, multiple = false }) {
  const [url, setUrl] = useState("");
  const [regions,setRegions]=useState([]);
  const [box, setBox] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const img = useRef(null);
  const start = useRef(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setUrl(url);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { URL.revokeObjectURL(url); document.body.style.overflow = previous; };
  }, [file]);
  const point = (e) => {
    const r = img.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  };
  const crop = async () => {
    const chosen=multiple?[...regions,...(box?[box]:[])]:box?[box]:[];
    if(!chosen.length){onApply(file);return;}
    if(chosen.some(b=>b.w<.01||b.h<.01)){setError('Kéo chọn vùng lớn hơn.');return;}
    setBusy(true);
    try {
      const source=img.current;
      const parts=chosen.map(b=>({x:Math.floor(b.x*source.naturalWidth),y:Math.floor(b.y*source.naturalHeight),w:Math.max(1,Math.round(b.w*source.naturalWidth)),h:Math.max(1,Math.round(b.h*source.naturalHeight))}));
      const width=Math.max(...parts.map(p=>p.w)),height=parts.reduce((n,p)=>n+p.h,0)+20*(parts.length-1);
      if(width*height>32000000||height>24000)throw new Error('Các vùng quá lớn. Chọn ít vùng hơn.');
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,width,height);
      let top=0;for(const p of parts){ctx.drawImage(source,p.x,p.y,Math.min(p.w,source.naturalWidth-p.x),Math.min(p.h,source.naturalHeight-p.y),0,top,p.w,p.h);top+=p.h+20;}
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", .95));
      if (!blob) throw new Error("Không cắt được ảnh. Thử chọn lại.");
      onApply(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const selection = box || { x: 0, y: 0, w: 1, h: 1 };
  const begin = (e, corner) => {
    if (!ready || busy) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const b = selection;
    start.current = corner ? { anchor: { x: corner.includes("l") ? b.x + b.w : b.x, y: corner.includes("t") ? b.y + b.h : b.y } } : { anchor: point(e) };
    setError("");
  };
  const move = e => {
    if (!start.current) return;
    const p = point(e), a = start.current.anchor;
    setBox({ x: Math.min(a.x, p.x), y: Math.min(a.y, p.y), w: Math.abs(p.x - a.x), h: Math.abs(p.y - a.y) });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" onKeyDown={e => { if (e.key === "Escape" && !busy) onCancel(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="crop-title" className="flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
      <header className="shrink-0 p-4 pb-2">
        <div className="flex items-center justify-between gap-3"><h2 id="crop-title" className="text-lg font-semibold">Cắt vùng cần đọc</h2><button autoFocus aria-label="Đóng chọn vùng ảnh" disabled={busy} onClick={onCancel} className="flex h-12 w-12 items-center justify-center rounded-xl text-xl text-slate-300 hover:bg-slate-800">✕</button></div>
        <p className="text-sm text-slate-400">{multiple?"Khoanh vùng đầu, bấm Thêm vùng; tiếp tục khoanh phần tiếp theo. Ghép từ trên xuống theo thứ tự chọn.":"Kéo các góc hoặc khoanh trên ảnh để chọn vùng chữ."}</p>
      </header>
      <div className="min-h-0 overflow-auto p-4">
        <div className="relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-lg"
          onPointerDown={e => begin(e)} onPointerMove={move} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}>
          <img ref={img} src={url} alt="Ảnh gốc để chọn vùng đọc" draggable={false} onLoad={() => setReady(true)} onError={() => { setReady(false); setError("Không đọc được ảnh. Chọn ảnh JPEG hoặc PNG."); }} className="block max-h-[55dvh] max-w-full" />
          {multiple&&regions.map((b,i)=><div key={i} className="pointer-events-none absolute border-2 border-green-400 bg-green-400/10" style={{left:`${b.x*100}%`,top:`${b.y*100}%`,width:`${b.w*100}%`,height:`${b.h*100}%`}}><span className="bg-green-600 px-2 text-white">{i+1}</span></div>)}
          {ready && <div className="pointer-events-none absolute border-2 border-cyan-300" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.w * 100}%`, height: `${selection.h * 100}%`, boxShadow: multiple ? "none" : "0 0 0 9999px rgba(0,0,0,.55)" }}>
            {["tl", "tr", "bl", "br"].map(corner => <button key={corner} aria-label={`Chỉnh góc ${corner}`} className="pointer-events-auto absolute flex h-12 w-12 touch-none items-center justify-center" style={{ left: corner.includes("l") ? 0 : "100%", top: corner.includes("t") ? 0 : "100%", transform: "translate(-50%, -50%)" }} onPointerDown={e => { e.stopPropagation(); begin(e, corner); }} onKeyDown={e => {
              const delta = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] }[e.key];
              if (!delta || busy) return;
              e.preventDefault();
              const anchor = { x: corner.includes("l") ? selection.x + selection.w : selection.x, y: corner.includes("t") ? selection.y + selection.h : selection.y };
              const x = Math.max(0, Math.min(1, (corner.includes("l") ? selection.x : selection.x + selection.w) + delta[0]));
              const y = Math.max(0, Math.min(1, (corner.includes("t") ? selection.y : selection.y + selection.h) + delta[1]));
              setBox({ x: Math.min(anchor.x, x), y: Math.min(anchor.y, y), w: Math.abs(anchor.x - x), h: Math.abs(anchor.y - y) });
            }}><span className="h-4 w-4 rounded-full border-2 border-white bg-cyan-400 shadow" /></button>)}
          </div>}
        </div>
      </div>
      <footer className="shrink-0 border-t border-slate-800 p-4">
        {error && <p role="alert" className="mb-2 text-sm text-red-300">{error}</p>}
        {multiple&&<><button disabled={busy||!box||regions.length>=7} onClick={()=>{if(box.w<.01||box.h<.01){setError('Vùng quá nhỏ');return;}setRegions(r=>[...r,box]);setBox(null);}} className="min-h-12 w-full rounded-xl bg-teal-700 p-2 disabled:opacity-40">Thêm vùng {regions.length+1} vào bài nghe</button>{regions.length>0&&<div className="my-2 flex flex-wrap gap-2">{regions.map((_,i)=><button key={i} disabled={busy} aria-label={`Xóa vùng ${i+1}`} onClick={()=>setRegions(r=>r.filter((_,j)=>j!==i))} className="rounded bg-slate-700 px-3 py-2">Vùng {i+1} ×</button>)}</div>}</>}
        {box && <button disabled={busy} onClick={() => setBox(null)} className="mb-2 min-h-12 w-full text-sm text-slate-300 hover:text-white">Đặt lại vùng chọn</button>}
        <button disabled={busy || !ready} onClick={crop} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-40">{busy ? "Đang cắt..." : (multiple&&(regions.length||box)?`Ghép và dùng ${regions.length+(box?1:0)} vùng` : box ? "Dùng vùng đã chọn" : "Dùng ảnh này")}</button>
        <button disabled={busy} onClick={() => onApply(file)} type="button" className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
          📁 Dùng nguyên ảnh gốc (Giữ 100% chất lượng)
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">{box ? "Chỉ vùng đã chọn được gửi AI" : "Chưa chỉnh vùng: dùng toàn ảnh"}</p>
      </footer>
    </section>
  </div>;
}
