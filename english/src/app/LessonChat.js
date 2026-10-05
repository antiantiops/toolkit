"use client";
import { useEffect, useRef, useState } from "react";

export default function LessonChat({ context }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const moved = useRef(false);
  const clamp = (p) => ({ x: Math.max(12, Math.min(window.innerWidth - 68, p.x)), y: Math.max(12, Math.min(window.innerHeight - 68, p.y)) });
  useEffect(() => {
    const resize = () => setPosition(p => clamp(p || { x: window.innerWidth - 72, y: window.innerHeight - 80 }));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const finishDrag = () => {
    if (!drag.current) return;
    if (moved.current) setPosition(p => ({ ...clamp(p), x: p.x + 28 < window.innerWidth / 2 ? 12 : window.innerWidth - 68 }));
    drag.current = null;
    setDragging(false);
  };
  const panel = useRef(null);
  const bubble = useRef(null);
  const [origin, setOrigin] = useState("bottom right");
  const toggleChat = (next) => {
    if (panel.current && bubble.current) {
      const b = bubble.current.getBoundingClientRect();
      // Offset dimensions stay stable while the panel is scaled closed.
      const left = window.innerWidth - 12 - panel.current.offsetWidth;
      const top = window.innerHeight - 12 - panel.current.offsetHeight;
      setOrigin(`${b.left + 28 - left}px ${b.top + 28 - top}px`);
    }
    setOpen(next);
    if (!next) bubble.current?.focus();
  };
  const end = useRef(null);
  const sending = useRef(false);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy, open]);
  const send = async e => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending.current) return;
    sending.current = true;
    setBusy(true); setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next); setInput("");
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(100000), body: JSON.stringify({ messages: next.slice(-11), context }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không gửi được câu hỏi");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (e) { setMessages(messages); setInput(text); setError(e.message); }
    finally { setBusy(false); sending.current = false; }
  };
  return <>
    {<button ref={bubble} aria-expanded={open} aria-controls="lesson-chat-panel" tabIndex={open ? -1 : 0} id="lesson-chat-toggle" aria-label="Mở chat với AI; kéo để di chuyển" title="Chat AI · kéo để di chuyển"
      style={position ? { left: position.x, top: position.y, touchAction: "none", opacity: open ? 0 : 1, pointerEvents: open ? "none" : "auto", transform: open ? "scale(.6)" : "scale(1)", transition: dragging ? "none" : "left 220ms ease, top 220ms ease, opacity 180ms ease, transform 220ms ease" } : { right: 16, bottom: 20, touchAction: "none" }}
      onPointerDown={e => { if (e.button !== 0) return; const r = e.currentTarget.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, left: r.left, top: r.top }; moved.current = false; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 6) moved.current = true; if (moved.current) { setDragging(true); setPosition(clamp({ x: d.left + dx, y: d.top + dy })); } }}
      onPointerUp={finishDrag} onPointerCancel={finishDrag}
      onClick={() => { if (!moved.current) toggleChat(true); moved.current = false; }}
      className="fixed z-40 flex h-14 w-14 select-none items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-600 text-white shadow-[0_6px_24px_rgba(59,130,246,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 active:scale-95">
      <svg id="ai-mascot-icon" aria-hidden="true" viewBox="0 0 64 64" className="h-12 w-12" fill="none">
        <path d="M14 29C5 4 15 1 23 23M41 23C49 1 59 4 50 29" fill="#c4b5fd" stroke="#6d28d9" strokeWidth="2" strokeLinejoin="round" />
        <path d="m15 12 5 12m29-12-5 12" stroke="#f9a8d4" strokeWidth="4" strokeLinecap="round" />
        <path d="M11 33C11 18 53 18 53 33l3 5-4 4 1 6-6 1-3 6-7-2-5 4-5-4-7 2-3-6-6-1 1-6-4-4 3-5Z" fill="#c4b5fd" stroke="#6d28d9" strokeWidth="1.5" strokeLinejoin="round" />
        <ellipse cx="32" cy="37" rx="19" ry="16" fill="#fff1dc" />
        <ellipse cx="24" cy="34" rx="4" ry="5" fill="#312e81" /><ellipse cx="40" cy="34" rx="4" ry="5" fill="#312e81" />
        <circle cx="25" cy="32" r="1.5" fill="white" /><circle cx="41" cy="32" r="1.5" fill="white" />
        <ellipse cx="19" cy="41" rx="4" ry="2.5" fill="#f9a8d4" /><ellipse cx="45" cy="41" rx="4" ry="2.5" fill="#f9a8d4" />
        <path d="M25 42q7 9 14 0Z" fill="#831843" /><path d="m27 43 2 3 3-3 3 3 2-3" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path d="m32 26 1-2 1 2-1 2-1-2Z" fill="#38bdf8" />
      </svg>
      {busy && <span className="absolute right-0 top-0 h-3 w-3 animate-pulse rounded-full border-2 border-slate-900 bg-amber-300" />}
    </button>}
    {<section ref={panel} inert={!open} aria-hidden={!open} data-open={open} style={{ transformOrigin: origin }} id="lesson-chat-panel" role="dialog" aria-label="Chat với AI về bài học" className="lesson-chat-motion fixed bottom-3 right-3 z-40 flex h-[min(70dvh,600px)] w-[calc(100%-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-700 p-3">
        <div><h2 className="font-semibold text-sky-200">Hỏi AI về bài học</h2><p className="text-xs text-slate-400">Ngữ cảnh: {context.mode === "grammar" ? "Grammar" : context.mode === "writing" ? "Writing" : "Vocabulary"}</p></div>
        <div className="flex gap-1"><button disabled={busy} onClick={() => { setMessages([]); setError(""); }} className="rounded-lg px-2 py-1 text-xs text-slate-300 disabled:opacity-40">Xóa chat</button><button aria-label="Thu nhỏ chat" onClick={() => toggleChat(false)} className="rounded-lg px-2 py-1 text-slate-300">✕</button></div>
      </header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {!messages.length && <p className="text-slate-400">Hỏi thêm về câu, từ hoặc quy tắc đang học. Nội dung bài hiện tại được gửi cùng câu hỏi; không gửi ảnh hay toàn màn hình.</p>}
        {messages.map((m, i) => <div key={i} className={m.role === "user" ? "chat-message-in ml-6 whitespace-pre-wrap break-words rounded-xl bg-blue-900/60 p-3 text-white" : "chat-message-in mr-3 whitespace-pre-wrap break-words rounded-xl bg-slate-800 p-3 leading-relaxed text-slate-100"}><div className="mb-1 text-xs font-semibold text-sky-300">{m.role === "user" ? "Bạn" : "AI"}</div>{m.content}</div>)}
        {busy && <div role="status" className="flex items-center gap-2 text-sky-300"><span className="chat-typing flex gap-1" aria-hidden="true"><i /><i /><i /></span><span>AI đang trả lời...</span></div>}
        {error && <p role="alert" className="text-red-300">{error}</p>}<div ref={end} />
      </div>
      <form onSubmit={send} className="flex shrink-0 items-end gap-2 border-t border-slate-700 p-3">
        <textarea aria-label="Câu hỏi cho AI" value={input} onChange={e => setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Vì sao câu này dùng thì đó?" className="min-w-0 flex-1 resize-none rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white" />
        <button disabled={busy || !input.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold disabled:opacity-40">Gửi</button>
      </form>
    </section>}
  </>;
}
