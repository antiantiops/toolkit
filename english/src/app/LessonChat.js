"use client";
import {requestChat,pendingChat} from './chat-request';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./chat-markdown.css";
import { useEffect, useRef, useState } from "react";

export default function LessonChat({ context }) {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const tools = useRef(null);
  const toolsButton = useRef(null);
  const inputArea = useRef(null);
  useEffect(() => {
    if (!toolsOpen) return;
    const outside = e => { if (!tools.current?.contains(e.target)) setToolsOpen(false); };
    const escape = e => { if (e.key === "Escape") { setToolsOpen(false); toolsButton.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [toolsOpen]);
  const [autoWords,setAutoWords]=useState(true),[wordJob,setWordJob]=useState(null),[savedWords,setSavedWords]=useState([]);
  useEffect(()=>{fetch('/api/chat-words').then(r=>r.ok?r.json():null).then(d=>{if(d)setAutoWords(d.enabled);}).catch(()=>{});},[]);
  useEffect(()=>{if(!wordJob)return;let stop=false,count=0;let timer;const poll=async()=>{try{const r=await fetch('/api/chat-words?id='+wordJob);const d=await r.json();if(stop)return;if(d.status==='done'){setSavedWords(d.items||[]);return;}if(d.status==='failed'||++count>=40)return;}catch{if(++count>=40)return;}timer=setTimeout(poll,2000);};timer=setTimeout(poll,1500);return()=>{stop=true;clearTimeout(timer);};},[wordJob]);
  const changeAutoWords=async()=>{try{const r=await fetch('/api/chat-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:!autoWords})});if(!r.ok)throw Error();setAutoWords(!autoWords);}catch{setError('Không đổi được tự lưu. Thử lại.');}};
  const undoWords=async()=>{try{const r=await fetch('/api/chat-words',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({undo:wordJob})});if(!r.ok)throw Error();setSavedWords([]);}catch{setError('Không hoàn tác được. Thử lại.');}};
  const [messages, setMessages] = useState([]);
  const historyEdited=useRef(false);
  const [input, setInput] = useState("");
  const [chatStatus,setChatStatus]=useState('AI đang trả lời…');
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
    setToolsOpen(false);
    if (!next) bubble.current?.focus();
  };
  const end = useRef(null);
  const sending = useRef(false);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "nearest" }); }, [messages, busy, open]);
  const send = async (e, question) => {
    e.preventDefault();
    if(pendingChat()){await resumeChat();return;}
    const text = question || input.trim();
    if (!text || sending.current) return;
    historyEdited.current=true;
    sending.current = true;
    setBusy(true); setError("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next); setInput("");
    try {
      const payload={messages:next.slice(-11),context,requestId:crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(18)),n=>n.toString(16).padStart(2,'0')).join('')};
      const data=await requestChat(payload,setChatStatus);
      setMessages([...next, { role: "assistant", content: data.answer }]);setSavedWords([]);setWordJob(data.wordJob||null);
    } catch (e) { setMessages(messages); setInput(text); setError(e.message); }
    finally { setBusy(false); sending.current = false; }
  };
  const resumeChat=async()=>{const payload=pendingChat();if(!payload||sending.current)return;sending.current=true;setBusy(true);setError('');setMessages(payload.messages);try{const data=await requestChat(payload,setChatStatus);setMessages([...payload.messages,{role:'assistant',content:data.answer}]);setInput('');setWordJob(data.wordJob||null);}catch(e){setError(e.message);}finally{sending.current=false;setBusy(false);}};
  useEffect(()=>{if(pendingChat()){historyEdited.current=true;resumeChat();return;}const controller=new AbortController();fetch('/api/chat?history=1',{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Không tải được lịch sử chat. Tải lại để thử.');return r.json();}).then(d=>{if(!historyEdited.current)setMessages(d.messages||[]);}).catch(e=>{if(e.name!=='AbortError'&&!historyEdited.current)setError(e.message);});return()=>controller.abort();},[]);
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
      <header data-chat-compact-header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-700 px-3">
        <h2 className="min-w-0 truncate text-sm font-semibold text-sky-200">Chat <span className="font-normal text-slate-400">· {context.mode === "listening" ? "Listening" : context.mode === "grammar" ? "Grammar" : context.mode === "writing" ? "Writing" : "Vocabulary"}</span></h2>
        <button aria-label="Thu nhỏ chat" onClick={() => toggleChat(false)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300">✕</button>
      </header>
      <div role="log" aria-live="polite" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {!messages.length && <p className="text-slate-400">Hỏi thêm về câu, từ hoặc quy tắc đang học. Nội dung bài hiện tại được gửi cùng câu hỏi; không gửi ảnh hay toàn màn hình.</p>}
        {messages.map((m, i) => <div key={i} className={m.role === "user" ? "chat-message-in ml-6 whitespace-pre-wrap break-words rounded-xl bg-blue-900/60 p-3 text-white" : "chat-message-in mr-3 whitespace-pre-wrap break-words rounded-xl bg-slate-800 p-3 leading-relaxed text-slate-100"}><div className="mb-1 text-xs font-semibold text-sky-300">{m.role === "user" ? "Bạn" : "AI"}</div>{m.role === "assistant" ? <ChatAnswer text={m.content} /> : m.content}</div>)}
        {busy && <div role="status" className="flex items-center gap-2 text-sky-300"><span className="chat-typing flex gap-1" aria-hidden="true"><i /><i /><i /></span><span>{chatStatus}</span></div>}
        {!!savedWords.length&&<div role="status" className="rounded-lg bg-teal-950 p-2 text-xs text-teal-200">Đã lưu {savedWords.length} từ/cụm vào My Words: {savedWords.map(w=>w.english).join(', ')}. <button onClick={undoWords} className="min-h-11 underline">Hoàn tác</button></div>}
        {error && <div role="alert" className="text-red-300">{error}<button type="button" onClick={resumeChat} className="ml-2 min-h-11 underline">Nối lại</button><button type="button" onClick={()=>location.reload()} className="ml-2 min-h-11 underline">Tải lại / đăng nhập</button></div>}<div ref={end} />
      </div>
      <form onSubmit={send} className="relative flex shrink-0 items-center gap-1 border-t border-slate-700 p-2">
        <div ref={tools} className="contents">
          <button ref={toolsButton} type="button" aria-label="Công cụ và câu hỏi gợi ý" aria-expanded={toolsOpen} aria-controls="lesson-chat-tools" onClick={() => setToolsOpen(v => !v)} data-tools-open={toolsOpen} className="chat-tools-hint relative flex h-11 w-6 shrink-0 items-center justify-center rounded-md text-base text-sky-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"><svg data-chat-tools-icon="vertical-dots" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="chat-tools-dots shrink-0"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg><svg aria-hidden="true" data-chat-tools-icon="glowing-bulb" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="chat-tools-bulb absolute text-amber-300"><path d="M9 17h6m-5 3h4M9 14c0-2-3-3-3-6a6 6 0 0 1 12 0c0 3-3 4-3 6v1H9z" fill="currentColor" fillOpacity=".22" /><path d="M12 1V0M3 3 1.5 1.5M21 3l1.5-1.5M3 9H1m20 0h2" /></svg></button>
          {toolsOpen && <div id="lesson-chat-tools" aria-label="Công cụ chat" className="absolute bottom-full left-3 right-3 z-10 mb-2 max-h-[40dvh] overflow-y-auto rounded-xl border border-slate-600 bg-slate-950 p-1 shadow-xl">
            <div data-chat-settings className="border-b border-slate-700 px-3 py-2">
              <label className="flex min-h-11 items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={autoWords} onChange={changeAutoWords}/>Tự lưu từ vào My Words</label>
              <p className="pb-1 text-xs text-slate-400">Lịch sử riêng theo tài khoản · Lưu 7 ngày</p>
            </div>
            <button type="button" disabled={busy} onClick={e => { setToolsOpen(false); send(e, "Tạo một prompt tự chứa để tôi copy sang AI khác luyện tập đúng bài hiện tại. Đưa đủ kiến thức liên quan từ ngữ cảnh bài, không nói ‘bài trên’. Yêu cầu AI hỏi từng câu, chờ tôi trả lời, chấm và giải thích ngắn. Nếu tôi trả lời sai hoặc thiếu, giữ nguyên câu hiện tại, chỉ rõ từng lỗi và gợi ý rồi yêu cầu tôi trả lời lại; lặp lại đến khi đúng đầy đủ về nghĩa, ngữ pháp, thì, dạng từ, chính tả và mọi yêu cầu của câu. Chấp nhận cách diễn đạt khác nếu đúng và tự nhiên, không ép trùng đáp án mẫu. Không tự sửa hộ rồi coi là đạt; tôi phải tự gửi lại đáp án đúng hoàn chỉnh thì mới chuyển câu tiếp theo. Tổng 10 câu, lượt sửa không tính là câu mới. Đặt toàn bộ prompt trong một khối ```prompt riêng; lời dẫn ngoài khối thật ngắn."); }} className="w-full rounded-lg px-3 py-3 text-left text-sm text-sky-200 hover:bg-slate-800 disabled:opacity-40">Tạo prompt luyện với AI khác</button>
            {["Giải thích bài hiện tại dễ hiểu hơn, kèm ví dụ tiếng Anh và nghĩa tiếng Việt.", "Cho tôi ví dụ khác về kiến thức đang học, kèm giải thích ngắn.", "Hỏi tôi từng câu để luyện bài hiện tại. Chờ tôi trả lời trước khi nhận xét và hỏi tiếp."].map((text, i) => <button key={text} type="button" disabled={busy} onClick={() => { setInput(text); setToolsOpen(false); inputArea.current?.focus(); }} className="w-full rounded-lg px-3 py-3 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40">{["Giải thích bài dễ hiểu hơn", "Cho ví dụ khác", "Hỏi tôi từng câu"][i]}</button>)}
            <button type="button" disabled={busy} onClick={() => { setMessages([]); setError(""); setToolsOpen(false); toolsButton.current?.focus(); }} className="w-full border-t border-slate-700 px-3 py-3 text-left text-sm text-red-300 disabled:opacity-40">Xóa chat</button>
          </div>}
        </div>
        <textarea ref={inputArea} aria-label="Câu hỏi cho AI" value={input} onChange={e => setInput(e.target.value)} maxLength={4000} rows={1} placeholder="Vì sao câu này dùng thì đó?" className="min-w-0 flex-1 resize-none rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-white" />
        <button disabled={busy || !input.trim()} className="h-11 shrink-0 rounded-lg bg-blue-600 px-3 text-sm font-semibold disabled:opacity-40">Gửi</button>
      </form>
    </section>}
  </>;
}

function ChatAnswer({ text }) {
  return <div className="chat-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{
    pre: ({children}) => {
      const child = children;
      const content = String(child?.props?.children || "").replace(/\n$/, "");
      return <PromptBlock text={content} />;
    },
    a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({alt}) => <span>{alt ? `[Ảnh: ${alt}]` : "[Ảnh]"}</span>,
    table: ({children}) => <div className="chat-table-scroll" tabIndex={0} role="region" aria-label="Bảng trong câu trả lời"><table>{children}</table></div>,
  }}>{text}</ReactMarkdown></div>;
}

function PromptBlock({ text }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const area = useRef(null);
  useEffect(() => { if (manual) { area.current?.focus(); area.current?.select(); } }, [manual]);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2500); return () => clearTimeout(timer); }, [copied]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setManual(false); }
    catch { setManual(true); }
  };
  return <section data-prompt-block className="my-3 min-w-0 max-w-full rounded-xl border border-sky-700 bg-slate-950 p-3">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-sky-200">Prompt / nội dung sao chép</strong><button type="button" onClick={copy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white">{copied ? "Đã sao chép" : "Copy prompt"}</button></div>
    <div role="status" className="sr-only">{copied ? "Đã sao chép nội dung" : ""}</div>
    {manual ? <><p className="mb-2 text-xs text-amber-200">Trình duyệt chặn clipboard. Nội dung đã được chọn; nhấn giữ và chọn Sao chép.</p><textarea ref={area} aria-label="Nội dung prompt để sao chép thủ công" readOnly value={text} rows={8} onFocus={e => e.target.select()} className="w-full min-w-0 rounded border border-slate-600 bg-slate-900 p-2 text-sm" /></>
      : <details><summary className="cursor-pointer text-xs text-slate-300">Xem nội dung đầy đủ</summary><pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm [overflow-wrap:anywhere]">{text}</pre></details>}
  </section>;
}
