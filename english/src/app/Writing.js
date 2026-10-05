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
  const [view, setView] = useState(w.kind === "task" ? "brief" : "map");
  const sections = w.sections || [];
  const fullText = sections.map(s => (s.sentences || []).map(x => x.english).join(" ")).join("\n\n");
  const done = (w.checklist || []).filter((_, i) => checked[i]).length;
  const isTask = w.kind === "task";
  const t = w.task || {};
  const tabs = isTask
    ? [["brief", "📋 Đề bài"], ["map", "🧭 Dàn ý"], ["write", "✍️ Viết & chấm"]]
    : [["map", "🗺️ Cấu trúc"], ["phrases", "🧩 Câu mẫu"], ["check", "✅ Tự viết & kiểm tra"]];
  const [reqDone, setReqDone] = useState({});
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewErr, setReviewErr] = useState(null);
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const usedWord = (x) => draft.toLowerCase().split(/[^a-z']+/).some(tok => tok && tok.startsWith(String(x).toLowerCase().slice(0, Math.max(4, String(x).length - 2))));
  const grade = async () => {
    setReviewing(true); setReviewErr(null);
    try {
      const res = await fetch("/api/writing-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: { ...t, title: w.title }, draft }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Server error");
      setReview(d.review);
    } catch (e) { setReviewErr(e.message); } finally { setReviewing(false); }
  };

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

      {isTask && view === "brief" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Đề bài</div>
            <p className="mt-1 text-slate-100">{t.scenario}<SpeakBtn text={t.scenario || ""} className="ml-2 text-xs text-slate-400 hover:text-white" /></p>
            <p className="mt-1 italic text-slate-300">{t.scenarioVietnamese}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {t.sender && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người viết: {t.sender}</span>}
              {t.recipient && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người nhận: {t.recipient}</span>}
              {t.format && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Dạng bài: {t.format}</span>}
              {t.minWords && <span className="rounded bg-amber-900/60 px-2 py-1 font-semibold text-amber-200">Tối thiểu {t.minWords} từ</span>}
            </div>
          </div>
          {t.requirements?.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 font-semibold text-emerald-300">Phải có trong bài ({t.requirements.filter((_, i) => reqDone[i]).length}/{t.requirements.length})</div>
              <div className="space-y-2">{t.requirements.map((r, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200">
                  <input type="checkbox" checked={!!reqDone[i]} onChange={() => setReqDone(v => ({ ...v, [i]: !v[i] }))} className="mt-0.5 h-4 w-4 accent-emerald-500" />
                  <span className={reqDone[i] ? "text-slate-500 line-through" : ""}>{r}</span>
                </label>
              ))}</div>
            </div>
          )}
          {t.givenFacts?.length > 0 && <div className="rounded-xl border border-sky-800 bg-sky-950/30 p-4 text-sm text-sky-100"><div className="mb-1 font-semibold text-sky-300">Dữ kiện đề cho</div><ul className="list-disc space-y-1 pl-5">{t.givenFacts.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
          {t.wordBank?.length > 0 && (
            <div className="rounded-xl border border-teal-800/70 bg-teal-950/30 p-4">
              <div className="mb-2 font-semibold text-teal-300">Word bank (nên dùng)</div>
              <div className="grid gap-2 sm:grid-cols-2">{t.wordBank.map((b, i) => (
                <div key={i} className="rounded-lg bg-slate-950/60 p-3 text-sm">
                  <div className="flex items-center gap-2"><span className="font-bold text-teal-200">{b.word}</span>{b.partOfSpeech && <span className="rounded-full border border-teal-800 px-2 text-xs text-teal-300">{b.partOfSpeech}</span>}<SpeakBtn text={b.word} className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700" /></div>
                  <div className="mt-1 text-slate-200">{b.meaning}</div>
                  {b.example && <div className="mt-1 text-xs italic text-slate-400">{b.example}</div>}
                </div>
              ))}</div>
            </div>
          )}
        </div>
      )}

      {isTask && view === "write" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">📌 {t.scenarioVietnamese} {t.minWords ? <b className="text-amber-300">(tối thiểu {t.minWords} từ)</b> : null}</div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={12} placeholder="Viết bài của bạn ở đây (tiếng Anh)..." className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-400" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400"><span>{words}{t.minWords ? `/${t.minWords}` : ""} từ</span>{t.minWords && <span className={words >= t.minWords ? "text-emerald-300" : "text-amber-300"}>{words >= t.minWords ? "Đủ số từ" : `Còn thiếu ${t.minWords - words} từ`}</span>}</div>
            {t.minWords && <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full transition-all ${words >= t.minWords ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (words / t.minWords) * 100)}%` }} /></div>}
          </div>
          {t.wordBank?.length > 0 && (
            <div className="flex flex-wrap gap-2">{t.wordBank.map((b, i) => (
              <span key={i} className={`rounded-full border px-3 py-1 text-xs font-semibold ${usedWord(b.word) ? "border-emerald-500 bg-emerald-950 text-emerald-200" : "border-slate-700 text-slate-400"}`}>{usedWord(b.word) ? "✓ " : ""}{b.word}</span>
            ))}</div>
          )}
          <button onClick={grade} disabled={reviewing || draft.trim().length < 20} className="w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700">
            {reviewing ? <span className="flex items-center justify-center gap-2"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-300" />AI đang chấm...</span> : "🤖 AI chấm bài"}
          </button>
          {reviewErr && <div className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">❌ {reviewErr}</div>}
          {review && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5 text-center"><div className="text-4xl font-bold text-emerald-300">{review.score}<span className="text-lg text-emerald-200/60">/10</span></div><p className="mt-2 text-sm text-emerald-100">{review.summary}</p><div className="mt-2 inline-flex items-center rounded bg-fuchsia-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-200">🤖 AI chấm, chỉ để tham khảo</div></div>
              {review.checks?.length > 0 && <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm"><div className="mb-2 font-semibold text-slate-200">Đối chiếu yêu cầu đề</div>{review.checks.map((c, i) => <div key={i} className="mt-1 text-slate-300">{c.met ? "✅" : "❌"} {c.requirement}{c.note ? <span className="text-slate-500"> — {c.note}</span> : null}</div>)}</div>}
              {review.strengths?.length > 0 && <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100"><div className="mb-1 font-semibold text-emerald-300">Điểm tốt</div><ul className="list-disc space-y-1 pl-5">{review.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
              {review.issues?.length > 0 && <div className="space-y-2"><div className="font-semibold text-amber-300">Cần sửa</div>{review.issues.map((x, i) => (
                <div key={i} className="rounded-xl border border-amber-900/70 bg-slate-900 p-3 text-sm">
                  <div className="text-red-300 line-through decoration-red-500/60">{x.original}</div>
                  <div className="mt-1 text-slate-300">⚠️ {x.problem}</div>
                  <div className="mt-1 text-emerald-300">✔ {x.fix}<CopyBtn text={x.fix} /></div>
                </div>))}</div>}
              {review.improved && <div className="rounded-xl border border-purple-800 bg-purple-950/30 p-4 text-sm"><div className="mb-1 flex items-center justify-between font-semibold text-purple-300"><span>Bản đã sửa (tham khảo, hãy tự viết lại theo ý bạn)</span><span className="flex"><CopyBtn text={review.improved} /><SpeakBtn text={review.improved.slice(0, 900)} className="rounded-md bg-purple-900 px-2 py-1 text-xs hover:bg-purple-800" /></span></div><div className="whitespace-pre-wrap leading-relaxed text-slate-100">{review.improved}</div></div>}
            </div>
          )}
        </div>
      )}

      {view === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{isTask ? "Dàn ý gợi ý cho bài của bạn. Câu có [ngoặc] chỉ là khung để bạn tự điền ý, không phải đáp án." : "Mỗi khối màu là một phần của bài viết. Bấm vào từng câu để xem nghĩa và lý do viết như vậy."}</p>
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
