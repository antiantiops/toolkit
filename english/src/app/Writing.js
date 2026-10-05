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
const frame = (t = "") =>
  t.split(/(\[[^\]]+\])/g).map((p, i) =>
    /^\[[^\]]+\]$/.test(p) ? (
      <mark key={i} className="rounded bg-amber-300/20 px-1 font-semibold text-amber-200">
        {p}
      </mark>
    ) : (
      p
    )
  );

export default function Writing({ writing: w, SpeakBtn, CopyBtn }) {
  const [modelDraft, setModelDraft] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [modelErr, setModelErr] = useState(null);
  const [selectedPhrase, setSelectedPhrase] = useState(null);

  const fetchModelDraft = async () => {
    setLoadingModel(true);
    setModelErr(null);
    try {
      const res = await fetch("/api/writing-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, title: w.title }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Không tải được bài mẫu");
      setModelDraft(d.modelDraft);
    } catch (e) {
      setModelErr(e.message);
    } finally {
      setLoadingModel(false);
    }
  };
  const [open, setOpen] = useState(null); // "si-sj" of opened sentence
  const [checked, setChecked] = useState({});
  const [draft, setDraft] = useState("");

  const isDual = w.kind === "dual";
  const isTask = w.kind === "task";
  const isSample = !isDual && !isTask;

  const sample = isDual ? w.sample || {} : isSample ? w : {};
  const task = isDual ? w.task || {} : isTask ? w.task || {} : {};

  const defaultView = isDual ? "sample" : isTask ? "brief" : "map";
  const [view, setView] = useState(defaultView);

  const tabs = isDual
    ? [
        ["sample", "📖 1. Bài mẫu"],
        ["task", "📋 2. Đề bài & Word Bank"],
        ["outline", "🧭 3. Dàn ý gợi ý"],
        ["write", "✍️ 4. Viết & Chấm AI"],
      ]
    : isTask
    ? [
        ["brief", "📋 Đề bài"],
        ["map", "🧭 Dàn ý"],
        ["write", "✍️ Viết & chấm"],
      ]
    : [
        ["map", "🗺️ Cấu trúc"],
        ["phrases", "🧩 Câu mẫu"],
        ["check", "✅ Tự viết & kiểm tra"],
      ];

  const [reqDone, setReqDone] = useState({});
  const [review, setReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewErr, setReviewErr] = useState(null);

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const usedWord = (x) =>
    draft
      .toLowerCase()
      .split(/[^a-z']+/)
      .some((tok) => tok && tok.startsWith(String(x).toLowerCase().slice(0, Math.max(4, String(x).length - 2))));

  const grade = async () => {
    setReviewing(true);
    setReviewErr(null);
    try {
      const res = await fetch("/api/writing-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: { ...task, title: w.title }, draft }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Server error");
      setReview(d.review);
    } catch (e) {
      setReviewErr(e.message);
    } finally {
      setReviewing(false);
    }
  };

  const sections = (isDual ? sample.sections : w.sections) || [];
  const fullText = sections.map((s) => (s.sentences || []).map((x) => x.english).join(" ")).join("\n\n");
  const done = (w.checklist || []).filter((_, i) => checked[i]).length;

  return (
    <div className="space-y-5">
      {/* Unit header */}
      <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
          {w.writingType || "Business Writing"}
        </div>
        <h2 className="mt-1 text-xl font-bold text-emerald-200 sm:text-2xl">{w.title}</h2>
        <p className="mt-1 text-sm text-emerald-100/70">{w.titleVietnamese}</p>
        {isDual && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-600/50 bg-emerald-900/40 px-3 py-1 text-xs text-emerald-200">
            <span>📑 Trọn bộ Unit:</span>
            <span className="font-semibold text-white">Bài mẫu + Bài tập Self-Writing</span>
          </div>
        )}
      </div>

      {/* Goal (if any) */}
      {w.goal && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-100">
          <span className="font-semibold text-emerald-300">Mục tiêu: </span>
          {w.goal}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              view === k ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ================= VIEW: SAMPLE (Dual Mode) ================= */}
      {isDual && view === "sample" && (
        <div className="space-y-4">
          {sample.scenario && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tình huống bài mẫu</div>
              <div className="mt-1 text-slate-100 leading-relaxed">
                {sample.scenario}
                <SpeakBtn text={sample.scenario} className="ml-2 text-xs text-slate-400 hover:text-white" />
              </div>
              <div className="mt-1 italic text-slate-400 leading-relaxed">{sample.scenarioVietnamese}</div>
            </div>
          )}

          <p className="text-sm text-slate-400">
            Mỗi khối màu là một phần của email mẫu. Bấm vào từng câu để xem nghĩa và lý do người bản xứ viết như vậy:
          </p>

          {sections.map((s, si) => {
            const [bd, bg, tx] = COLORS[si % COLORS.length];
            return (
              <div key={si} className={`rounded-xl border-l-4 ${bd} ${bg} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-current px-2 py-0.5 text-xs font-bold ${tx}`}>
                    {si + 1}
                  </span>
                  <span className={`font-bold ${tx}`}>{s.label}</span>
                  <span className="text-sm text-slate-300">· {s.labelVietnamese}</span>
                  {s.tone && (
                    <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      🎙️ {s.tone}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-300">🎯 {s.purpose}</p>
                <div className="mt-3 space-y-2">
                  {(s.sentences || []).map((x, sj) => {
                    const id = `${si}-${sj}`,
                      isOpen = open === id;
                    return (
                      <div key={sj} className="rounded-lg bg-slate-950/70 p-3">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : id)}
                            className="flex-1 text-left text-sm leading-relaxed text-slate-100 hover:text-white"
                          >
                            {x.english}
                          </button>
                          <SpeakBtn
                            text={x.english}
                            className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                          />
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

          {fullText && (
            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
              <span>Toàn bộ bài mẫu (đã diễn đạt lại)</span>
              <span className="flex items-center gap-1">
                <CopyBtn text={fullText} />
                <SpeakBtn
                  text={fullText.slice(0, 900)}
                  className="rounded-md bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
                >
                  🔊 Nghe
                </SpeakBtn>
              </span>
            </div>
          )}

          {sample.usefulPhrases?.length > 0 && (
            <div className="mt-6 space-y-3 pt-2">
              <h3 className="text-base font-bold text-teal-300">🧩 Khung câu mẫu tái sử dụng</h3>
              <p className="text-sm text-slate-400">
                Thay phần <mark className="rounded bg-amber-300/20 px-1 text-amber-200">[trong ngoặc]</mark> bằng thông tin của bạn.
              </p>
              {sample.usefulPhrases.map((p, i) => (
                <div key={i} className="rounded-xl border border-teal-800/70 bg-teal-950/40 p-4">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 font-medium leading-relaxed text-teal-100">{frame(p.pattern)}</div>
                    <SpeakBtn
                      text={(p.pattern || "").replace(/[\[\]]/g, "")}
                      className="shrink-0 rounded-md bg-teal-900 px-2 py-1 text-xs hover:bg-teal-800"
                    />
                    <CopyBtn text={p.pattern} />
                  </div>
                  <div className="mt-1 text-sm text-teal-200/80">{p.meaning}</div>
                  {p.use && <div className="mt-1 text-xs text-slate-400">📌 {p.use}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW: TASK (Dual Mode) ================= */}
      {isDual && view === "task" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Đề bài Self-Writing</div>
            <p className="mt-1 text-slate-100 leading-relaxed">
              {task.scenario}
              <SpeakBtn text={task.scenario || ""} className="ml-2 text-xs text-slate-400 hover:text-white" />
            </p>
            <p className="mt-1 italic text-slate-300 leading-relaxed">{task.scenarioVietnamese}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {task.sender && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người viết: {task.sender}</span>}
              {task.recipient && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người nhận: {task.recipient}</span>}
              {task.format && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Dạng bài: {task.format}</span>}
              {task.minWords && (
                <span className="rounded bg-amber-900/60 px-2 py-1 font-semibold text-amber-200">
                  Tối thiểu {task.minWords} từ
                </span>
              )}
            </div>
          </div>

          {task.strategy && (
            <div className="rounded-xl border border-emerald-700/80 bg-emerald-950/30 p-4 text-sm">
              <div className="font-semibold text-emerald-300 mb-1">💡 Chiến lược làm bài</div>
              <p className="text-slate-200 leading-relaxed">{task.strategy}</p>
            </div>
          )}

          {task.requirements?.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 font-semibold text-emerald-300">
                Phải có trong bài ({task.requirements.filter((_, i) => reqDone[i]).length}/{task.requirements.length})
              </div>
              <div className="space-y-2">
                {task.requirements.map((r, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={!!reqDone[i]}
                      onChange={() => setReqDone((v) => ({ ...v, [i]: !v[i] }))}
                      className="mt-0.5 h-4 w-4 accent-emerald-500"
                    />
                    <span className={reqDone[i] ? "text-slate-500 line-through" : ""}>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {task.wordBank?.length > 0 && (
            <div className="rounded-xl border border-teal-800/70 bg-teal-950/30 p-4">
              <div className="mb-2 font-semibold text-teal-300">Word Bank cho sẵn ({task.wordBank.length} từ)</div>
              <p className="text-xs text-slate-400 mb-3">
                Đề bài khuyến khích sử dụng các từ này trong bài viết:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {task.wordBank.map((b, i) => (
                  <div key={i} className="rounded-lg bg-slate-950/60 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-200">{b.word}</span>
                      {b.partOfSpeech && (
                        <span className="rounded-full border border-teal-800 px-2 text-xs text-teal-300">
                          {b.partOfSpeech}
                        </span>
                      )}
                      <SpeakBtn
                        text={b.word}
                        className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                      />
                    </div>
                    <div className="mt-1 text-slate-200 font-medium">{b.meaning}</div>
                    {b.example && <div className="mt-1 text-xs italic text-slate-400">{b.example}</div>}
                    {b.tipForTask && <div className="mt-1 text-xs text-amber-300">👉 {b.tipForTask}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW: OUTLINE (Dual Mode) ================= */}
      {isDual && view === "outline" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Dàn ý gợi ý chi tiết để viết bài Self-Writing dựa trên cấu trúc bài mẫu. Thay phần{" "}
            <mark className="rounded bg-amber-300/20 px-1 text-amber-200">[trong ngoặc]</mark> để viết câu của bạn:
          </p>
          {/* Vietnamese Interactive Model Draft */}
          <div className="rounded-2xl border border-teal-700/60 bg-gradient-to-b from-slate-900 to-teal-950/20 p-4 sm:p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 bg-teal-950/80 border border-teal-800 rounded px-2 py-0.5">
                  🇻🇳 Bài mẫu tiếng Việt đối chiếu
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  Email mẫu hoàn chỉnh (bấm vào cụm màu để xem tiếng Anh & cách dùng)
                </h3>
              </div>
              {!modelDraft && (
                <button
                  type="button"
                  onClick={fetchModelDraft}
                  disabled={loadingModel}
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow transition-colors flex items-center gap-1.5"
                >
                  {loadingModel ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang soạn bài mẫu...</span>
                    </>
                  ) : (
                    "✨ Tạo bài mẫu tiếng Việt đối ứng"
                  )}
                </button>
              )}
            </div>

            {modelErr && (
              <div className="rounded-xl border border-red-800 bg-red-950/80 p-3 text-xs text-red-300 mb-3">
                ❌ {modelErr}
              </div>
            )}

            {modelDraft ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 italic">
                  💡 Nhấp vào các cụm từ bôi màu <span className="text-teal-300 font-semibold">[trong ngoặc]</span> để mở hộp thoại tra tiếng Anh tương ứng, phiên âm, cách đọc dễ và vị trí ngữ cảnh trong đoạn.
                </p>
                {(modelDraft.paragraphs || []).map((p, pi) => {
                  const phrasesMap = {};
                  (p.phrases || []).forEach(item => {
                    if (item.vi) phrasesMap[item.vi.trim().toLowerCase()] = item;
                  });

                  // Render text and highlight [phrase]
                  const parts = (p.text || "").split(/(\[[^\]]+\])/g);

                  return (
                    <div key={pi} className="rounded-xl border border-slate-700/80 bg-slate-950/80 p-3.5 sm:p-4">
                      <div className="text-xs font-bold text-teal-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                        {p.part}
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200">
                        {parts.map((pt, pti) => {
                          const m = pt.match(/^\[(.*)\]$/);
                          if (!m) return <span key={pti}>{pt}</span>;
                          const viClean = m[1].trim();
                          const found = phrasesMap[viClean.toLowerCase()] || (p.phrases || []).find(x => x.vi && (x.vi.includes(viClean) || viClean.includes(x.vi)));
                          
                          return (
                            <button
                              key={pti}
                              type="button"
                              onClick={() => {
                                setSelectedPhrase(found || {
                                  vi: viClean,
                                  en: "Đang cập nhật...",
                                  contextUsage: "Nhấp tra từ trên thanh công cụ để dịch chính xác cụm này."
                                });
                              }}
                              className="inline-block mx-0.5 px-2 py-0.5 rounded-lg bg-teal-950/90 border border-teal-600/70 text-teal-200 hover:bg-teal-800 hover:text-white font-medium transition-all text-sm underline decoration-teal-400 decoration-dotted underline-offset-4 active:scale-95"
                              title="Bấm để xem tiếng Anh, phát âm & ngữ cảnh"
                            >
                              {viClean}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loadingModel ? (
              <div className="text-center py-6 text-slate-400 text-xs sm:text-sm">
                Bấm nút <b className="text-teal-300">"Tạo bài mẫu tiếng Việt đối ứng"</b> để AI viết bài tham khảo mẫu sát với tình huống đề bài và 10 từ Word Bank.
              </div>
            ) : null}
          </div>

          {/* Modal popup tra cụm từ tiếng Việt sang tiếng Anh */}
          {selectedPhrase && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setSelectedPhrase(null)}
              onKeyDown={(e) => { if (e.key === "Escape") setSelectedPhrase(null); }}
            >
              <div
                className="w-full max-w-lg rounded-2xl border border-teal-600 bg-slate-900 p-5 sm:p-6 text-left shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">🇻🇳 Cụm từ tiếng Việt:</span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{selectedPhrase.vi}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPhrase(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* English phrase and pronunciation */}
                <div className="rounded-xl border border-teal-700/50 bg-teal-950/40 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-300 uppercase">🇬🇧 Tiếng Anh tương đương:</span>
                    {selectedPhrase.partOfSpeech && (
                      <span className="text-xs rounded-full border border-teal-800 bg-teal-900/60 px-2 py-0.5 text-teal-200">
                        {selectedPhrase.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-emerald-200">{selectedPhrase.en}</span>
                    <SpeakBtn text={selectedPhrase.en} className="rounded-lg bg-teal-900/80 px-2.5 py-1 text-xs text-white hover:bg-teal-800" />
                    <CopyBtn text={selectedPhrase.en} />
                  </div>
                  {selectedPhrase.ipa && (
                    <div className="text-xs text-slate-300 font-mono">
                      IPA: <span className="text-teal-300">{selectedPhrase.ipa}</span>
                    </div>
                  )}
                  {selectedPhrase.easyReading && (
                    <div className="text-xs text-amber-200 bg-amber-950/40 border border-amber-800/60 rounded-lg p-2">
                      🗣️ <b>Đọc dễ:</b> <i>{selectedPhrase.easyReading}</i>
                    </div>
                  )}
                </div>

                {/* Context usage */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-sm">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span>📌</span>
                    <span>Cách dùng trong ngữ cảnh đoạn văn:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {selectedPhrase.contextUsage}
                  </p>
                  {selectedPhrase.sentenceEn && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Câu tiếng Anh mẫu trong bài:</span>
                      <div className="flex items-start gap-2 bg-slate-900 rounded-lg p-2.5 border border-slate-800">
                        <span className="text-xs sm:text-sm text-emerald-200 italic flex-1">
                          "{selectedPhrase.sentenceEn}"
                        </span>
                        <SpeakBtn text={selectedPhrase.sentenceEn} className="shrink-0 text-xs px-2 py-1" />
                        <CopyBtn text={selectedPhrase.sentenceEn} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedPhrase(null)}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}

          {(task.suggestedOutline || []).map((step, si) => {
            const [bd, bg, tx] = COLORS[si % COLORS.length];
            return (
              <div key={si} className={`rounded-xl border-l-4 ${bd} ${bg} p-4`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border border-current px-2 py-0.5 text-xs font-bold ${tx}`}>
                    {si + 1}
                  </span>
                  <span className={`font-bold ${tx}`}>{step.step}</span>
                </div>
                {step.advice && <p className="mt-2 text-sm text-slate-300 leading-relaxed">💡 {step.advice}</p>}
                {step.starter && (
                  <div className="mt-3 rounded-lg bg-slate-950/70 p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 font-medium leading-relaxed text-slate-100">{frame(step.starter)}</div>
                      <SpeakBtn
                        text={(step.starter || "").replace(/[\[\]]/g, "")}
                        className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                      />
                      <CopyBtn text={step.starter} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ================= VIEW: WRITE (Dual or Single Task) ================= */}
      {((isDual && view === "write") || (isTask && view === "write")) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300">
            📌 {task.scenarioVietnamese}{" "}
            {task.minWords ? <b className="text-amber-300">(yêu cầu tối thiểu {task.minWords} từ)</b> : null}
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            placeholder="Viết bài email của bạn ở đây bằng tiếng Anh..."
            className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-400 leading-relaxed"
          />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                {words}
                {task.minWords ? `/${task.minWords}` : ""} từ
              </span>
              {task.minWords && (
                <span className={words >= task.minWords ? "text-emerald-300 font-semibold" : "text-amber-300"}>
                  {words >= task.minWords ? "✓ Đã đủ số từ yêu cầu" : `Còn thiếu ${task.minWords - words} từ`}
                </span>
              )}
            </div>
            {task.minWords && (
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    words >= task.minWords ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (words / task.minWords) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {task.wordBank?.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1.5">Word Bank đã dùng:</div>
              <div className="flex flex-wrap gap-2">
                {task.wordBank.map((b, i) => (
                  <span
                    key={i}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      usedWord(b.word)
                        ? "border-emerald-500 bg-emerald-950 text-emerald-200"
                        : "border-slate-700 bg-slate-900 text-slate-400"
                    }`}
                  >
                    {usedWord(b.word) ? "✓ " : ""}
                    {b.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={grade}
            disabled={reviewing || draft.trim().length < 20}
            className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 transition-colors"
          >
            {reviewing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-emerald-300" />
                AI đang phân tích và chấm bài...
              </span>
            ) : (
              "🤖 AI chấm bài & nhận xét"
            )}
          </button>

          {reviewErr && (
            <div className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">❌ {reviewErr}</div>
          )}

          {review && (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5 text-center shadow-lg">
                <div className="text-4xl font-bold text-emerald-300">
                  {review.score}
                  <span className="text-lg text-emerald-200/60">/10</span>
                </div>
                <p className="mt-2 text-sm text-emerald-100 leading-relaxed">{review.summary}</p>
                <div className="mt-2 inline-flex items-center rounded bg-fuchsia-900/60 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200">
                  🤖 AI chấm, dùng để học tập & tham khảo
                </div>
              </div>

              {review.checks?.length > 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm">
                  <div className="mb-2 font-semibold text-slate-200">Đối chiếu yêu cầu đề bài:</div>
                  <div className="space-y-1.5">
                    {review.checks.map((c, i) => (
                      <div key={i} className="text-slate-300">
                        {c.met ? "✅" : "❌"} {c.requirement}
                        {c.note ? <span className="text-slate-500"> — {c.note}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.strengths?.length > 0 && (
                <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-100">
                  <div className="mb-1 font-semibold text-emerald-300">Điểm tốt:</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {review.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.issues?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-amber-300">Các điểm cần cải thiện:</div>
                  {review.issues.map((x, i) => (
                    <div key={i} className="rounded-xl border border-amber-900/70 bg-slate-900 p-3 text-sm">
                      <div className="text-red-300 line-through decoration-red-500/60">{x.original}</div>
                      <div className="mt-1 text-slate-300">⚠️ {x.problem}</div>
                      <div className="mt-1 text-emerald-300 font-medium">
                        ✔ {x.fix}
                        <CopyBtn text={x.fix} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {review.improved && (
                <div className="rounded-xl border border-purple-800 bg-purple-950/30 p-4 text-sm">
                  <div className="mb-2 flex items-center justify-between font-semibold text-purple-300">
                    <span>Bản viết lại hoàn chỉnh (tham khảo):</span>
                    <span className="flex items-center gap-1">
                      <CopyBtn text={review.improved} />
                      <SpeakBtn
                        text={review.improved.slice(0, 900)}
                        className="rounded-md bg-purple-900 px-2 py-1 text-xs hover:bg-purple-800"
                      />
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-100 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    {review.improved}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= SINGLE TASK MODE VIEWS ================= */}
      {isTask && view === "brief" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-300">Đề bài</div>
            <p className="mt-1 text-slate-100">
              {task.scenario}
              <SpeakBtn text={task.scenario || ""} className="ml-2 text-xs text-slate-400 hover:text-white" />
            </p>
            <p className="mt-1 italic text-slate-300">{task.scenarioVietnamese}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {task.sender && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người viết: {task.sender}</span>}
              {task.recipient && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Người nhận: {task.recipient}</span>}
              {task.format && <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Dạng bài: {task.format}</span>}
              {task.minWords && (
                <span className="rounded bg-amber-900/60 px-2 py-1 font-semibold text-amber-200">
                  Tối thiểu {task.minWords} từ
                </span>
              )}
            </div>
          </div>
          {task.requirements?.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 font-semibold text-emerald-300">
                Phải có trong bài ({task.requirements.filter((_, i) => reqDone[i]).length}/{task.requirements.length})
              </div>
              <div className="space-y-2">
                {task.requirements.map((r, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={!!reqDone[i]}
                      onChange={() => setReqDone((v) => ({ ...v, [i]: !v[i] }))}
                      className="mt-0.5 h-4 w-4 accent-emerald-500"
                    />
                    <span className={reqDone[i] ? "text-slate-500 line-through" : ""}>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {task.wordBank?.length > 0 && (
            <div className="rounded-xl border border-teal-800/70 bg-teal-950/30 p-4">
              <div className="mb-2 font-semibold text-teal-300">Word bank (nên dùng)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {task.wordBank.map((b, i) => (
                  <div key={i} className="rounded-lg bg-slate-950/60 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-200">{b.word}</span>
                      {b.partOfSpeech && (
                        <span className="rounded-full border border-teal-800 px-2 text-xs text-teal-300">
                          {b.partOfSpeech}
                        </span>
                      )}
                      <SpeakBtn
                        text={b.word}
                        className="ml-auto rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                      />
                    </div>
                    <div className="mt-1 text-slate-200">{b.meaning}</div>
                    {b.example && <div className="mt-1 text-xs italic text-slate-400">{b.example}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isTask && view === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Dàn ý gợi ý cho bài của bạn. Câu có [ngoặc] chỉ là khung để bạn tự điền ý, không phải đáp án.
          </p>
          {sections.map((s, si) => {
            const [bd, bg, tx] = COLORS[si % COLORS.length];
            return (
              <div key={si} className={`rounded-xl border-l-4 ${bd} ${bg} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-current px-2 py-0.5 text-xs font-bold ${tx}`}>
                    {si + 1}
                  </span>
                  <span className={`font-bold ${tx}`}>{s.label}</span>
                  <span className="text-sm text-slate-300">· {s.labelVietnamese}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">🎯 {s.purpose}</p>
                <div className="mt-3 space-y-2">
                  {(s.sentences || []).map((x, sj) => (
                    <div key={sj} className="rounded-lg bg-slate-950/70 p-3">
                      <div className="flex items-start gap-2">
                        <span className="flex-1 text-sm text-slate-100">{frame(x.english)}</span>
                        <SpeakBtn
                          text={(x.english || "").replace(/[\[\]]/g, "")}
                          className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                        />
                        <CopyBtn text={x.english} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{x.vietnamese}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= SINGLE SAMPLE MODE VIEWS ================= */}
      {isSample && view === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Mỗi khối màu là một phần của bài viết. Bấm vào từng câu để xem nghĩa và lý do viết như vậy.
          </p>
          {sections.map((s, si) => {
            const [bd, bg, tx] = COLORS[si % COLORS.length];
            return (
              <div key={si} className={`rounded-xl border-l-4 ${bd} ${bg} p-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border border-current px-2 py-0.5 text-xs font-bold ${tx}`}>
                    {si + 1}
                  </span>
                  <span className={`font-bold ${tx}`}>{s.label}</span>
                  <span className="text-sm text-slate-300">· {s.labelVietnamese}</span>
                  {s.tone && (
                    <span className="ml-auto rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      🎙️ {s.tone}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-300">🎯 {s.purpose}</p>
                <div className="mt-3 space-y-2">
                  {(s.sentences || []).map((x, sj) => {
                    const id = `${si}-${sj}`,
                      isOpen = open === id;
                    return (
                      <div key={sj} className="rounded-lg bg-slate-950/70 p-3">
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : id)}
                            className="flex-1 text-left text-sm leading-relaxed text-slate-100 hover:text-white"
                          >
                            {x.english}
                          </button>
                          <SpeakBtn
                            text={x.english}
                            className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs hover:bg-slate-700"
                          />
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
            <span>Toàn bộ bài mẫu (đã diễn đạt lại)</span>
            <span className="flex items-center gap-1">
              <CopyBtn text={fullText} />
              <SpeakBtn
                text={fullText.slice(0, 900)}
                className="rounded-md bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600"
              >
                🔊 Nghe
              </SpeakBtn>
            </span>
          </div>
        </div>
      )}

      {isSample && view === "phrases" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Khung câu dùng lại được. Thay phần <mark className="rounded bg-amber-300/20 px-1 text-amber-200">[trong ngoặc]</mark> bằng thông tin của bạn.
          </p>
          {(w.usefulPhrases || []).map((p, i) => (
            <div key={i} className="rounded-xl border border-teal-800/70 bg-teal-950/40 p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1 font-medium leading-relaxed text-teal-100">{frame(p.pattern)}</div>
                <SpeakBtn
                  text={(p.pattern || "").replace(/[\[\]]/g, "")}
                  className="shrink-0 rounded-md bg-teal-900 px-2 py-1 text-xs hover:bg-teal-800"
                />
                <CopyBtn text={p.pattern} />
              </div>
              <div className="mt-1 text-sm text-teal-200/80">{p.meaning}</div>
              {p.use && <div className="mt-1 text-xs text-slate-400">📌 {p.use}</div>}
            </div>
          ))}
        </div>
      )}

      {isSample && view === "check" && (
        <div className="space-y-5">
          {w.yourTurn?.scenario && (
            <div className="rounded-xl border border-purple-800 bg-purple-950/30 p-4 text-sm">
              <div className="font-semibold text-purple-300">✍️ Đến lượt bạn</div>
              <p className="mt-1 text-slate-200">{w.yourTurn.scenario}</p>
            </div>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            placeholder="Viết bài của bạn ở đây, rồi tick checklist bên dưới..."
            className="w-full rounded-xl border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none focus:border-emerald-400"
          />
          <div className="text-right text-xs text-slate-500">
            {draft.trim() ? draft.trim().split(/\s+/).length : 0} từ
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-emerald-300">Checklist trước khi nộp</span>
              <span className="text-sm text-slate-400">
                {done}/{(w.checklist || []).length}
              </span>
            </div>
            <div className="space-y-2">
              {(w.checklist || []).map((c, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-3 rounded-lg bg-slate-950/60 p-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => setChecked((v) => ({ ...v, [i]: !v[i] }))}
                    className="mt-0.5 h-4 w-4 accent-emerald-500"
                  />
                  <span className={checked[i] ? "text-slate-500 line-through" : ""}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
