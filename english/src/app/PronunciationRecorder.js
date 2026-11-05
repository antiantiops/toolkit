"use client";
import { useEffect, useRef, useState } from 'react';
import MouthGuide from './MouthGuide';

async function wav(blob) {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    if (audio.duration > 31 || audio.duration < .2) throw Error('Bản ghi cần dài 0,2–30 giây.');
    const samples = audio.getChannelData(0), buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
    const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, audio.sampleRate, true); view.setUint32(28, audio.sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    text(36, 'data'); view.setUint32(40, samples.length * 2, true);
    samples.forEach((s, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * (s < 0 ? 32768 : 32767)), true));
    return new Blob([buffer], { type: 'audio/wav' });
  } finally { await context.close(); }
}

export default function PronunciationRecorder({ word, ipa }) {
  const [state, setState] = useState('idle'), [clip, setClip] = useState(null), [result, setResult] = useState(null), [error, setError] = useState('');
  const live = useRef(false), recorder = useRef(null), stream = useRef(null), timer = useRef(null), controller = useRef(null), url = useRef(null);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  async function start() {
    setError(''); setResult(null); setState('permission');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw Error('Ghi âm cần HTTPS và trình duyệt hỗ trợ microphone.');
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!live.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const rec = new MediaRecorder(media), chunks = []; recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => { clearTimeout(timer.current); media.getTracks().forEach(t => t.stop()); if (live.current) { setError('Ghi âm lỗi. Thử thu lại.'); setState('idle'); } };
      rec.onstop = async () => {
        clearTimeout(timer.current); media.getTracks().forEach(t => t.stop());
        if (!live.current) return;
        setState('encoding');
        try {
          const audio = await wav(new Blob(chunks, { type: rec.mimeType }));
          if (!live.current) return;
          if (url.current) URL.revokeObjectURL(url.current);
          url.current = URL.createObjectURL(audio); setClip({ blob: audio, url: url.current }); setState('ready');
        } catch (e) { if (live.current) { setError(e.message); setState('idle'); } }
      };
      setClip(null); rec.start(); setState('recording'); timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 30000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); if (live.current) { setError(e.name === 'NotAllowedError' ? 'Microphone bị từ chối. Cho phép microphone trong cài đặt trình duyệt rồi thử lại.' : e.message); setState('idle'); } }
  }
  async function assess() {
    setState('sending'); setError(''); setResult(null); controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 125000);
    try {
      const form = new FormData(); form.set('word', word); form.set('file', clip.blob, 'pronunciation.wav');
      const response = await fetch('/api/pronunciation-assess', { method: 'POST', body: form, signal: controller.current.signal });
      const data = await response.json(); if (!response.ok) throw Error(data.error || 'Đánh giá thất bại.');
      if (live.current) { setResult(data.result); setState('ready'); }
    } catch (e) { if (live.current) { setError(e.name === 'AbortError' ? 'Quá thời gian đánh giá. Bản ghi còn đây, thử gửi lại.' : e.message); setState('ready'); } }
    finally { clearTimeout(timeout); }
  }
  const busy = ['permission', 'encoding', 'sending'].includes(state);
  return <section data-testid="pronunciation-recorder" aria-label="Luyện phát âm" className="mt-4 rounded-xl border border-violet-700/60 bg-violet-950/20 p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-violet-200">Luyện phát âm</h3><MouthGuide ipa={ipa} /></div>
    <p className="mt-1 text-slate-300">Đọc “{word}”. Tối đa 30 giây. Bấm Gửi để chuyển bản ghi cho Gemini 3.8 Flash High; AI góp ý, không phải điểm chuẩn.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={state === 'recording' ? () => recorder.current?.stop() : start} className="min-h-11 rounded-lg bg-violet-600 px-3 py-2 text-white disabled:opacity-50">{state === 'recording' ? 'Dừng ghi âm' : clip ? 'Thu lại' : 'Ghi âm'}</button>
      {clip && <button type="button" disabled={busy || state === 'recording'} onClick={assess} className="min-h-11 rounded-lg bg-sky-700 px-3 py-2 text-white disabled:opacity-50">{state === 'sending' ? 'Đang đánh giá…' : 'Gửi đánh giá'}</button>}
    </div>
    <p role="status" className="mt-2 text-slate-300">{state === 'recording' ? 'Đang ghi âm… tự dừng sau 30 giây.' : state === 'permission' ? 'Chờ quyền microphone…' : state === 'encoding' ? 'Đang chuẩn bị bản ghi…' : ''}</p>
    {clip && <audio aria-label="Nghe lại bản ghi" controls src={clip.url} className="mt-2 w-full min-w-0" />}
    {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    {result && <div aria-live="polite" className="mt-3 space-y-2 text-slate-200">
      <p className="font-semibold text-violet-200">{result.status === 'retry' ? 'Cần thu lại' : 'Góp ý từ AI'}</p>
      <p><strong>Nghe được:</strong> {result.heard || 'Không rõ'}</p>
      <p>{result.summary}</p>
      {result.tips.length > 0 && <ul className="list-disc space-y-1 pl-5">{result.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>}
    </div>}
  </section>;
}
