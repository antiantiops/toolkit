"use client";
import { fetchWithRetry, parseApiResponse, formatErrorMessage, pollLesson } from "./fetch-helper";
import { useState, useRef, useCallback, useEffect } from "react";
import ImageCrop from "./ImageCrop";
import LessonChat from "./LessonChat";
import Listening from "./Listening";
import Writing from "./Writing";

const AiTag = () => <span title="Sách không có, AI tự tạo 100%" className="ml-1 rounded bg-fuchsia-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-200">🤖 AI</span>;

// Neural TTS via /api/tts (Edge voices); fallback to browser voice on failure.
const tts = { audio: null, cache: new Map() };
async function speak(text, lang = "en-US") {
  tts.audio?.pause();
  speechSynthesis.cancel();
  try {
    const k = lang + "|" + text;
    let url = tts.cache.get(k);
    if (!url) {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }) });
      if (!res.ok) throw new Error("tts");
      url = URL.createObjectURL(await res.blob());
      tts.cache.set(k, url);
    }
    tts.audio = new Audio(url);
    tts.audio.playbackRate = lang === "en-US" ? 0.85 : 1;
    await tts.audio.play();
  } catch {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang === "en-US" ? 0.68 : 0.85;
    speechSynthesis.speak(u);
  }
}

