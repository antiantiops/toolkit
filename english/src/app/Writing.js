"use client";
import { useState } from "react";

const COLORS = [
  ["border-sky-600", "bg-sky-950/40", "text-sky-300"],
  ["border-emerald-600", "bg-emerald-950/40", "text-emerald-300"],
  ["border-amber-600", "bg-amber-950/40", "text-amber-300"],
  ["border-fuchsia-600", "bg-fuchsia-950/40", "text-fuchsia-300"],
  ["border-teal-600", "bg-teal-950/40", "text-teal-300"],
  ["border-rose-600", "bg-rose-950/40", "text-rose-300"],
];

// Highlight [placeholders] in reusable frames.
const frame = (t = "") => t.split(/(\[[^\]]+\])/g).map((p, i) => /^\[[^\]]+\]$/.test(p) ? <mark key={i} className="rounded bg-amber-300/20 px-1 font-semibold text-amber-200">{p}</mark> : p);

export default function Writing({ writing: w, SpeakBtn, CopyBtn }) {
  const [open, setOpen] = useState(null); // "si-sj" of opened sentence
  const [checked, setChecked] = useState({});
  const [draft, setDraft] = useState("");
  const [view, setView] = useState("map"); // map | phrases | check
  const sections = w.sections || [];
  const fullText = sections.map(s => (s.sentences || []).map(x => x.english).join(" ")).join("\n\n");
  const done = (w.checklist || []).filter((_, i) => checked[i]).length;
  const tabs = [["map", "🗺️ Cấu trúc"], ["phrases", "🧩 Câu mẫu"], ["check", "✅ Tự viết & kiểm tra"]];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{w.writingType}</div>
        <h2 className="mt-1 text-xl font-bold text-emerald-200 sm:text-2xl">{w.title}</h2>
        <p className="mt-1 text-sm text-emerald-100/70">{w.titleVietnamese}</p>
      </div>

      {w.goal && <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-100"><span className="font-semibold text-emerald-300">Mục tiêu: </span>{w.goal}</div>}
      {w.situation?.english && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tình huống</div>
          <div className="mt-1 text-slate-100">{w.situation.english}<SpeakBtn text={w.situation.english} className="ml-2 text-xs text-slate-400 hover:text-white" /></div>
          <div className="mt-1 italic text-slate-400">{w.situation.vietnamese}</div>
        </div>
      )}

      <div className="flex gap-2">{tabs.map(([k, l]) => (
        <button key={k} onClick={() => setView(k)} className={`flex-1 rounded-xl px-2 py-2.5 text-sm font-semibold transition-colors ${view === k ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>{l}</button>
      ))}</div>

      {view === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Mỗi khối màu là một phần của bài viết. Bấm vào từng câu để xem nghĩa và lý do viết như vậy.</p>
          {sections.map((s, si) => {
            const [bd, bg, tx] = COLORS[si % COLORS.length];
            return (
              <div key={si} className={`rounded-xl border-l-4 ${bd} ${bg} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-current px-2 py-0.5 text-xs font-bold ${tx}`}>{si + 1}</span>
                  <span className={`font-bold ${tx}`}>{s.label}</span>
                  <span className="text-sm text-slate-300">· {s.labelVietnamese}</span>
                  {s.tone && <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">🎙️ {s.tone}</span>}
                </div>
                <p className="mt-2 text-sm text-slate-300">🎯 {s.purpose}</p>
                <div className="mt-3 space-y-2">
                  {(s.sentences || []).map((x, sj) => {
                    const id = `${si}-${sj}`, isOpen = open === id;
                    return (
                      <div key={sj} className="rounded-lg bg-slate-950/70 p-3">
                        <div className="flex items-start gap-2">
                          <button type="button" onClick={() => setOpen(isOpen ? null : id)} className="flex-1 text-left text-sm leading-relaxed text-slate-100 hover:text-white">{x.english}</button>
                          <SpeakBtn text={x.english} className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700" />
                          <CopyBtn text={x.english} />
                        </div>
                        {isOpen && (
                          <div className="mt-2 space-y-1 border-t border-slate-700 pt-2 text-sm">
                            <div className="text-slate-300">🇻🇳 {x.vietnamese}</div>
                            {x.why && <div className="text-amber-300">💡 {x.why}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
            <span>Toàn bộ bài mẫu (đã diễn đạt lại)</span><span className="flex items-center gap-1"><CopyBtn text={fullText} /><SpeakBtn text={fullText.slice(0, 900)} className="rounded-md bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600">🔊 Nghe</SpeakBtn></span>
          </div>
        </div>
      )}

      {view === "phrases" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">Khung câu dùng lại được. Thay phần <mark className="rounded bg-amber-300/20 px-1 text-amber-200">[trong ngoặc]</mark> bằng thông tin của bạn.</p>
          {(w.usefulPhrases || []).map((p, i) => (
            <div key={i} className="rounded-xl border border-teal-800/70 bg-teal-950/40 p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 font-medium leading-relaxed text-teal-100">{frame(p.pattern)}</div>
                <SpeakBtn text={(p.pattern || "").replace(/[\[\]]/g, "")} className="shrink-0 rounded-md bg-teal-900 px-2 py-1 text-xs hover:bg-teal-800" />
                <CopyBtn text={p.pattern} />
              </div>
              <div className="mt-1 text-sm text-teal-200/80">{p.meaning}</div>
              {p.use && <div className="mt-1 text-xs text-slate-400">📌 {p.use}</div>}
            </div>
          ))}
          {w.tips?.length > 0 && <div className="rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-200"><div className="mb-1 font-semibold">Mẹo viết</div><ul className="list-disc space-y-1 pl-5">{w.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
        </div>
      )}

      {view === "check" && (
        <div className="space-y-5">
          {w.yourTurn?.scenario && (
            <div className="rounded-xl border border-purple-800 bg-purple-950/30 p-4 text-sm">
              <div className="font-semibold text-purple-300">✍️ Đến lượt bạn</div>
              <p className="mt-1 text-slate-200">{w.yourTurn.scenario}</p>
              {w.yourTurn.hints?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{w.yourTurn.hints.map((h, i) => <li key={i}>{h}</li>)}</ul>}
            </div>
          )}
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={8} placeholder="Viết bài của bạn ở đây, rồi tick checklist bên dưới..." className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-400" />
          <div className="text-right text-xs text-slate-500">{draft.trim() ? draft.trim().split(/\s+/).length : 0} từ</div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between"><span className="font-semibold text-emerald-300">Checklist trước khi nộp</span><span className="text-sm text-slate-400">{done}/{(w.checklist || []).length}</span></div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(w.checklist?.length ? done / w.checklist.length : 0) * 100}%` }} /></div>
            <div className="space-y-2">{(w.checklist || []).map((c, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200">
                <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked(v => ({ ...v, [i]: !v[i] }))} className="mt-0.5 h-4 w-4 accent-emerald-500" />
                <span className={checked[i] ? "text-slate-500 line-through" : ""}>{c}</span>
              </label>
            ))}</div>
            {done === (w.checklist || []).length && done > 0 && <div className="mt-3 rounded-lg bg-emerald-950 p-3 text-center text-sm font-semibold text-emerald-300">🎉 Đủ ý rồi. Đọc lại một lần rồi nộp.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
