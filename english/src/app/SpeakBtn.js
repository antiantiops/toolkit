"use client";
import { useState } from "react";
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
export default function SpeakBtn({ text, lang = "en-US", className = "", children = "🔊", ...rest }) {
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