// Speaker button: spinner + disabled while audio is being fetched, re-enabled once playback starts.
function SpeakBtn({ text, lang = "en-US", className = "", children = "🔊", ...rest }) {
  const [loading, setLoading] = useState(false);
  const click = async () => {
    if (loading) return;
    setLoading(true);
    try { await speak(text, lang); } finally { setLoading(false); }
  };
  return (
    <button type="button" onClick={click} disabled={loading} aria-busy={loading} className={`${className} disabled:cursor-wait disabled:opacity-70`} {...rest}>
      {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-white align-middle" /> : children}
    </button>
  );
}

const SpeakViBtn = ({ text }) => <SpeakBtn text={text} lang="vi-VN" className="ml-2 mt-1 inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white" title="Đọc tiếng Việt" aria-label="Đọc tiếng Việt" />;

// ponytail: basic error banner with refresh shortcut for auth/connection drops. Add Sentry when error tracking is set up.
function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  const isAuthOrNetwork = message.includes("Failed to fetch") || message.includes("đăng nhập") || message.includes("kết nối");
  return (
    <div className="bg-red-950/80 border border-red-700/80 rounded-2xl p-4 sm:p-5 mb-6 text-red-200 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0 leading-none">⚠️</span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-red-100 text-sm sm:text-base mb-1">Có lỗi xảy ra khi xử lý:</div>
            <div className="text-xs sm:text-sm text-red-200/90 whitespace-pre-line break-words leading-relaxed">{message}</div>
            {isAuthOrNetwork && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-800 hover:bg-red-700 text-white transition-colors"
                >
                  🔄 Tải lại trang (F5)
                </button>
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Đóng thông báo"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const suggestionCache = useRef(new Map());

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

  // Writing state (supports 2 images: Sample + Self-Writing Task)
  const [wPreview1, setWPreview1] = useState(null);
  const [wImage1, setWImage1] = useState(null);
  const [wPreview2, setWPreview2] = useState(null);
  const [wImage2, setWImage2] = useState(null);
  const [wSkipSlot1, setWSkipSlot1] = useState(false);
  const [wUpload1, setWUpload1] = useState({ loading: false, id: null, size: 0, error: null });
  const [wUpload2, setWUpload2] = useState({ loading: false, id: null, size: 0, error: null });
  const [writing, setWriting] = useState(null);
  const [wModelDraft, setWModelDraft] = useState(null);
  const [wLoading, setWLoading] = useState(false);
  const [wError, setWError] = useState(null);
  const wFileRef1 = useRef(null);
  const wFileRef2 = useRef(null);

  const [gJob, setGJob] = useState(null);
  const [wJob, setWJob] = useState(null);
  const [gRetry, setGRetry] = useState(null);
  const [wRetry, setWRetry] = useState(null);
  const [vProgress, setVProgress] = useState(null);
  const [vRetryJob, setVRetryJob] = useState(null);
  const [vImageId, setVImageId] = useState(null);
  const [gImageId, setGImageId] = useState(null);
  const [confirmAnalyze, setConfirmAnalyze] = useState(null);
  const [cropPending, setCropPending] = useState(null);

  useEffect(() => {
    setSuggestions([]);
    setSuggestIndex(-1);
    const q = quickQuery.trim().toLowerCase();
    if (quickDirection !== "en-vi" || !/^[a-z]{2,40}$/.test(q)) return;
    const local = words.map(x => x.word).filter(x => typeof x === "string" && x.toLowerCase().startsWith(q));
    if (suggestionCache.current.has(q)) {
      setSuggestions([...new Set([...local, ...suggestionCache.current.get(q)])].slice(0, 5));
      return;
    }
    setSuggestions(local.slice(0, 5));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        if (controller.signal.aborted) return;
        const entries = Array.isArray(data.words) ? data.words.filter(x => typeof x === "string") : [];
        suggestionCache.current.set(q, entries);
        setSuggestions([...new Set([...local, ...entries])].slice(0, 5));
      } catch {}
    }, 120);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [quickQuery, quickDirection, words]);
  const chooseSuggestion = word => {
    setQuickQuery(word);
    setQuickResult(null);
    setSuggestOpen(false);
    setSuggestIndex(-1);
  };

  const selectImage = (file, target) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 25 * 1024 * 1024) { alert("Ảnh quá lớn. Chọn ảnh dưới 25 MB."); return; }
    setCropPending({ file, target });
  };

  const startConfirmUpload = async (file, target) => {
    setConfirmAnalyze({
      file,
      target,
      loading: true,
      imageId: null,
      error: null,
      size: file.size,
    });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithRetry("/api/upload", { method: "POST", body: fd, timeout: 90000 }, 2, 1000);
      const data = await parseApiResponse(res);
      if (!data.id) throw new Error(data.error || "Không nhận được mã ảnh tải lên");
      if (target === "vocab") setVImageId(data.id);
      if (target === "grammar") setGImageId(data.id);
      setConfirmAnalyze((prev) => (prev && prev.file === file ? {
        ...prev,
        loading: false,
        imageId: data.id,
        size: data.size || file.size,
      } : prev));
    } catch (e) {
      setConfirmAnalyze((prev) => (prev && prev.file === file ? {
        ...prev,
        loading: false,
        error: formatErrorMessage(e),
      } : prev));
    }
  };

  // --- Vocab handlers ---
  // Load cached session from server on mount
  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((res) => {
        const cached = res.session;
        if (cached?.words?.length) {
          setWords(cached.words);
          if (cached.preview) setPreview(cached.preview);
        }
        if (cached?.grammar) {
          setGrammar(cached.grammar);
          if (cached.gPreview) setGPreview(cached.gPreview);
        }
        if (cached?.writing) {
          setWriting(cached.writing);
          if (cached.wPreview1) setWPreview1(cached.wPreview1);
          if (cached.wPreview2) setWPreview2(cached.wPreview2);
          if (cached.modelDraft) setWModelDraft(cached.modelDraft);
        }
      })
      .catch(() => {});
  }, []);

  const clearCachedLesson = async (type = "vocab") => {
    try {
      await fetch(`/api/session?type=${type}`, { method: "DELETE" });
    } catch {}
    setWords([]);
    setPreview(null);
    setImage(null);
    setVImageId(null);
    setVRetryJob(null);
    setVProgress(null);
    setPractice(false);
    setSubmitted(false);
    setMatchAnswers({});
    setFillAnswers({});
    if (type === "grammar") {
      setGrammar(null);
      setGPreview(null);
      setGImage(null);
      setGImageId(null);
      setGRetry(null);
      setGPractice(false);
      setGPracticeData(null);
    }
    if (type === "writing") {
      setWriting(null);
      setWModelDraft(null);
      setWPreview1(null);
      setWPreview2(null);
      setWImage1(null);
      setWImage2(null);
      setWUpload1({ loading: false, id: null, size: 0, error: null });
      setWUpload2({ loading: false, id: null, size: 0, error: null });
      setWRetry(null);
    }
  };

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    setImage(file);
    setVImageId(null);
    setVRetryJob(null);
    setVProgress(null);
    setWords([]);
    setGroupQuestions([]);
    setGeneratedFills([]);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    selectImage(e.dataTransfer.files[0], "vocab");
  }, [handleFile]);

  const analyze = async (targetArg = null) => {
    const idToAnalyze = typeof targetArg === "string" ? targetArg : vImageId;
    const fileToAnalyze = targetArg instanceof File || targetArg instanceof Blob ? targetArg : image;
    if (!vRetryJob && !idToAnalyze && !fileToAnalyze && !sessionStorage.getItem("vocab-pending-job")) return;
    setLoading(true);
    setError(null);
    try {
      let jobId = sessionStorage.getItem("vocab-pending-job");
      if (vRetryJob && !jobId) {
        const retry = await parseApiResponse(await fetchWithRetry("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: vRetryJob, retry: true }), timeout: 15000 }, 0));
        jobId = retry.jobId;
        sessionStorage.setItem("vocab-pending-job", jobId);
      }
      if (!jobId) {
        let imageId = idToAnalyze;
        if (!imageId) {
          const fd = new FormData(); fd.append("file", fileToAnalyze);
          const uploaded = await parseApiResponse(await fetchWithRetry("/api/upload", { method: "POST", body: fd, timeout: 90000 }, 0));
          imageId = uploaded.id;
          setVImageId(imageId);
        }
        const started = await parseApiResponse(await fetchWithRetry("/api/analyze", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId }), timeout: 15000,
        }, 0));
        jobId = started.jobId;
        if (!jobId) throw new Error("Server không trả jobId");
        sessionStorage.setItem("vocab-pending-job", jobId);
      }
      let data;
      const deadline = Date.now() + 15 * 60 * 1000;
      while (Date.now() < deadline) {
        const statusRes = await fetchWithRetry(`/api/analyze?jobId=${encodeURIComponent(jobId)}`, { timeout: 15000, cache: "no-store" }, 2, 1500);
        if (statusRes.status === 404) sessionStorage.removeItem("vocab-pending-job");
        data = await parseApiResponse(statusRes);
        setVProgress({ ...data.progress, stage: data.stage });
        if (data.words?.length) setWords(data.words);
        if (data.status === "failed" || data.status === "partial") {
          setVRetryJob(jobId);
          sessionStorage.removeItem("vocab-pending-job");
          throw new Error(`${data.error || data.failures?.map(f => `Nhóm ${f.offset / 3 + 1}: ${f.error}`).join("\n")}\nRequest ID: ${data.requestId || jobId}\nStage: ${data.stage || "AI"}`);
        }
        if (data.status === "completed") { setVRetryJob(null); sessionStorage.removeItem("vocab-pending-job"); break; }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      if (data?.status !== "completed") throw new Error(`Tác vụ vẫn đang chạy. Tải lại trang để tiếp tục. Job ID: ${jobId}`);
      setWords(data.words || []);
      if (data.preview) setPreview(data.preview);
      setPractice(false);
      setSubmitted(false);
      setMatchAnswers({});
      setFillAnswers({});
    } catch (e) {
      setError(formatErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("vocab-pending-job")) analyze();
  }, []);

  // --- Grammar handlers ---
  const handleGFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setGPreview(URL.createObjectURL(file));
    setGImage(file);
    setGImageId(null);
    setGrammar(null);
    setGPracticeData(null);
    setGError(null);
  }, []);

  const handleGDrop = useCallback((e) => {
    e.preventDefault();
    selectImage(e.dataTransfer.files[0], "grammar");
  }, [handleGFile]);

  const uploadWritingFile = async (file, slot) => {
    const setUpload = slot === 1 ? setWUpload1 : setWUpload2;
    setUpload({ loading: true, id: null, size: file.size, error: null });
    setWError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetchWithRetry("/api/upload", { method: "POST", body: fd, timeout: 90000 }, 2, 1000);
      const data = await parseApiResponse(res);
      if (!data.id) throw new Error(data.error || "Không nhận được mã ảnh tải lên");
      setUpload({ loading: false, id: data.id, size: data.size || file.size, error: null });
    } catch (e) {
      setUpload({ loading: false, id: null, size: file.size, error: formatErrorMessage(e) });
    }
  };

  const handleWFile1 = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setWPreview1(URL.createObjectURL(file));
    setWImage1(file);
    setWSkipSlot1(false);
    setWriting(null);
    setWModelDraft(null);
    setWError(null);
    uploadWritingFile(file, 1);
  }, []);

  const handleWFile2 = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setWPreview2(URL.createObjectURL(file));
    setWImage2(file);
    setWriting(null);
    setWModelDraft(null);
    setWError(null);
    uploadWritingFile(file, 2);
  }, []);

  const removeWImage1 = () => {
    if (wUpload1.id) {
      fetch(`/api/upload?id=${encodeURIComponent(wUpload1.id)}`, { method: "DELETE" }).catch(() => {});
    }
    setWImage1(null);
    setWPreview1(null);
    setWUpload1({ loading: false, id: null, size: 0, error: null });
    setWriting(null);
    setWModelDraft(null);
  };

  const removeWImage2 = () => {
    if (wUpload2.id) {
      fetch(`/api/upload?id=${encodeURIComponent(wUpload2.id)}`, { method: "DELETE" }).catch(() => {});
    }
    setWImage2(null);
    setWPreview2(null);
    setWUpload2({ loading: false, id: null, size: 0, error: null });
    setWriting(null);
    setWModelDraft(null);
  };

  const isSlot2Locked = !wSkipSlot1 && (!wUpload1.id || wUpload1.loading);
  const isUploading = wUpload1.loading || wUpload2.loading;
  const canAnalyzeWriting = (Boolean(wUpload1.id) || Boolean(wUpload2.id)) &&
    !isUploading &&
    !wLoading &&
    (!wImage1 || Boolean(wUpload1.id)) &&
    (!wImage2 || Boolean(wUpload2.id));

  const analyzeWriting = async () => {
    if (!canAnalyzeWriting && !wRetry && !sessionStorage.getItem("writing-pending-job")) return;
    setWLoading(true);
    setWError(null);
    try {
      const payload = {};
      if (wUpload1.id) payload.image1Id = wUpload1.id;
      if (wUpload2.id) payload.image2Id = wUpload2.id;
      const data = await pollLesson("writing", wRetry ? {jobId: wRetry, retry: true} : payload, setWJob);
      setWRetry(null);
      setWriting(data.writing);
    } catch (e) {
      if (e.jobId) setWRetry(e.jobId);
      setWError(formatErrorMessage(e));
    } finally {
      setWLoading(false);
    }
  };

  const analyzeGrammar = async (targetArg = null) => {
    const idToAnalyze = typeof targetArg === "string" ? targetArg : gImageId;
    const fileToAnalyze = targetArg instanceof File || targetArg instanceof Blob ? targetArg : gImage;
    if (!idToAnalyze && !fileToAnalyze && !gRetry && !sessionStorage.getItem("grammar-pending-job")) return;
    setGLoading(true);
    setGError(null);
    try {
      let imageId = idToAnalyze;
      if (!imageId && !gRetry && !sessionStorage.getItem("grammar-pending-job")) {
        const fd = new FormData(); fd.append("file", fileToAnalyze);
        const uploaded = await parseApiResponse(await fetchWithRetry("/api/upload", {method: "POST", body: fd, timeout: 90000}, 0));
        imageId = uploaded.id; setGImageId(imageId);
      }
      const data = await pollLesson("grammar", gRetry ? {jobId: gRetry, retry: true} : {imageId}, setGJob);
      setGRetry(null);
      setGrammar(data.grammar);
      setGPractice(false);
      setGSubmitted(false);
      setGPracticeData(null);
    } catch (e) {
      if (e.jobId) setGRetry(e.jobId);
      setGError(formatErrorMessage(e));
    } finally {
      setGLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStorage.getItem("grammar-pending-job")) analyzeGrammar();
    if (sessionStorage.getItem("writing-pending-job")) analyzeWriting();
  }, []);

  const createGrammarPractice = async () => {
    setGPracticeLoading(true);
    setGPracticeData(null);
    setGChooseAnswers({});
    setGRewriteAnswers({});
    setGSubmitted(false);
    try {
      const res = await fetchWithRetry("/api/grammar-practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grammar }), timeout: 90000 }, 2, 1500);
      const data = await parseApiResponse(res);
      setGPracticeData(data);
    } catch (e) { setGError(formatErrorMessage(e)); }
    finally { setGPracticeLoading(false); }
  };

  // --- Shared helpers ---
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
      const res = await fetchWithRetry("/api/lookup", { method: "POST", body: form, timeout: 60000 }, 2, 1000);
      const data = await parseApiResponse(res);
      setQuickResult(data.result);
    } catch (e) { setQuickResult({ error: formatErrorMessage(e) }); }
    finally { setQuickLoading(false); }
  };

  const lookupWord = async (word, context = "") => {
    const body = JSON.stringify({ word, context });
    setLookup({ word, loading: true, detailLoading: true });
    const quick = fetch("/api/quick-word", { method: "POST", headers: { "Content-Type": "application/json" }, body })
      .then(parseApiResponse)
      .then(data => setLookup(current => current?.word === word ? { ...current, meaning: data.meaning, loading: false, quick: true } : current))
      .catch(() => {});
    try {
      const res = await fetch("/api/word", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const data = await parseApiResponse(res);
      setLookup({ ...data.word, loading: false, detailLoading: false });
    } catch (e) {
      await quick;
      setLookup(current => current?.word === word && current.meaning ? { ...current, loading: false, detailLoading: false } : { word, error: formatErrorMessage(e), loading: false, detailLoading: false });
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
      const res = await fetchWithRetry("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words }), timeout: 90000 }, 2, 1500);
      const data = await parseApiResponse(res);
      setGroupQuestions(data.groups);
      setGeneratedFills(data.fills);
    } catch (e) { setError(formatErrorMessage(e)); }
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

  const renderContrastTip = (raw = "", examples = []) => {
    if (!raw || typeof raw !== "string") return null;
    const sections = [];
    const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleanHeader = line.replace(/^\*{1,3}|[\*#:]+$/g, "").replace(/^[-•*#\d.]+\s*/, "").trim();
      const headingMatch = cleanHeader.match(/^(Đồng nghĩa|Trái nghĩa)(?:\s*\([^)]*\))?\s*[:：]?\s*(.*)$/i);
      if (headingMatch) {
        const isOpposite = /^Trái/i.test(headingMatch[1]);
        const title = headingMatch[1];
        const rest = headingMatch[2]?.trim();
        const s = { title, opposite: isOpposite, items: [] };
        sections.push(s);
        if (rest) s.items.push(rest);
      } else {
        if (!sections.length) {
          sections.push({ title: "Phân biệt sắc thái", opposite: false, items: [] });
        }
        sections[sections.length - 1].items.push(line);
      }
    }

    return (
      <div data-testid="contrast-sections" className="mt-3 space-y-3">
        {sections.map((sec, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3.5 transition-colors ${
              sec.opposite
                ? "border-rose-700/60 bg-rose-950/40 text-rose-100"
                : "border-emerald-700/60 bg-emerald-950/40 text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2.5 font-bold text-sm tracking-wide">
              <span>{sec.opposite ? "⚡" : "🔗"}</span>
              <span className={sec.opposite ? "text-rose-300" : "text-emerald-300"}>
                {sec.title}
              </span>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed">
              {sec.items.map((item, j) => {
                const clean = item.replace(/^[-•*#\d.]+\s*/, "").trim();
                const m = clean.match(/^(\*{0,2})([A-Za-z][A-Za-z\s'’\-]*?)(\*{0,2})\s*(?:\(([^)]+)\))?\s*[:=–—]\s*(.*)$/);
                if (m) {
                  const word = m[2].trim();
                  const vi = m[4]?.trim() || "";
                  const desc = m[5]?.trim() || "";
                  const example = Array.isArray(examples) ? examples.find(x => typeof x?.word === "string" && x.word.toLowerCase() === word.toLowerCase()) : null;
                  return (
                    <li key={j} className="relative py-1 leading-relaxed">
                      <div className="min-h-9 pr-24">
                        <span className="font-bold text-sky-300 hover:text-sky-200 underline decoration-dotted underline-offset-4 cursor-pointer">
                          {clickableText(word)}
                        </span>
                        {vi && <span className="ml-1 font-normal text-amber-300">({vi})</span>}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-200">{desc}</p>
                      {example?.english && example?.vietnamese && (
                        <details data-testid="contrast-example" className="group/example">
                          <summary aria-label={`Ví dụ cho ${word}`} className="absolute right-0 top-0 flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 [&::-webkit-details-marker]:hidden">
                            <span>Ví dụ</span>
                            <span aria-hidden="true" className="example-chevron">⌄</span>
                          </summary>
                          <div data-testid="contrast-example-body" className={`mt-3 border-l-2 pl-3 ${sec.opposite ? "border-rose-500/50" : "border-emerald-500/50"}`}>
                            <div className="mb-1 flex justify-end gap-1">
                              <CopyBtn text={example.english} />
                              <SpeakBtn text={example.english} title="Nghe câu ví dụ" aria-label="Nghe câu ví dụ" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-sky-200 hover:bg-slate-800" />
                            </div>
                            <div className="break-words text-sm font-medium text-sky-100">{clickableText(example.english)}</div>
                            <div className="mt-1.5 text-sm leading-relaxed text-slate-400">{example.vietnamese}</div>
                          </div>
                        </details>
                      )}
                    </li>
                  );
                }
                return (
                  <li key={j} className="text-slate-200 leading-relaxed">
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderAnnotatedWords = (raw = "") => {
    if (!raw || typeof raw !== "string") return null;
    const items = [];
    let cur = "";
    let depth = 0;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === "(" || c === "[" || c === "“") depth++;
      else if (c === ")" || c === "]" || c === "”") depth = Math.max(0, depth - 1);
      if ((c === "," || c === ";") && depth === 0) {
        if (cur.trim()) items.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    if (cur.trim()) items.push(cur.trim());

    return items.map((item, idx) => {
      const m = item.match(/^(.+?)\s*\(([^)]+)\)$/) || item.match(/^([^:\-]+)\s*[:\-]\s*(.+)$/);
      const en = m ? m[1].trim() : item.trim();
      const vi = m ? m[2].trim() : "";
      return (
        <span key={idx}>
          {clickableText(en)}
          {vi && (
            <span className="text-amber-300 font-normal ml-1">
              ({vi})
            </span>
          )}
          {idx < items.length - 1 && <span className="text-slate-500 mr-1.5">, </span>}
        </span>
      );
    });
  };

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
          startConfirmUpload(file, "grammar");
        } else if (target === "writing1") {
          handleWFile1(file);
        } else if (target === "writing2") {
          handleWFile2(file);
        } else {
          handleFile(file);
          startConfirmUpload(file, "vocab");
        }
      }} />}

      {confirmAnalyze && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => !confirmAnalyze.loading && setConfirmAnalyze(null)} onKeyDown={e => { if (e.key === "Escape" && !confirmAnalyze.loading) setConfirmAnalyze(null); }}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 text-3xl">
              {confirmAnalyze.loading ? "⏳" : confirmAnalyze.error ? "⚠️" : "🔍"}
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmAnalyze.loading ? "Đang tải ảnh lên server..." : confirmAnalyze.error ? "Tải ảnh không thành công" : "Ảnh đã sẵn sàng!"}
            </h3>
            <div className="text-sm text-slate-400 mb-6 leading-relaxed">
              {confirmAnalyze.loading ? (
                <div className="flex items-center justify-center gap-2 text-amber-300">
                  <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải lên server ({((confirmAnalyze.size || 0) / (1024 * 1024)).toFixed(1)} MB)...</span>
                </div>
              ) : confirmAnalyze.error ? (
                <span className="text-red-300 text-xs block bg-red-950/60 border border-red-800/60 rounded-lg p-2.5">
                  {confirmAnalyze.error}
                </span>
              ) : (
                <span className="text-emerald-300 text-xs block font-medium">
                  ✓ Đã lưu ảnh trên server ({((confirmAnalyze.size || 0) / (1024 * 1024)).toFixed(1)} MB). Nhấn bên dưới để AI phân tích.
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={confirmAnalyze.loading}
                onClick={() => setConfirmAnalyze(null)}
                className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                Để sau
              </button>
              {confirmAnalyze.error ? (
                <button
                  type="button"
                  onClick={() => startConfirmUpload(confirmAnalyze.file, confirmAnalyze.target)}
                  className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-500 py-3 text-sm font-semibold text-white shadow-lg transition-colors"
                >
                  Thử lại
                </button>
              ) : confirmAnalyze.loading ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 rounded-xl bg-slate-800/80 border border-slate-700 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Đang tải...
                </button>
              ) : (
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    const { imageId, file, target } = confirmAnalyze;
                    setConfirmAnalyze(null);
                    if (target === "grammar") analyzeGrammar(imageId || file);
                    else analyze(imageId || file);
                  }}
                  className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-lg transition-colors ${
                    confirmAnalyze.target === "grammar" ? "bg-purple-600 hover:bg-purple-500" : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  OK, phân tích
                </button>
              )}
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
        <button onClick={() => setMode("writing")} className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${mode === "writing" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>✍️ Writing</button>
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
              role="combobox"
              aria-label="Từ hoặc câu cần tra"
              aria-autocomplete="list"
              aria-expanded={suggestOpen && suggestions.length > 0}
              aria-controls="word-suggestions"
              aria-activedescendant={suggestOpen && suggestIndex >= 0 ? `word-suggestion-${suggestIndex}` : undefined}
              autoComplete="off"
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setSuggestOpen(false)}
              value={quickQuery}
              onChange={(e) => {
                setQuickQuery(e.target.value);
                setSuggestOpen(true);
                setQuickResult(null);
              }}
              onKeyDown={e => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Escape") { setSuggestOpen(false); return; }
                if (suggestOpen && suggestions.length && ["ArrowDown", "ArrowUp"].includes(e.key)) {
                  e.preventDefault();
                  setSuggestIndex(i => (i + (e.key === "ArrowDown" ? 1 : suggestions.length - 1) + suggestions.length) % suggestions.length);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (suggestOpen && suggestIndex >= 0 && suggestions[suggestIndex]) chooseSuggestion(suggestions[suggestIndex]);
                  else { setSuggestOpen(false); lookupText(); }
                }
              }}
              placeholder={
                quickDirection === "en-vi"
                  ? "Ví dụ: I goed to school yesterday"
                  : "Ví dụ: Hôm qua tôi đi học muộn vì kẹt xe"
              }
              className={quickLoading ? "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-sky-500 ring-2 ring-sky-500/20" : quickDirection === "vi-en" ? "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-purple-600/60 focus:border-purple-400" : "w-full rounded-lg border bg-slate-950 px-3 py-2.5 text-sm text-white outline-none border-slate-600 focus:border-blue-400"}
            />
            {suggestOpen && quickDirection === "en-vi" && suggestions.length > 0 && (
              <ul id="word-suggestions" role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                {suggestions.map((word, i) => (
                  <li key={word} id={`word-suggestion-${i}`} role="option" aria-selected={suggestIndex === i}
                    onPointerDown={e => e.preventDefault()} onClick={() => chooseSuggestion(word)}
                    className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${suggestIndex === i ? "bg-sky-900 text-white" : "text-slate-200 hover:bg-slate-800"}`}>
                    <span className="font-semibold text-sky-300">{word.slice(0, quickQuery.trim().length)}</span>{word.slice(quickQuery.trim().length)}
                  </li>
                ))}
              </ul>
            )}
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
                  <SpeakBtn
                    text={quickResult.corrected}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sky-300 transition-colors hover:bg-sky-900"
                    title="Nghe đọc tiếng Anh"
                    aria-label="Nghe tiếng Anh"
                  >
                    🔊
                  </SpeakBtn>
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

        {vProgress && <div className="mb-4 text-sm text-blue-200" role="status">{vProgress.total ? `Đã xử lý ${vProgress.completed}/${vProgress.total} từ` : "Đang đọc từ và ngữ cảnh trong ảnh..."}{vProgress.total > 0 && <progress className="mt-2 w-full" value={vProgress.completed} max={vProgress.total} aria-label="Số từ đã xử lý" />}</div>}
        {vRetryJob && !loading && <button onClick={() => analyze()} className="mb-4 rounded-lg bg-amber-600 px-4 py-2">Thử lại nhóm lỗi</button>}
        {/* Error notification */}
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {words.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <p className="text-slate-400">✅ Tìm thấy {words.length} từ vựng</p>
            <button
              type="button"
              onClick={clearCachedLesson}
              className="text-xs text-red-400 hover:text-red-300 hover:underline px-2 py-1 rounded bg-slate-800/80"
              title="Xóa bài học đang lưu trên server"
            >
              ✕ Xóa bài / Bài mới
            </button>
          </div>
        )}

        {words.length > 0 && !words.some(w => w.pending) && !practice && (
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
                <SpeakBtn text={w.word} className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-lg transition-colors" title="Nghe phát âm">🔊</SpeakBtn>
              </div>
              <div className="mt-3 text-slate-100 font-medium">{w.meaning}</div>
              {w.definition && (
                <div className="mt-3 border-l-2 border-violet-500 pl-3">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
                    <span>English definition</span>
                    <div className="flex gap-1">
                      <CopyBtn text={w.definition} />
                      <SpeakBtn text={w.definition} className="shrink-0 rounded-md bg-violet-800/70 px-2 py-1 normal-case text-violet-100 hover:bg-violet-700" title="Đọc định nghĩa tiếng Anh">🔊 Đọc</SpeakBtn>
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
                  {w.pending && <div className="text-sm text-blue-300">Đang bổ sung nghĩa và mẹo dùng...</div>}
                  {w.synonyms && !w.contrastTip && (
                    <div className="text-sm text-slate-300">
                      <span className="text-slate-400 font-medium">Đồng nghĩa:</span>{!w.synonymsInBook && <AiTag />} {renderAnnotatedWords(w.synonyms)}<CopyBtn text={w.synonyms} />
                    </div>
                  )}
                  {w.antonyms && !w.contrastTip && (
                    <div className="text-sm text-slate-300">
                      <span className="text-slate-400 font-medium">Trái nghĩa:</span>{!w.antonymsInBook && <AiTag />} {renderAnnotatedWords(w.antonyms)}<CopyBtn text={w.antonyms} />
                    </div>
                  )}
                  {w.contrastTip && <div data-testid="vocab-contrast-tip" className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm"><div className="font-semibold text-amber-300">Mẹo nhớ cực ngắn<AiTag /></div>{renderContrastTip(w.contrastTip, w.contrastExamples)}</div>}
                  {w.collocations?.length > 0 && <div className="mt-3 rounded-lg border border-teal-800/70 bg-teal-950/40 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-teal-300">Collocation</div>{w.collocations.map((c, ci) => <div key={ci} className="mt-2 text-sm"><div className="font-medium text-teal-100">{clickableText(c.phrase)}<CopyBtn text={c.phrase} /> <SpeakBtn text={c.phrase} className="text-xs text-teal-300 hover:text-white">🔊</SpeakBtn></div><div className="mt-1 text-teal-200/70">{c.meaning}{c.note && ` — ${c.note}`}</div></div>)}</div>}
                  {w.note && <div className="text-sm text-amber-400 mt-2">💡 {w.note}</div>}
                  <SpeakBtn text={w.example} className="mt-3 text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">🔊 Nghe ví dụ</SpeakBtn>
                </div>
              </details>
            </div>
          ))}
        </div>}
        {words.length > 0 && !words.some(w => w.pending) && !practice && <Listening key={JSON.stringify(words.map(w => w.word))} words={words} />}
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

        {/* Error notification */}
        {gJob && <p role="status" className="mb-3 text-sm text-blue-200">{gJob.stage === "extract" ? "Đang đọc ảnh..." : `Đã xử lý ${gJob.progress?.completed || 0}/2 phần`}</p>}
        {gRetry && !gLoading && <button onClick={() => analyzeGrammar()} className="mb-3 rounded-lg bg-amber-600 px-4 py-2">Thử lại phần lỗi</button>}
        <ErrorBanner message={gError} onDismiss={() => setGError(null)} />

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
              <div className="text-sm text-slate-100">{clickableText(grammar.everydayContext.english)}<CopyBtn text={grammar.everydayContext.english} /> <SpeakBtn text={grammar.everydayContext.english} className="text-xs text-slate-400 hover:text-white">🔊</SpeakBtn></div>
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
                          <SpeakBtn text={ex.english} className="ml-1 shrink-0 text-xs text-slate-500 hover:text-slate-300">🔊</SpeakBtn>
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
                          {opt}
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

      {/* ============ WRITING MODE ============ */}
      {mode === "writing" && <>
        <div className="mb-4 text-center">
          <p className="text-sm text-slate-300">
            Tải lên <b className="text-emerald-300">1 hoặc 2 trang</b> trong cùng một Unit để AI hướng dẫn học và đối chiếu trọn vẹn:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Slot 1: Sample Writing */}
          <div className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 bg-slate-900/60 transition-all flex flex-col justify-between ${
            wUpload1.id ? "border-emerald-500 shadow-md shadow-emerald-950/40" : wUpload1.error ? "border-red-500/70" : "border-emerald-600/50 hover:border-emerald-400"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 rounded-md px-2.5 py-1">
                Trang 1 · Bài mẫu (Sample)
              </span>
              <div className="flex items-center gap-2">
                {wUpload1.loading && (
                  <span className="text-xs text-amber-300 flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </span>
                )}
                {wUpload1.id && (
                  <span className="text-xs text-emerald-400 font-medium">
                    ✓ Đã lưu server
                  </span>
                )}
                {wImage1 && !wUpload1.loading && (
                  <button
                    type="button"
                    onClick={removeWImage1}
                    className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-950/50 hover:text-red-300"
                  >
                    ✕ Xóa
                  </button>
                )}
              </div>
            </div>

            {wPreview1 ? (
              <div className="text-center my-auto py-2">
                <img src={wPreview1} alt="Preview bài mẫu" className="max-h-56 mx-auto rounded-xl border border-slate-700 object-contain shadow-md" />
                {wUpload1.error && (
                  <div className="mt-2 text-xs text-red-300 bg-red-950/60 border border-red-800/60 rounded-lg p-2">
                    ⚠️ {wUpload1.error}
                    <button
                      type="button"
                      onClick={() => uploadWritingFile(wImage1, 1)}
                      className="ml-2 underline font-semibold text-white"
                    >
                      Thử tải lại
                    </button>
                  </div>
                )}
                {!wUpload1.loading && !wUpload1.error && wUpload1.id && (
                  <p className="mt-2 text-xs text-emerald-300 font-medium">
                    Ảnh đã lên server ({(wUpload1.size / (1024 * 1024)).toFixed(1)} MB).
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => wFileRef1.current?.click()}
                  disabled={wUpload1.loading}
                  className="mt-3 text-xs text-slate-400 hover:text-emerald-300 underline block mx-auto disabled:opacity-40"
                >
                  Đổi ảnh khác
                </button>
              </div>
            ) : (
              <div
                onClick={() => wFileRef1.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) selectImage(f, "writing1"); }}
                className="py-8 text-center cursor-pointer my-auto rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <div className="text-3xl sm:text-4xl mb-2">📖</div>
                <p className="text-sm font-semibold text-slate-200">Ảnh trang bài mẫu</p>
                <p className="text-xs text-slate-400 mt-1">Email / thư mẫu của bài</p>
              </div>
            )}

            <input
              ref={wFileRef1}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) selectImage(f, "writing1");
                e.target.value = "";
              }}
            />
          </div>

          {/* Slot 2: Self-Writing Task */}
          <div className={`rounded-2xl border-2 border-dashed p-4 sm:p-5 bg-slate-900/60 transition-all flex flex-col justify-between ${
            isSlot2Locked ? "opacity-50 border-slate-700 pointer-events-none" : wUpload2.id ? "border-amber-500 shadow-md shadow-amber-950/40" : wUpload2.error ? "border-red-500/70" : "border-amber-600/50 hover:border-amber-400"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-800/80 rounded-md px-2.5 py-1">
                Trang 2 · Bài tập (Self-Writing)
              </span>
              <div className="flex items-center gap-2">
                {wUpload2.loading && (
                  <span className="text-xs text-amber-300 flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Đang tải...
                  </span>
                )}
                {wUpload2.id && (
                  <span className="text-xs text-amber-300 font-medium">
                    ✓ Đã lưu server
                  </span>
                )}
                {wImage2 && !wUpload2.loading && (
                  <button
                    type="button"
                    onClick={removeWImage2}
                    className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-950/50 hover:text-red-300"
                  >
                    ✕ Xóa
                  </button>
                )}
              </div>
            </div>

            {wPreview2 ? (
              <div className="text-center my-auto py-2">
                <img src={wPreview2} alt="Preview bài tập" className="max-h-56 mx-auto rounded-xl border border-slate-700 object-contain shadow-md" />
                {wUpload2.error && (
                  <div className="mt-2 text-xs text-red-300 bg-red-950/60 border border-red-800/60 rounded-lg p-2">
                    ⚠️ {wUpload2.error}
                    <button
                      type="button"
                      onClick={() => uploadWritingFile(wImage2, 2)}
                      className="ml-2 underline font-semibold text-white"
                    >
                      Thử tải lại
                    </button>
                  </div>
                )}
                {!wUpload2.loading && !wUpload2.error && wUpload2.id && (
                  <p className="mt-2 text-xs text-amber-300 font-medium">
                    Ảnh đã lên server ({(wUpload2.size / (1024 * 1024)).toFixed(1)} MB).
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => wFileRef2.current?.click()}
                  disabled={wUpload2.loading}
                  className="mt-3 text-xs text-slate-400 hover:text-amber-300 underline block mx-auto disabled:opacity-40"
                >
                  Đổi ảnh khác
                </button>
              </div>
            ) : isSlot2Locked ? (
              <div className="py-8 text-center my-auto">
                <div className="text-3xl sm:text-4xl mb-2">🔒</div>
                <p className="text-sm font-semibold text-slate-400">Chờ Trang 1 tải lên xong</p>
                <p className="text-xs text-slate-500 mt-1">Hoặc bỏ qua Trang 1 nếu chỉ học bài tập</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setWSkipSlot1(true); }}
                  className="mt-3 pointer-events-auto rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Bỏ qua Trang 1 → Tải thẳng Trang 2
                </button>
              </div>
            ) : (
              <div
                onClick={() => wFileRef2.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) selectImage(f, "writing2"); }}
                className="py-8 text-center cursor-pointer my-auto rounded-xl hover:bg-slate-800/50 transition-colors"
              >
                <div className="text-3xl sm:text-4xl mb-2">✍️</div>
                <p className="text-sm font-semibold text-slate-200">Ảnh trang bài tập</p>
                <p className="text-xs text-slate-400 mt-1">Đề bài Self-Writing & Word Bank</p>
              </div>
            )}

            <input
              ref={wFileRef2}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) selectImage(f, "writing2");
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="text-center mb-6">
          <button
            onClick={() => analyzeWriting()}
            disabled={!canAnalyzeWriting}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-base sm:text-lg transition-colors shadow-lg shadow-emerald-900/30 text-white"
          >
            {wLoading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-5 h-5 border-2 border-slate-400 border-t-emerald-300 rounded-full animate-spin" />
                Đang phân tích bài viết...
              </span>
            ) : isUploading ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-5 h-5 border-2 border-slate-400 border-t-emerald-300 rounded-full animate-spin" />
                Đang tải ảnh lên server...
              </span>
            ) : wUpload1.id && wUpload2.id ? (
              "🔍 Phân tích trọn bộ Unit (Bài mẫu + Bài tập Self-Writing)"
            ) : wUpload1.id ? (
              "🔍 Phân tích bài mẫu (Trang 1)"
            ) : wUpload2.id ? (
              "🔍 Phân tích bài tập (Trang 2)"
            ) : (
              "Vui lòng chọn ảnh"
            )}
          </button>
          {(!wUpload1.id || !wUpload2.id) && (wUpload1.id || wUpload2.id) && (
            <p className="text-xs text-slate-400 mt-2">
              💡 Mẹo: Tải thêm trang còn lại để xem trọn vẹn cả bài mẫu và đề tự viết.
            </p>
          )}
        </div>

        {/* Error notification */}
        {wJob && <p role="status" className="mb-3 text-sm text-blue-200">{wJob.stage === "extract" ? "Đang đọc ảnh..." : `Đã xử lý ${wJob.progress?.completed || 0}/2 phần`}</p>}
        {wRetry && !wLoading && <button onClick={() => analyzeWriting()} className="mb-3 rounded-lg bg-amber-600 px-4 py-2">Thử lại phần lỗi</button>}
        <ErrorBanner message={wError} onDismiss={() => setWError(null)} />
        {writing && <Writing writing={writing} cachedModelDraft={wModelDraft} onModelDraft={setWModelDraft} SpeakBtn={SpeakBtn} CopyBtn={CopyBtn} />}
      </>}

      {/* Lookup modal */}
      <LessonChat context={{ mode, lesson: mode === "grammar" ? grammar : mode === "writing" ? writing : words, practice: mode === "grammar" ? gPractice : practice, translation: quickResult, wordLookup: lookup && !lookup.loading && !lookup.error ? lookup : null }} />
      {lookup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 p-3" onClick={() => setLookup(null)}>
          <div className="max-h-[85dvh] overflow-y-auto w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div data-testid="lookup-word-header" className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="break-words text-xl font-bold text-sky-300">{lookup.word}</div>
                <SpeakBtn text={lookup.word} title="Nghe từ" aria-label="Nghe từ" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base text-white hover:bg-emerald-500" />
              </div>
              <button onClick={() => setLookup(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Đóng">✕</button>
            </div>
            {lookup.loading && !lookup.meaning ? <div className="mt-5 text-slate-400">Đang tra nghĩa tiếng Việt...</div> : lookup.error ? <div className="mt-4 text-red-300">{lookup.error}</div> : <>
              {lookup.partOfSpeech && <div className="mt-2"><span className="inline-block max-w-full rounded-lg border border-amber-500/40 bg-amber-950/50 px-2.5 py-1 text-xs font-semibold leading-relaxed text-amber-200">{lookup.partOfSpeech}</span></div>}
              <div className="mt-1 text-violet-300 italic">{lookup.ipa}</div>
              {lookup.easyReading && <div className="mt-4 rounded-xl border border-sky-900 bg-sky-950/50 p-3 text-sm leading-relaxed text-sky-100"><span className="font-semibold text-sky-300">Dễ đọc: </span>{lookup.easyReading}</div>}
              <div data-testid="lookup-meaning" className="mt-4 text-lg font-medium text-white">{lookup.meaning}</div>
              {lookup.detailLoading && <div data-testid="lookup-detail-loading" className="mt-2 flex items-center gap-2 text-xs text-slate-400"><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-sky-300" />Đang bổ sung giải thích, ví dụ…</div>}
              {lookup.usage && <div className="mt-3 text-sm leading-relaxed text-slate-200"><span className="font-semibold text-sky-300">Cách dùng: </span>{lookup.usage}</div>}
              {lookup.synonyms && !lookup.contrastTip && <div className="mt-3 text-sm leading-relaxed text-slate-200"><span className="font-semibold text-sky-300">Đồng nghĩa: </span><AiTag /> {renderAnnotatedWords(lookup.synonyms)}</div>}
              {lookup.antonyms && !lookup.contrastTip && <div className="mt-3 text-sm leading-relaxed text-slate-200"><span className="font-semibold text-sky-300">Trái nghĩa: </span><AiTag /> {renderAnnotatedWords(lookup.antonyms)}</div>}
              {lookup.contrastTip && <div data-testid="lookup-contrast-tip" className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm"><div className="font-semibold text-amber-300">Mẹo nhớ cực ngắn<AiTag /></div>{renderContrastTip(lookup.contrastTip, lookup.contrastExamples)}</div>}
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
