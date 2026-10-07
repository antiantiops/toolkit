"use client";
import { useEffect, useRef, useState } from "react";

export default function ImageCrop({ file, onCancel, onApply }) {
  const [url, setUrl] = useState("");
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
    if (!box) { onApply(file); return; }
    if (box.w < .01 || box.h < .01) { setError("Kéo chọn vùng lớn hơn hoặc dùng toàn ảnh."); return; }
    setBusy(true);
    try {
      const source = img.current;
      const x = Math.floor(box.x * source.naturalWidth), y = Math.floor(box.y * source.naturalHeight);
      const w = Math.max(1, Math.min(source.naturalWidth - x, Math.round(box.w * source.naturalWidth)));
      const h = Math.max(1, Math.min(source.naturalHeight - y, Math.round(box.h * source.naturalHeight)));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(source, x, y, w, h, 0, 0, w, h);
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
        <p className="text-sm text-slate-400">Kéo các góc hoặc khoanh trên ảnh để chọn vùng chữ.</p>
      </header>
      <div className="min-h-0 overflow-auto p-4">
        <div className="relative mx-auto w-fit max-w-full touch-none select-none overflow-hidden rounded-lg"
          onPointerDown={e => begin(e)} onPointerMove={move} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }}>
          <img ref={img} src={url} alt="Ảnh gốc để chọn vùng đọc" draggable={false} onLoad={() => setReady(true)} onError={() => { setReady(false); setError("Không đọc được ảnh. Chọn ảnh JPEG hoặc PNG."); }} className="block max-h-[55dvh] max-w-full" />
          {ready && <div className="pointer-events-none absolute border-2 border-cyan-300" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.w * 100}%`, height: `${selection.h * 100}%`, boxShadow: "0 0 0 9999px rgba(0,0,0,.55)" }}>
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
        {box && <button disabled={busy} onClick={() => setBox(null)} className="mb-2 min-h-12 w-full text-sm text-slate-300 hover:text-white">Đặt lại vùng chọn</button>}
        <button disabled={busy || !ready} onClick={crop} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-40">{busy ? "Đang cắt..." : (box ? "Dùng vùng đã chọn" : "Dùng ảnh này")}</button>
        <button disabled={busy} onClick={() => onApply(file)} type="button" className="mt-2 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
          📁 Dùng nguyên ảnh gốc (Giữ 100% chất lượng)
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">{box ? "Chỉ vùng đã chọn được gửi AI" : "Chưa chỉnh vùng: dùng toàn ảnh"}</p>
      </footer>
    </section>
  </div>;
}
