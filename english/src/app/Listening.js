"use client";
import { useEffect, useRef, useState } from "react";
export default function Listening({ words }) {
  const [lesson, setLesson] = useState(null), [url, setUrl] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const audio = useRef(null);
  const terms = [...new Set(words.map(w => w.word.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  const pattern = terms.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const highlight = text => {
    if (!pattern) return text;
    const matcher = new RegExp(`(?<![A-Za-z])(${pattern})(?![A-Za-z])`, "gi");
    const parts = []; let last = 0;
    for (const match of text.matchAll(matcher)) {
      parts.push(text.slice(last, match.index));
      parts.push(<mark key={match.index} className="rounded bg-amber-300/20 px-0.5 font-semibold text-amber-200">{match[0]}</mark>);
      last = match.index + match[0].length;
    }
    parts.push(text.slice(last));
    return parts;
  };
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const create = async () => {
    setBusy(true); setError("");
    try {
      let current = lesson;
      if (!current) {
        const res = await fetch("/api/listening", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words: words.map(w => w.word) }), signal: AbortSignal.timeout(100000) });
        current = await res.json(); if (!res.ok) throw new Error(current.error);
        setLesson(current);
      }
      const res = await fetch("/api/listening", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paragraph: current.paragraph }), signal: AbortSignal.timeout(100000) });
      if (!res.ok) throw new Error((await res.json()).error);
      setUrl(URL.createObjectURL(await res.blob()));
    } catch (e) { setError(e.message || "Không tạo được bài nghe"); } finally { setBusy(false); }
  };
  return <section id="vocabulary-listening" className="mt-6 rounded-2xl border border-teal-700 bg-teal-950/30 p-4">
    <h2 className="text-lg font-semibold text-teal-200">Luyện nghe {words.length} từ vừa học</h2>
    <p className="mt-1 text-sm text-slate-400">Đoạn văn có đủ từ trong bài. MP3 nghe chậm mặc định 0.8×, có thể tải về.</p>
    {!url && <button disabled={busy} onClick={create} className="mt-3 rounded-xl bg-teal-600 px-4 py-3 font-semibold disabled:opacity-50">{busy ? "Đang tạo bài nghe..." : lesson ? "Thử tạo lại MP3" : "Tạo file listening"}</button>}
    {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
    {url && <div className="mt-4 space-y-3">
      <audio ref={audio} src={url} controls preload="auto" onLoadedMetadata={() => { audio.current.playbackRate = .8; }} onPlay={() => { if ("mediaSession" in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: `Listening — ${words.length} từ vựng`, artist: "English Learner" }); }} className="w-full" />
      <div className="flex flex-wrap items-center gap-3 text-sm"><label>Tốc độ <select defaultValue="0.8" onChange={e => { audio.current.playbackRate = Number(e.target.value); }} className="rounded bg-slate-800 px-2 py-1"><option value="0.7">0.7×</option><option value="0.8">0.8×</option><option value="1">1×</option></select></label><a href={url} download="vocabulary-listening.mp3" className="text-teal-200 underline">Tải MP3</a></div>
      <p className="text-xs text-slate-400">Bấm Play trước khi khóa màn hình. Phát nền phụ thuộc trình duyệt/điện thoại. MP3 tải về dùng được với trình nghe nhạc.</p>
    </div>}
    {lesson && <details className="mt-4 text-sm"><summary className="cursor-pointer text-teal-200">Xem đoạn nghe và bản dịch</summary><p className="mt-3 whitespace-pre-wrap leading-relaxed text-white">{highlight(lesson.paragraph)}</p><p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-400">{lesson.translation}</p></details>}
  </section>;
}
