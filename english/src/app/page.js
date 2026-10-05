"use client";
import { useState, useRef, useCallback } from "react";
import ImageCrop from "./ImageCrop";
import LessonChat from "./LessonChat";
import Listening from "./Listening";

export default function Home() {
  // --- Mode: "vocab" | "grammar" ---
  const [mode, setMode] = useState("vocab");

  // --- Vocab state ---
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickDirection, setQuickDirection] = useState("en-vi"); // "en-vi" | "vi-en"
  const [quickResult, setQuickResult] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [practice, setPractice] = useState(false);
  const [testType, setTestType] = useState("match");
  const [matchAnswers, setMatchAnswers] = useState({});
  const [fillAnswers, setFillAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [groupQuestions, setGroupQuestions] = useState([]);
  const [generatedFills, setGeneratedFills] = useState([]);
  const [groupAnswers, setGroupAnswers] = useState({});
  const [groupLoading, setGroupLoading] = useState(false);
  const fileRef = useRef(null);
  const quickFileRef = useRef(null);

  // --- Grammar state ---
  const [gImage, setGImage] = useState(null);
  const [gPreview, setGPreview] = useState(null);
  const [grammar, setGrammar] = useState(null);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState(null);
  const [gPractice, setGPractice] = useState(false);
  const [gPracticeType, setGPracticeType] = useState("choose");
  const [gPracticeData, setGPracticeData] = useState(null);
  const [gPracticeLoading, setGPracticeLoading] = useState(false);
  const [gChooseAnswers, setGChooseAnswers] = useState({});
  const [gRewriteAnswers, setGRewriteAnswers] = useState({});
  const [gSubmitted, setGSubmitted] = useState(false);
  const gFileRef = useRef(null);

  const [confirmAnalyze, setConfirmAnalyze] = useState(null);
  const [cropPending, setCropPending] = useState(null);
  const selectImage = (file, target) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 15 * 1024 * 1024) { alert("Ảnh quá lớn. Chọn ảnh dưới 15 MB."); return; }
    setCropPending({ file, target });
  };

  // --- Vocab handlers ---
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setImage(file);
    setWords([]);
    setGroupQuestions([]);
    setGeneratedFills([]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    selectImage(e.dataTransfer.files[0], "vocab");
  }, [handleFile]);

  const analyze = async (targetFile = null) => {
    const fileToAnalyze = targetFile instanceof File || targetFile instanceof Blob ? targetFile : image;
    if (!fileToAnalyze) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", fileToAnalyze);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setWords(data.words || []);
      setPractice(false);
      setSubmitted(false);
      setMatchAnswers({});
      setFillAnswers({});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Grammar handlers ---
  const handleGFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setGPreview(URL.createObjectURL(file));
    setGImage(file);
    setGrammar(null);
    setGPracticeData(null);
    setGError(null);
  }, []);

  const handleGDrop = useCallback((e) => {
    e.preventDefault();
    selectImage(e.dataTransfer.files[0], "grammar");
  }, [handleGFile]);

  const analyzeGrammar = async (targetFile = null) => {
    const fileToAnalyze = targetFile instanceof File || targetFile instanceof Blob ? targetFile : gImage;
    if (!fileToAnalyze) return;
    setGLoading(true);
    setGError(null);
    try {
      const formData = new FormData();
      formData.append("image", fileToAnalyze);
      const res = await fetch("/api/grammar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      setGrammar(data.grammar);
      setGPractice(false);
      setGSubmitted(false);
      setGPracticeData(null);
    } catch (e) {
      setGError(e.message);
    } finally {
      setGLoading(false);
    }
  };

  const createGrammarPractice = async () => {
    setGPracticeLoading(true);
    setGPracticeData(null);
    setGChooseAnswers({});
    setGRewriteAnswers({});
    setGSubmitted(false);
    try {
      const res = await fetch("/api/grammar-practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grammar }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được bài");
      setGPracticeData(data);
    } catch (e) { setGError(e.message); }
    finally { setGPracticeLoading(false); }
  };

  // --- Shared helpers ---
  const speak = (text, lang = "en-US") => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang === "en-US" ? 0.68 : 0.85;
    speechSynthesis.speak(u);
  };

  const SpeakViBtn = ({ text }) => <button onClick={() => speak(text, "vi-VN")} className="ml-2 mt-1 inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white" title="Đọc tiếng Việt" aria-label="Đọc tiếng Việt">🔊</button>;

  const lookupText = async (imageFile = null, overrideDir = null) => {
    const text = quickQuery.trim();
    const dir = overrideDir || quickDirection;
    if (!text && !imageFile) return;
    if (dir === "en-vi" && !imageFile && /^[a-zA-Z][a-zA-Z'-]{0,63}$/.test(text)) { lookupWord(text); return; }
    setQuickLoading(true);
    setQuickResult(null);
    try {
      const form = new FormData();
      form.append("text", text);
      form.append("direction", dir);
      if (imageFile) form.append("image", imageFile);
      const res = await fetch("/api/lookup", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tra được câu");
      setQuickResult(data.result);
    } catch (e) { setQuickResult({ error: e.message }); }
    finally { setQuickLoading(false); }
  };

  const lookupWord = async (word, context = "") => {
    setLookup({ word, loading: true });
    try {
      const res = await fetch("/api/word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tra được từ");
      setLookup({ ...data.word, loading: false });
    } catch (e) {
      setLookup({ word, error: e.message, loading: false });
    }
  };

  const resetPractice = () => {
    setMatchAnswers({});
    setFillAnswers({});
    setGroupAnswers({});
    setSubmitted(false);
  };

  const createGroupTest = async () => {
    setGroupLoading(true);
    setGroupQuestions([]);
    setGroupAnswers({});
    setSubmitted(false);
    try {
      const res = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được bài");
      setGroupQuestions(data.groups);
      setGeneratedFills(data.fills);
    } catch (e) { setError(e.message); }
    finally { setGroupLoading(false); }
  };

  const testWords = words.slice(0, 8);
  const fillQuestions = generatedFills;
  const fillScore = fillQuestions.filter((w, i) => fillAnswers[i]?.trim().toLowerCase() === w.word.toLowerCase()).length;

  const copyText = (text) => {
    navigator.clipboard.writeText(text).then(() => {}).catch(() => {});
  };

  const CopyBtn = ({ text }) => {
    const [copied, setCopied] = useState(false);
    return <button onClick={(e) => { e.stopPropagation(); copyText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="ml-1 inline-flex shrink-0 items-center rounded px-1 py-0.5 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-300" title="Copy">{copied ? "✓" : "📋"}</button>;
  };

  const clickableText = (text = "") => <span data-lookup-context={text} className="select-text" style={{ WebkitUserSelect: "text", userSelect: "text", WebkitTouchCallout: "default" }}>{text.split(/(\b[A-Za-z]+(?:['-][A-Za-z]+)*\b)/g).map((part, index) =>
    /^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(part)
      ? <span key={index} role="button" tabIndex={0} onClick={() => { lookupWord(part, text); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lookupWord(part, text); } }} className="cursor-pointer hover:rounded hover:bg-sky-900/70 hover:text-sky-200 focus:bg-sky-900/70 focus:outline-none">{part}</span>
      : part
  )}</span>;

  // --- Grammar practice scores ---
  const gChooseScore = gPracticeData?.choose?.filter((q, i) => gChooseAnswers[i] === q.answer).length || 0;
  const gRewriteScore = gPracticeData?.rewrite?.filter((q, i) => gRewriteAnswers[i]?.trim().toLowerCase() === q.answer.trim().toLowerCase()).length || 0;

  return (
    <div className="max-w-5xl mx-auto px-3 py-4 sm:px-5 sm:py-8">
      {cropPending && <ImageCrop file={cropPending.file} onCancel={() => setCropPending(null)} onApply={file => {
        const target = cropPending.target;
        setCropPending(null);
        if (target === "quick") lookupText(file);
        else if (target === "grammar") {
          handleGFile(file);
          setConfirmAnalyze({ file, target: "grammar" });
        } else {
          handleFile(file);
          setConfirmAnalyze({ file, target: "vocab" });
        }
      }} />}

      {confirmAnalyze && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setConfirmAnalyze(null)} onKeyDown={e => { if (e.key === "Escape") setConfirmAnalyze(null); }}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-3xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Tiến hành phân tích ảnh này?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {confirmAnalyze.target === "grammar"
                ? "Bắt đầu phân tích cấu trúc ngữ pháp từ ảnh đã chọn."
                : "Bắt đầu phân tích từ vựng và tạo bài luyện tập từ ảnh đã chọn."}
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmAnalyze(null)} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors">
                Để sau
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  const { file, target } = confirmAnalyze;
                  setConfirmAnalyze(null);
                  if (target === "grammar") analyzeGrammar(file);
                  else analyze(file);
                }}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-colors ${
                  confirmAnalyze.target === "grammar" ? "bg-purple-600 hover:bg-purple-500" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                OK, phân tích
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-5 sm:mb-8 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        📚 English Learner
      </h1>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6 justify-center">
        <button onClick={() => setMode("vocab")} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${mode === "vocab" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>📖 Vocabulary</button>
        <button onClick={() => setMode("grammar")} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${mode === "grammar" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>📐 Grammar</button>
      </div>

      {/* Quick lookup */}
      <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-300">
        {/* Header & Switch Bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="inline-block animate-pulse text-base">🔎</span>
            <span>{quickDirection === "en-vi" ? "Tra từ / câu tiếng Anh" : "Dịch câu tiếng Việt → Anh"}</span>
          </div>

          {/* Interactive Switch Button */}
          <div className="inline-flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (quickDirection !== "en-vi") {
                  setQuickDirection("en-vi");
                  setQuickResult(null);
                }
              }}
              className={quickDirection === "en-vi" ? "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 bg-blue-600 text-white shadow-sm" : "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 text-slate-400 hover:text-slate-200"}
            >
              🇺🇸 Anh
            </button>

            <button
              type="button"
              onClick={() => {
                const nextDir = quickDirection === "en-vi" ? "vi-en" : "en-vi";
                setQuickDirection(nextDir);
                setQuickResult(null);
              }}
              className="group mx-1 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-300 transition-all duration-300 hover:bg-slate-700 hover:text-white active:scale-90"
              title="Đổi chiều tra cứu (Anh ⇄ Việt)"
              aria-label="Đổi chiều tra cứu"
            >
              <span className="inline-block transition-transform duration-300 group-hover:rotate-180">⇄</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (quickDirection !== "vi-en") {
                  setQuickDirection("vi-en");
                  setQuickResult(null);
                }
              }}
              className={quickDirection === "vi-en" ? "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 bg-purple-600 text-white shadow-sm" : "rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 text-slate-400 hover:text-slate-200"}
            >
              🇻🇳 Việt
            </button>
          </div>
        </div>

        {/* Input & Action Bar */}
        <div className="relative flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={quickQuery}
              onChange={(e) => {
                setQuickQuery(e.target.value);
                setQuickResult(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && lookupText()}
              placeholder={
                quickDirection === "en-vi"
                  ? "Ví dụ: I goed to school yesterday"
                  : "Ví dụ: Hôm qua tôi đi học muộn vì kẹt xe"
              }
              className={quickLoading ? "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-sky-500 ring-2 ring-sky-500/20" : quickDirection === "vi-en" ? "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-purple-600/60 focus:border-purple-400" : "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-slate-600 focus:border-blue-400"}
            />
          </div>

          <input
            ref={quickFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) selectImage(file, "quick");
              e.target.value = "";
            }}
          />

          <button
            onClick={() => quickFileRef.current?.click()}
            disabled={quickLoading}
            className="shrink-0 rounded-lg bg-slate-700 px-3 py-2 text-sm transition-colors hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50"
            title={quickDirection === "en-vi" ? "Chọn hoặc chụp ảnh tiếng Anh" : "Chọn hoặc chụp ảnh tiếng Việt"}
            aria-label="Chụp ảnh"
          >
            📷
          </button>

          <button
            onClick={() => lookupText()}
            disabled={quickLoading || !quickQuery.trim()}
            className={quickDirection === "vi-en" ? "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 bg-purple-600 text-white hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500" : "shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"}
          >
            {quickLoading ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                <span>Đang tra...</span>
              </span>
            ) : (
              <span>{quickDirection === "vi-en" ? "Dịch" : "Tra"}</span>
            )}
          </button>
        </div>

        {/* Real-time search loading animation */}
        {quickLoading && (
          <div className="mt-3 overflow-hidden rounded-xl border border-sky-800/60 bg-sky-950/30 p-3.5 backdrop-blur-sm animate-pulse-ring">
            <div className="relative flex items-center justify-between gap-3 text-xs text-sky-200">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </span>
                <span className="font-medium">
                  {quickDirection === "en-vi"
                    ? "AI đang phân tích ngữ pháp & từ vựng tiếng Anh..."
                    : "AI đang chuyển ngữ sang tiếng Anh tự nhiên & chuẩn bản ngữ..."}
                </span>
              </div>
              <span className="font-mono text-[11px] text-sky-400/80 animate-pulse">9router · Gemini</span>
            </div>

            {/* Glowing animated scan beam */}
            <div className="relative mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={quickDirection === "vi-en" ? "absolute inset-0 w-1/2 rounded-full animate-scan-beam bg-gradient-to-r from-transparent via-purple-400 to-transparent" : "absolute inset-0 w-1/2 rounded-full animate-scan-beam bg-gradient-to-r from-transparent via-cyan-400 to-transparent"}
              ></div>
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {quickDirection === "en-vi"
              ? "Gõ câu tiếng Anh hoặc bấm 📷 để sửa lỗi & dịch nghĩa."
              : "Gõ câu tiếng Việt hoặc bấm 📷 để dịch sang tiếng Anh tự nhiên."}
          </span>
          <span className="text-slate-600">Phím Enter ↵ để tra</span>
        </div>

        {/* Results view */}
        {quickResult && (
          quickResult.error ? (
            <div className="mt-3 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
              ❌ {quickResult.error}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-sky-900 bg-sky-950/40 p-3.5 text-sm transition-all duration-300">
              {/* Header / Direction tag */}
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-sky-900/60 pb-2 text-xs">
                <span className={quickResult.direction === "vi-en" ? "shrink-0 rounded-full px-2 py-0.5 font-medium bg-purple-900/70 text-purple-200 border border-purple-700/50" : "shrink-0 rounded-full px-2 py-0.5 font-medium bg-sky-900/70 text-sky-200 border border-sky-700/50"}>
                  {quickResult.direction === "vi-en" ? "🇻🇳 → 🇺🇸 Dịch sang tiếng Anh" : "🇺🇸 → 🇻🇳 Tra cứu tiếng Anh"}
                </span>
                <span className="min-w-0 text-slate-400">Chạm từ tiếng Anh để tra từ điển</span>
              </div>

              {/* Target / Corrected English */}
              <div className="flex flex-wrap items-center gap-1.5 text-sky-100">
                <span className="text-base font-semibold leading-relaxed">
                  {clickableText(quickResult.corrected)}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <CopyBtn text={quickResult.corrected} />
                  <button
                    onClick={() => speak(quickResult.corrected)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sky-300 transition-colors hover:bg-sky-900"
                    title="Nghe đọc tiếng Anh"
                    aria-label="Nghe tiếng Anh"
                  >
                    🔊
                  </button>
                </span>
              </div>

              {/* Corrections if any */}
              {quickResult.direction === "en-vi" && quickResult.changed && (
                <div className="mt-2 rounded-lg bg-amber-950/40 border border-amber-800/40 px-3 py-2 text-xs text-amber-200 leading-relaxed">
                  <span className="font-semibold text-amber-400">Sửa: </span>
                  <span className="line-through text-slate-500 mr-1.5">{quickResult.original}</span>
                  → <span className="text-emerald-300 font-medium ml-1.5">{quickResult.corrected}</span>
                </div>
              )}

              {/* Vietnamese Meaning */}
              <div className="mt-2 flex items-start gap-1 leading-relaxed text-slate-200">
                <div className="flex-1">
                  <span className="font-medium text-slate-400 mr-1.5">Nghĩa:</span>
                  <span>{quickResult.meaning}</span>
                  <SpeakViBtn text={quickResult.meaning} />
                </div>
              </div>

              {/* Note / Tip */}
              {quickResult.note && (
                <div className="mt-2.5 rounded-lg bg-slate-900/80 border border-slate-800 p-2.5 text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-amber-400 mr-1">💡 Giải thích:</span>
                  <span>{quickResult.note}</span>
                </div>
              )}
            </div>
          )
        )}
      </section>

      {/* ============ VOCABULARY MODE ============ */}
      {mode === "vocab" && <>
        {/* Upload zone */}
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-900 transition-all mb-6">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { selectImage(e.target.files[0], "vocab"); e.target.value = ""; }} />
          <div className="text-4xl sm:text-5xl mb-3">📷</div>
          <p className="text-sm sm:text-base text-slate-400">Kéo thả ảnh trang từ vựng vào đây hoặc bấm chọn</p>
        </div>

        {preview && <div className="text-center mb-6"><img src={preview} alt="preview" className="max-h-64 sm:max-h-72 max-w-full rounded-xl border border-slate-700 inline-block" /></div>}

        <div className="text-center mb-6">
          <button onClick={analyze} disabled={!image || loading} className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-base sm:text-lg transition-colors">
            {loading ? <span className="flex items-center gap-2 justify-center"><span className="w-5 h-5 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />Đang phân tích...</span> : "🔍 Phân tích từ vựng"}
          </button>
        </div>

        {error && <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-6 text-red-300">❌ {error}</div>}

        {words.length > 0 && <p className="text-center text-slate-400 mb-4">✅ Tìm thấy {words.length} từ vựng</p>}

        {words.length > 0 && !practice && (
          <div className="mb-5 rounded-2xl border border-amber-600/40 bg-amber-950/30 p-4 text-center">
            <div className="text-base font-semibold text-amber-200">Sẵn sàng luyện các từ vừa học?</div>
            <p className="mt-1 text-sm text-amber-100/70">2 dạng: chọn từ lạc nhóm và điền từ.</p>
            <button onClick={() => { resetPractice(); setTestType("match"); setPractice(true); if (!groupQuestions.length) createGroupTest(); }} className="mt-3 w-full sm:w-auto rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400">✍️ Practice test</button>
          </div>
        )}

        {practice && (
          <section className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
              <div><h2 className="text-xl font-bold text-white">Practice test</h2><p className="text-sm text-slate-400">Luyện với {testWords.length} từ vừa phân tích</p></div>
              <button onClick={() => setPractice(false)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">← Quay lại từ vựng</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setTestType("match"); resetPractice(); }} className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${testType === "match" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Bài 1: Chọn từ lạc nhóm</button>
              <button onClick={() => { setTestType("fill"); resetPractice(); }} className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${testType === "fill" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>Bài 2: Điền từ</button>
            </div>

            {testType === "match" ? <div className="mt-5">
              <p className="mb-4 text-sm text-slate-300">Chọn từ không thuộc nhóm. Mỗi hàng có 4 từ, chỉ 1 đáp án đúng.</p>
              {groupLoading && <div className="rounded-xl bg-slate-950 p-5 text-center text-slate-400">Đang tạo 4 câu từ vocab của bạn...</div>}
              {!groupLoading && groupQuestions.length === 0 && <button onClick={createGroupTest} className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500">Tạo bài 1</button>}
              <div className="space-y-4">{groupQuestions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-slate-700 bg-slate-950 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-300">{qi + 1}. Underline word that does not belong to group.</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{q.words.map((word) => (
                    <button key={word} disabled={submitted} onClick={() => setGroupAnswers((v) => ({ ...v, [qi]: word }))}
                      className={`min-h-12 rounded-lg border px-2 py-3 text-center text-sm font-medium transition-colors ${submitted ? (word === q.answer ? "border-emerald-500 bg-emerald-950 text-emerald-200" : groupAnswers[qi] === word ? "border-red-500 bg-red-950 text-red-200" : "border-slate-700 text-slate-400") : groupAnswers[qi] === word ? "border-amber-400 bg-amber-950 text-amber-100" : "border-slate-700 bg-slate-900 hover:border-blue-400"}`}>
                      {word}
                    </button>
                  ))}</div>
                  {submitted && <div className="mt-2 text-sm text-slate-300"><span className="font-medium text-emerald-300">Đáp án: {q.answer}.</span> {q.explanation}</div>}
                </div>
              ))}</div>
              {groupQuestions.length > 0 && <button onClick={() => setSubmitted(true)} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500">Nộp bài · {submitted ? `${groupQuestions.filter((q, i) => groupAnswers[i] === q.answer).length}/4 đúng` : "Chấm điểm"}</button>}
            </div> : <div className="mt-5">
              {fillQuestions.length === 0 ? <div className="rounded-xl bg-slate-950 p-4 text-center text-slate-400">Đề đang tạo, hãy mở Bài 1 trước.</div> : <><p className="rounded-xl bg-slate-950 p-3 text-sm text-slate-300">Từ gợi ý: <span className="font-semibold text-amber-300">{fillQuestions.map((w) => w.word).join(" · ")}</span></p>
              <div className="mt-4 space-y-4">{fillQuestions.map((w, i) => <div key={w.word} className={`rounded-xl border p-4 ${submitted ? (fillAnswers[i]?.trim().toLowerCase() === w.word.toLowerCase() ? "border-emerald-500" : "border-red-500") : "border-slate-700"}`}><label className="block text-sm leading-7 text-slate-200">{i + 1}. {w.sentence}</label><input value={fillAnswers[i] || ""} onChange={(e) => setFillAnswers((v) => ({ ...v, [i]: e.target.value }))} disabled={submitted} placeholder="Điền từ vào đây" className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-white outline-none focus:border-blue-400" />{submitted && fillAnswers[i]?.trim().toLowerCase() !== w.word.toLowerCase() && <div className="mt-2 text-sm text-emerald-300">Đáp án: {w.word}</div>}</div>)}</div>
              <button onClick={() => setSubmitted(true)} className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500">Nộp bài · {submitted ? `${fillScore}/${fillQuestions.length} đúng` : "Chấm điểm"}</button></>}
            </div>}
          </section>
        )}

        {/* Word cards */}
        {!practice && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {words.map((w, i) => (
            <div key={i} className="bg-slate-900 border border-slate-700 rounded-xl p-4 sm:p-5 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1 text-lg sm:text-xl font-bold text-blue-400 break-words"><span>{w.word}</span><CopyBtn text={w.word} /></div>
                  <div className="mt-1 flex items-center gap-2"><span className="text-purple-400 italic text-sm">{w.ipa}</span>{w.partOfSpeech && <span className="rounded-full border border-blue-800 bg-blue-950 px-2 py-0.5 text-xs font-semibold text-blue-200">{w.partOfSpeech}</span>}</div>
                </div>
                <button onClick={() => speak(w.word)} className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-lg transition-colors" title="Nghe phát âm">🔊</button>
              </div>
              <div className="mt-3 text-slate-100 font-medium">{w.meaning}</div>
              {w.definition && (
                <div className="mt-3 border-l-2 border-violet-500 pl-3">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
                    <span>English definition</span>
                    <div className="flex gap-1">
                      <CopyBtn text={w.definition} />
                      <button onClick={() => speak(w.definition)} className="shrink-0 rounded-md bg-violet-800/70 px-2 py-1 normal-case text-violet-100 hover:bg-violet-700" title="Đọc định nghĩa tiếng Anh">🔊 Đọc</button>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-200 leading-relaxed">{clickableText(w.definition)}</div>
                  {w.definitionVietnamese && <div className="mt-1 text-sm text-slate-400 leading-relaxed">{w.definitionVietnamese}</div>}
                </div>
              )}
              {w.easyReading && (
                <div className="mt-3 rounded-lg bg-sky-950/60 border border-sky-900 px-3 py-2 text-sm text-sky-100">
                  <span className="font-semibold text-sky-300">Dễ đọc:</span> {w.easyReading}
                </div>
              )}
              <details className="mt-3 group/details">
                <summary className="cursor-pointer text-sm text-slate-400 hover:text-blue-300 select-none">Xem ví dụ, mẹo dùng</summary>
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <div className="text-sm text-slate-300 mb-2">
                    <span className="text-slate-500">Ví dụ:</span> {clickableText(w.example)}<CopyBtn text={w.example} />
                    {w.exampleVietnamese && <div className="text-slate-400 italic mt-1">{w.exampleVietnamese}</div>}
                  </div>
                  {w.synonyms && (
                    <div className="text-sm text-slate-400">
                      <span className="text-slate-500">Đồng nghĩa:</span> {clickableText(w.synonyms)}<CopyBtn text={w.synonyms} />
                    </div>
                  )}
                  {w.collocations?.length > 0 && <div className="mt-3 rounded-lg border border-teal-800/70 bg-teal-950/40 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-teal-300">Collocation</div>{w.collocations.map((c, ci) => <div key={ci} className="mt-2 text-sm"><div className="font-medium text-teal-100">{clickableText(c.phrase)}<CopyBtn text={c.phrase} /> <button onClick={() => speak(c.phrase)} className="text-xs text-teal-300 hover:text-white">🔊</button></div><div className="mt-1 text-teal-200/70">{c.meaning}{c.note && ` — ${c.note}`}</div></div>)}</div>}
                  {w.note && <div className="text-sm text-amber-400 mt-2">💡 {w.note}</div>}
                  <button onClick={() => speak(w.example)} className="mt-3 text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">🔊 Nghe ví dụ</button>
                </div>
              </details>
            </div>
          ))}
        </div>}
        {words.length > 0 && !practice && <Listening key={JSON.stringify(words.map(w => w.word))} words={words} />}
      </>}

      {/* ============ GRAMMAR MODE ============ */}
      {mode === "grammar" && <>
        {/* Upload zone */}
        <div onDragOver={(e) => e.preventDefault()} onDrop={handleGDrop} onClick={() => gFileRef.current?.click()}
          className="border-2 border-dashed border-purple-600/50 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-slate-900 transition-all mb-6">
          <input ref={gFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { selectImage(e.target.files[0], "grammar"); e.target.value = ""; }} />
          <div className="text-4xl sm:text-5xl mb-3">📐</div>
          <p className="text-sm sm:text-base text-slate-400">Kéo thả ảnh trang ngữ pháp vào đây hoặc bấm chọn</p>
        </div>

        {gPreview && <div className="text-center mb-6"><img src={gPreview} alt="preview" className="max-h-64 sm:max-h-72 max-w-full rounded-xl border border-slate-700 inline-block" /></div>}

        <div className="text-center mb-6">
          <button onClick={analyzeGrammar} disabled={!gImage || gLoading} className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-base sm:text-lg transition-colors">
            {gLoading ? <span className="flex items-center gap-2 justify-center"><span className="w-5 h-5 border-2 border-slate-400 border-t-purple-400 rounded-full animate-spin" />Đang phân tích...</span> : "🔍 Phân tích ngữ pháp"}
          </button>
        </div>

        {gError && <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-6 text-red-300">❌ {gError}</div>}

        {/* Grammar cards */}
        {grammar && !gPractice && (
          <div className="space-y-5">
            {/* Title */}
            <div className="rounded-2xl border border-purple-700 bg-purple-950/40 p-5 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-purple-300">{clickableText(grammar.title)}</h2>
              <p className="mt-1 text-sm text-purple-200/70">{grammar.titleVietnamese}</p>
            </div>

            {grammar.learningGoal && <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm leading-relaxed text-emerald-100"><span className="font-semibold text-emerald-300">🎯 Sau bài này: </span>{grammar.learningGoal}<SpeakViBtn text={grammar.learningGoal} /></div>}

            {grammar.everydayContext && <div className="rounded-xl border border-sky-800 bg-sky-950/50 p-4">
              <div className="mb-2 text-sm font-semibold text-sky-300">1. Bắt đầu từ tình huống quen thuộc</div>
              <div className="text-sm text-slate-100">{clickableText(grammar.everydayContext.english)}<CopyBtn text={grammar.everydayContext.english} /> <button onClick={() => speak(grammar.everydayContext.english)} className="text-xs text-slate-400 hover:text-white">🔊</button></div>
              <div className="mt-1 text-sm italic text-slate-400">{grammar.everydayContext.vietnamese}<SpeakViBtn text={grammar.everydayContext.vietnamese} /></div>
              {grammar.everydayContext.question && <div className="mt-3 rounded-lg bg-slate-950 p-3 text-sm text-amber-200">🤔 {grammar.everydayContext.question}<SpeakViBtn text={grammar.everydayContext.question} /></div>}
            </div>}

            {grammar.keyIdea && <div className="rounded-xl bg-sky-950/50 border border-sky-800 p-4 text-sm text-sky-100 leading-relaxed"><span className="font-semibold text-sky-300">2. Ý chính cần hiểu: </span>{grammar.keyIdea}<SpeakViBtn text={grammar.keyIdea} /></div>}

            {grammar.summary && <details className="rounded-xl border border-slate-700 bg-slate-900 p-4"><summary className="cursor-pointer text-sm font-semibold text-slate-300">Xem tóm tắt toàn bài</summary><p className="mt-3 text-sm leading-relaxed text-slate-400">{grammar.summary}<SpeakViBtn text={grammar.summary} /></p></details>}

            {/* Rules */}
            {grammar.rules?.map((r, ri) => (
              <div key={ri} className="rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold">{ri + 1}</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide text-purple-400">{r.stepTitle || `Bước ${ri + 3}: Công thức`}</div>
                    <div className="mt-1 break-words text-base font-bold text-purple-300">{clickableText(r.rule)}<CopyBtn text={r.rule} /></div>
                    <div className="mt-2 text-sm leading-relaxed text-slate-300">{r.ruleVietnamese}<SpeakViBtn text={r.ruleVietnamese} /></div>
                  </div>
                </div>
                {r.examples?.length > 0 && (
                  <div className="mt-4 space-y-3 sm:pl-11">
                    {r.examples.map((ex, ei) => (
                      <div key={ei} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                        <div className="flex flex-wrap items-start gap-1 break-words text-sm text-slate-200">
                          <span>🔹</span><span>{clickableText(ex.english)}</span><CopyBtn text={ex.english} />
                          <button onClick={() => speak(ex.english)} className="ml-1 shrink-0 text-xs text-slate-500 hover:text-slate-300">🔊</button>
                        </div>
                        <div className="mt-1 break-words pl-5 text-sm italic text-slate-400">{ex.vietnamese}<SpeakViBtn text={ex.vietnamese} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {grammar.comparison?.items?.length > 0 && <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4"><div className="mb-3 font-semibold text-cyan-300">🔎 {grammar.comparison.title || "Phân biệt dễ nhầm"}</div><div className="space-y-3">{grammar.comparison.items.map((item, i) => <div key={i} className="rounded-lg bg-slate-950 p-3 text-sm"><div className="font-medium text-cyan-200">{clickableText(item.left)} <span className="text-slate-500">vs</span> {clickableText(item.right)}</div><div className="mt-1 leading-relaxed text-slate-400">{item.explanation}<SpeakViBtn text={item.explanation} /></div></div>)}</div></div>}

            {grammar.commonMistakes?.length > 0 && <div className="rounded-xl border border-red-900/70 bg-red-950/25 p-4"><div className="mb-3 font-semibold text-red-300">⚠️ Lỗi hay gặp</div><div className="space-y-3">{grammar.commonMistakes.map((item, i) => <div key={i} className="rounded-lg bg-slate-950 p-3 text-sm"><div className="text-red-300">✗ {clickableText(item.wrong)}</div><div className="mt-1 text-emerald-300">✓ {clickableText(item.right)}<CopyBtn text={item.right} /></div><div className="mt-2 text-slate-400">{item.reason}<SpeakViBtn text={item.reason} /></div></div>)}</div></div>}

            {grammar.checkYourself?.length > 0 && <div className="rounded-xl border border-blue-800 bg-blue-950/30 p-4"><div className="mb-3 font-semibold text-blue-300">🧠 Tự kiểm tra</div>{grammar.checkYourself.map((item, i) => <details key={i} className="border-t border-blue-900 py-3 first:border-0 first:pt-0"><summary className="cursor-pointer text-sm text-slate-200">{i + 1}. {item.question}</summary><div className="mt-2 text-sm leading-relaxed text-emerald-300">{item.answer}</div></details>)}</div>}

            {/* Notes */}
            {grammar.notes?.length > 0 && (
              <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4">
                <div className="font-semibold text-amber-300 mb-2">💡 Lưu ý</div>
                <ul className="space-y-1 text-sm text-amber-100/80 list-disc pl-5">
                  {grammar.notes.map((n, ni) => <li key={ni}>{n}<SpeakViBtn text={n} /></li>)}
                </ul>
              </div>
            )}

            {/* Practice CTA */}
            <div className="rounded-2xl border border-amber-600/40 bg-amber-950/30 p-4 text-center">
              <div className="text-base font-semibold text-amber-200">Sẵn sàng luyện tập ngữ pháp?</div>
              <p className="mt-1 text-sm text-amber-100/70">2 dạng: trắc nghiệm và viết lại câu.</p>
              <button onClick={() => { setGPractice(true); setGPracticeType("choose"); setGSubmitted(false); if (!gPracticeData) createGrammarPractice(); }} className="mt-3 w-full sm:w-auto rounded-xl bg-amber-500 px-6 py-3 font-semibold text-slate-950 hover:bg-amber-400">✍️ Luyện tập</button>
            </div>
          </div>
        )}

        {/* Grammar Practice */}
        {grammar && gPractice && (
          <section className="mb-7 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
              <div><h2 className="text-xl font-bold text-white">Grammar Practice</h2><p className="text-sm text-slate-400">{grammar.title}</p></div>
              <button onClick={() => setGPractice(false)} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">← Quay lại ngữ pháp</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setGPracticeType("choose"); setGSubmitted(false); }} className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${gPracticeType === "choose" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"}`}>Bài 1: Trắc nghiệm</button>
              <button onClick={() => { setGPracticeType("rewrite"); setGSubmitted(false); }} className={`flex-1 rounded-xl px-3 py-3 text-sm font-semibold ${gPracticeType === "rewrite" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"}`}>Bài 2: Viết lại câu</button>
            </div>

            {gPracticeLoading && <div className="mt-5 rounded-xl bg-slate-950 p-5 text-center text-slate-400">Đang tạo bài luyện tập...</div>}

            {!gPracticeLoading && !gPracticeData && <div className="mt-5 rounded-xl bg-slate-950 p-4 text-center text-slate-400">Đề đang tạo...</div>}

            {gPracticeData && gPracticeType === "choose" && (
              <div className="mt-5 space-y-4">
                {gPracticeData.choose?.map((q, qi) => (
                  <div key={qi} className={`rounded-xl border p-4 ${gSubmitted ? (gChooseAnswers[qi] === q.answer ? "border-emerald-500" : "border-red-500") : "border-slate-700"} bg-slate-950`}>
                    <div className="mb-3 text-sm text-slate-200">{qi + 1}. {clickableText(q.sentence)}</div>
                    <div className="grid grid-cols-2 gap-2">{q.options.map((opt) => {
                      const letter = opt.charAt(0);
                      return (
                        <button key={opt} disabled={gSubmitted} onClick={() => setGChooseAnswers((v) => ({ ...v, [qi]: letter }))}
                          className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${gSubmitted ? (letter === q.answer ? "border-emerald-500 bg-emerald-950 text-emerald-200" : gChooseAnswers[qi] === letter ? "border-red-500 bg-red-950 text-red-200" : "border-slate-700 text-slate-400") : gChooseAnswers[qi] === letter ? "border-amber-400 bg-amber-950 text-amber-100" : "border-slate-700 bg-slate-900 hover:border-purple-400"}`}>
                          {clickableText(opt)}
                        </button>
                      );
                    })}</div>
                    {gSubmitted && <div className="mt-2 text-sm text-slate-300"><span className="font-medium text-emerald-300">Đáp án: {q.answer}.</span> {q.explanation}</div>}
                  </div>
                ))}
                <button onClick={() => setGSubmitted(true)} className="w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500">Nộp bài · {gSubmitted ? `${gChooseScore}/${gPracticeData.choose?.length} đúng` : "Chấm điểm"}</button>
              </div>
            )}

            {gPracticeData && gPracticeType === "rewrite" && (
              <div className="mt-5 space-y-4">
                {gPracticeData.rewrite?.map((q, qi) => (
                  <div key={qi} className={`rounded-xl border p-4 ${gSubmitted ? (gRewriteAnswers[qi]?.trim().toLowerCase() === q.answer.trim().toLowerCase() ? "border-emerald-500" : "border-red-500") : "border-slate-700"} bg-slate-950`}>
                    <div className="text-sm text-slate-200 mb-1">{qi + 1}. {q.instruction}</div>
                    <div className="mb-3 break-words text-sm font-medium text-sky-300">{clickableText(q.input)}<CopyBtn text={q.input} /></div>
                    <input value={gRewriteAnswers[qi] || ""} onChange={(e) => setGRewriteAnswers((v) => ({ ...v, [qi]: e.target.value }))} disabled={gSubmitted} placeholder="Viết lại câu ở đây" className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white outline-none focus:border-purple-400" />
                    {gSubmitted && gRewriteAnswers[qi]?.trim().toLowerCase() !== q.answer.trim().toLowerCase() && <div className="mt-2 text-sm text-emerald-300">Đáp án: {clickableText(q.answer)}</div>}
                  </div>
                ))}
                <button onClick={() => setGSubmitted(true)} className="w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500">Nộp bài · {gSubmitted ? `${gRewriteScore}/${gPracticeData.rewrite?.length} đúng` : "Chấm điểm"}</button>
              </div>
            )}
          </section>
        )}
      </>}

      {/* Lookup modal */}
      <LessonChat context={{ mode, lesson: mode === "grammar" ? grammar : words, practice: mode === "grammar" ? gPractice : practice, translation: quickResult, wordLookup: lookup && !lookup.loading && !lookup.error ? lookup : null }} />
      {lookup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-3" onClick={() => setLookup(null)}>
          <div className="max-h-[85dvh] overflow-y-auto w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="text-xl font-bold text-sky-300">{lookup.word}</div>
              <button onClick={() => setLookup(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Đóng">✕</button>
            </div>
            {lookup.loading ? <div className="mt-5 text-slate-400">Đang tra từ...</div> : lookup.error ? <div className="mt-4 text-red-300">{lookup.error}</div> : <>
              <div className="mt-1 text-violet-300 italic">{lookup.ipa}</div>
              {lookup.partOfSpeech && <div className="mt-2"><span className="inline-block max-w-full rounded-lg border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-xs font-semibold leading-relaxed text-amber-200">{lookup.partOfSpeech}</span></div>}
              <div className="mt-4 text-lg font-medium text-white">{lookup.meaning}</div>
              {lookup.usage && <div className="mt-3 text-sm leading-relaxed text-slate-200"><span className="font-semibold text-sky-300">Cách dùng: </span>{lookup.usage}</div>}
              {lookup.synonyms && <div className="mt-3 text-sm leading-relaxed text-slate-200"><span className="font-semibold text-sky-300">Đồng nghĩa: </span>{lookup.synonyms}</div>}
              {lookup.easyReading && <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/50 p-3 text-sm leading-relaxed text-sky-100"><span className="font-semibold text-sky-300">Dễ đọc: </span>{lookup.easyReading}</div>}
              <button onClick={() => speak(lookup.word)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500">🔊 Nghe từ</button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
