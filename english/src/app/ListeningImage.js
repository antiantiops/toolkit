"use client";
import { useEffect, useRef, useState } from 'react';
import ImageCrop from './ImageCrop';
import { fetchWithRetry, parseApiResponse, formatErrorMessage, pollLesson } from './fetch-helper';
import { validateTranscript, stripId3, lyricsTag, measuredLrc } from '../lib/listening/transcript';
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function duration(url) {
  return new Promise((resolve, reject) => {
    const probe = new Audio();
    const timer = setTimeout(() => finish(new Error('Không đo được thời lượng MP3')), 15000);
    const finish = error => { clearTimeout(timer); const d = probe.duration; probe.removeAttribute('src'); probe.load(); error ? reject(error) : resolve(d); };
    probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) && probe.duration > 0 ? null : new Error('Thời lượng MP3 không hợp lệ'));
    probe.onerror = () => finish(new Error('Không đọc được MP3')); probe.src = url;
  });
}
export default function ListeningImage() {
  const [crop, setCrop] = useState(null), [preview, setPreview] = useState(null), [upload, setUpload] = useState(null), [confirm, setConfirm] = useState(false);
  const [lesson, setLesson] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [stage, setStage] = useState('');
  const [clips, setClips] = useState([]), [index, setIndex] = useState(0), [speed, setSpeed] = useState(.8), [audioBusy, setAudioBusy] = useState(false), [audioProgress, setAudioProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const lyricsRef = useRef(null);
  useEffect(() => {
    const panel = lyricsRef.current, line = panel?.querySelector('[aria-current="true"]');
    if (!panel || !line) return;
    panel.scrollTo({ top: panel.scrollTop + line.getBoundingClientRect().top - panel.getBoundingClientRect().top - panel.clientHeight / 2 + line.clientHeight / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [index, clips.length]);
  const audio = useRef(null), resources = useRef([]), fileInput = useRef(null), version = useRef(0), loaded = useRef(false), resume = useRef(false);
  const release = () => { resources.current.forEach(c => URL.revokeObjectURL(c.url)); resources.current = []; setClips([]); setIndex(0); };
  const analyze = async id => {
    setConfirm(false); setBusy(true); setError('');
    try { const data = await pollLesson('listening-image', id ? { imageId: id } : {}, d => setStage(d.stage)); const current = validateTranscript(data['listening-image']); setLesson(current); await createAudio(current); }
    catch (e) { setError(formatErrorMessage(e)); } finally { setBusy(false); }
  };
  useEffect(() => {
    fetch('/api/session').then(parseApiResponse).then(data => { if (!loaded.current && data.session?.listening) { setLesson(validateTranscript(data.session.listening)); setPreview(data.session.lPreview || null); } }).catch(() => {});
    if (sessionStorage.getItem('listening-image-pending-job')) { loaded.current = true; analyze(); }
    return () => { version.current++; resources.current.forEach(c => URL.revokeObjectURL(c.url)); };
  }, []);
  const chooseFile = file => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 25 * 1024 * 1024) { setError('Chọn JPEG, PNG hoặc WebP dưới 25 MB.'); return; }
    setError(''); setCrop(file);
  };
  const stageFile = async file => {
    const token = ++version.current; loaded.current = true;
    release(); setLesson(null); setError(''); setConfirm(true); setUpload({ file, loading: true, id: null, size: file.size });
    const reader = new FileReader(); reader.onload = () => { if (token === version.current) setPreview(reader.result); }; reader.readAsDataURL(file);
    sessionStorage.removeItem('listening-image-pending-job');
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await parseApiResponse(await fetchWithRetry('/api/upload', { method: 'POST', body: fd, timeout: 90000 }, 0));
      if (!data.id) throw new Error('Missing upload ID');
      if (token === version.current) setUpload({ file, loading: false, id: data.id, size: data.size });
    } catch (e) { if (token === version.current) setUpload({ file, loading: false, error: formatErrorMessage(e), size: file.size }); }
  };
  const createAudio = async (current = lesson) => {
    setAudioBusy(true); setError(''); setAudioProgress(0);
    const token = version.current;
    // ponytail: sequential sentence MP3s, measured browser durations. Upgrade to provider timestamps for gapless audio.
    try {
      for (let i = resources.current.length; i < current.sentences.length; i++) {
        const res = await fetchWithRetry('/api/listening', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paragraph: current.sentences[i].en }), timeout: 100000 }, 0);
        if (!res.ok) await parseApiResponse(res);
        if (!res.headers.get('content-type')?.includes('audio/')) throw new Error('TTS response không phải audio');
        const blob = await res.blob(); if (blob.size < 1000) throw new Error('MP3 rỗng');
        const url = URL.createObjectURL(blob);
        try {
          const seconds = await duration(url);
          if (token !== version.current) { URL.revokeObjectURL(url); return; }
          resources.current.push({ url, blob, duration: seconds }); setAudioProgress(i + 1);
        } catch (e) { URL.revokeObjectURL(url); throw e; }
      }
      setClips([...resources.current]);
    } catch (e) { setError(formatErrorMessage(e)); } finally { setAudioBusy(false); }
  };
  const saveAudio = async () => {
    try {
      const text = lesson.sentences.map(s => `${s.en}\n${s.vi}`).join('\n\n');
      const bytes = await Promise.all(clips.map(async c => stripId3(new Uint8Array(await c.blob.arrayBuffer()))));
      download(new Blob([lyricsTag(text), ...bytes], { type: 'audio/mpeg' }), 'listening.mp3');
    } catch (e) { setError(formatErrorMessage(e)); }
  };
  const selectSentence = i => { resume.current = !!audio.current && !audio.current.paused; if (i === index) { audio.current.currentTime = 0; } else setIndex(i); };
  return <section id="image-listening" className="space-y-4">
    <h2 className="text-xl font-bold text-teal-200">Listening từ ảnh</h2>
    <p className="text-sm text-slate-400">Tạo bài nghe từ trang sách. Cắt ảnh, xác nhận rồi nghe cùng transcript Anh–Việt.</p>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; chooseFile(file); }} />
    <button type="button" data-testid="listening-upload-card" disabled={busy || audioBusy || upload?.loading}
      onClick={() => fileInput.current.click()}
      onDragOver={e => { e.preventDefault(); if (!busy && !audioBusy && !upload?.loading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && !audioBusy && !upload?.loading) chooseFile(e.dataTransfer.files?.[0]); }}
      className={`group flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${dragging ? 'border-teal-400 bg-teal-950/60' : 'border-slate-600 bg-slate-900/50 hover:border-teal-500 hover:bg-teal-950/30'}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-700/50 bg-teal-950/60 text-teal-300" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 8h5m-2.5-2.5v5M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7M4 16l5-5 5 5 2-2 4 4"/><circle cx="9" cy="8" r="1"/></svg>
      </span>
      <span className="text-base font-semibold text-slate-100">{dragging ? 'Thả ảnh để bắt đầu' : preview || lesson ? 'Chọn ảnh bài nghe khác' : 'Thêm ảnh bài nghe'}</span>
      <span className="text-sm leading-relaxed text-slate-400">Chạm để chọn ảnh hoặc kéo thả vào đây</span>
      <span className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white group-hover:bg-teal-500">Chọn ảnh</span>
      <span className="text-xs text-slate-500">JPG, PNG, WebP · Tối đa 25 MB</span>
    </button>
    <div className="flex flex-wrap gap-3">
      {(preview || lesson) && <button disabled={busy || audioBusy || upload?.loading} onClick={() => { version.current++; loaded.current = true; release(); setLesson(null); setPreview(null); setUpload(null); setError(''); sessionStorage.removeItem('listening-image-pending-job'); fetch('/api/session?type=listening', { method: 'DELETE' }).catch(() => {}); }} className="rounded-xl bg-slate-800 px-4 py-3 disabled:opacity-50">Xóa bài</button>}
    </div>
    {preview && <img src={preview} alt="Ảnh bài Listening" className="mx-auto max-h-72 max-w-full rounded-xl" />}
    {upload?.id && !lesson && !busy && <button onClick={() => analyze(upload.id)} className="w-full rounded-xl bg-teal-600 p-3">Phân tích ảnh đã lưu</button>}
    {busy && <p role="status" className="text-teal-200">Đang phân tích nền: {stage || 'read-image'}. Có thể đổi tab, tải lại để tiếp tục.</p>}
    {error && <div role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-red-950 p-3 text-sm text-red-200">{error}</div>}
    {lesson && <div className="space-y-4 rounded-2xl border border-teal-800 p-4">
      <h3 className="font-bold text-teal-200">{lesson.title}</h3>
      {!clips.length && <button disabled={audioBusy} onClick={() => createAudio()} className="rounded-xl bg-teal-600 p-3 disabled:opacity-50">{audioBusy ? `Đang tạo MP3 ${audioProgress}/${lesson.sentences.length} câu…` : resources.current.length ? 'Thử lại các câu chưa tạo' : 'Tạo audio Listening'}</button>}
      <div className="overflow-hidden rounded-2xl border border-teal-900/60 bg-gradient-to-b from-teal-950/50 to-slate-950">
        <div className="flex items-center justify-between px-5 pt-4 text-xs font-semibold uppercase tracking-widest text-teal-300"><span>Transcript</span><span>{clips.length ? `${index + 1} / ${lesson.sentences.length}` : 'Chưa có audio'}</span></div>
        <div ref={lyricsRef} data-testid="listening-lyrics" aria-label="Transcript Listening" className="relative max-h-[55dvh] min-h-64 overflow-y-auto overscroll-contain px-5 py-24 sm:px-8">
          {lesson.sentences.map((s, i) => <button key={i} disabled={!clips.length} aria-current={clips.length && i === index ? 'true' : undefined} onClick={() => selectSentence(i)} className={`block w-full py-5 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-100 motion-reduce:transition-none ${clips.length && i === index ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            <span className="block break-words text-2xl font-bold leading-snug sm:text-3xl">{s.en}</span>
            <span className={`mt-3 block text-base leading-relaxed ${clips.length && i === index ? 'text-teal-200' : 'text-slate-600'}`}>{s.vi}</span>
          </button>)}
        </div>
        <p className="px-5 pb-4 text-xs text-slate-400">Bấm câu để nghe lại · Tự cuộn theo câu đang phát</p>
      </div>
      {!!clips.length && <div data-testid="listening-player" className="sticky bottom-2 z-10 space-y-3 rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl">
        <audio ref={audio} src={clips[index]?.url} controls preload="auto" className="w-full" onLoadedMetadata={() => { audio.current.playbackRate = speed; if (resume.current) { resume.current = false; audio.current.play().catch(e => setError(formatErrorMessage(e))); } }} onPlay={() => { if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') navigator.mediaSession.metadata = new MediaMetadata({ title: lesson.title, artist: 'English Learner' }); }} onEnded={() => { if (index + 1 < clips.length) { resume.current = true; setIndex(index + 1); } }} />
        <div className="flex flex-wrap items-center gap-3 text-sm"><label>Tốc độ <select value={speed} onChange={e => { const value = Number(e.target.value); setSpeed(value); if (audio.current) audio.current.playbackRate = value; }} className="rounded bg-slate-800 p-2">{[.6,.7,.8,1,1.2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label><button onClick={saveAudio} className="text-teal-200 underline">Tải MP3 + lời nhúng</button><button onClick={() => download(new Blob([measuredLrc(lesson.sentences, clips.map(c => c.duration))], { type: 'text/plain;charset=utf-8' }), 'listening.lrc')} className="text-teal-200 underline">Tải LRC</button></div>
        <p className="text-xs text-slate-400">Thời gian LRC đo từ MP3 ở tốc độ 1×. MP3 nối các câu, có thể có khoảng nghỉ; lời nhúng USLT cần trình nghe hỗ trợ. Phát nền tùy trình duyệt/điện thoại.</p>
      </div>}
      <button onClick={() => download(new Blob([lesson.title + '\n\n' + lesson.sentences.map(s => `${s.en}\n${s.vi}`).join('\n\n')], { type: 'text/plain;charset=utf-8' }), 'listening-transcript.txt')} className="text-sm text-teal-200 underline">Tải transcript Anh–Việt</button>

    </div>}
    {crop && <ImageCrop file={crop} onCancel={() => setCrop(null)} onApply={file => { setCrop(null); stageFile(file); }} />}
    {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { if (!upload?.loading) setConfirm(false); }} onKeyDown={e => { if (e.key === "Escape" && !upload?.loading) setConfirm(false); }}><div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="listening-upload-title" className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6"><h3 id="listening-upload-title" className="font-bold">Xác nhận ảnh Listening</h3><p role="status" className="break-words text-sm">{upload?.loading ? `Đang tải lên server (${(upload.size / 1048576).toFixed(1)} MB)…` : upload?.error || `✓ Đã lưu ảnh trên server (${(upload.size / 1048576).toFixed(1)} MB)`}</p><div className="flex gap-3"><button disabled={upload?.loading} onClick={() => setConfirm(false)} className="flex-1 rounded-xl bg-slate-800 p-3 disabled:opacity-50">Để sau</button>{upload?.error ? <button onClick={() => stageFile(upload.file)} className="flex-1 rounded-xl bg-amber-600 p-3">Thử lại</button> : <button autoFocus disabled={!upload?.id || upload?.loading} onClick={() => analyze(upload.id)} className="flex-1 rounded-xl bg-teal-600 p-3 disabled:opacity-50">OK, phân tích</button>}</div></div></div>}
  </section>;
}
