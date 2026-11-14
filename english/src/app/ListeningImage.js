"use client";
import {decodeSpeech, speechWav} from '../lib/listening/pcm-audio.mjs';
import {joinImages} from '../lib/listening/join-images.mjs';
import ListeningTitle from './ListeningTitle';
import { useLanguage } from './LanguageContext';
import { translateImage } from '../lib/lookup/image-ui.mjs';
import ListeningPlayback from './ListeningPlayback';
import { useEffect, useRef, useState } from 'react';
import ImageCrop from './ImageCrop';
import { transcriptParagraph } from '../lib/transcript-paragraph.mjs';
import { fetchWithRetry, parseApiResponse, formatErrorMessage, pollLesson } from './fetch-helper';
import { validateTranscript, stripId3, lyricsTag, measuredLrc, dialogueVoices, speakerVoices, spokenSentence } from '../lib/listening/transcript';
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function joinAudio(blobs) {
  if(blobs.every(blob=>/mpeg|mp3/.test(blob.type)))return Promise.all(blobs.map(async blob=>stripId3(new Uint8Array(await blob.arrayBuffer())))).then(bytes=>new Blob(bytes,{type:'audio/mpeg'}));
  return (async()=>{const ctx=new AudioContext(),decoded=await Promise.all(blobs.map(async blob=>ctx.decodeAudioData(await blob.arrayBuffer()))),rate=Math.max(...decoded.map(audio=>audio.sampleRate)),channels=Math.max(...decoded.map(audio=>audio.numberOfChannels)),frames=decoded.reduce((n,a)=>n+Math.ceil(a.duration*rate),0),out=new Int16Array(frames*channels);let offset=0;for(const audio of decoded){for(let i=0;i<Math.ceil(audio.duration*rate);i++)for(let channel=0;channel<channels;channel++)out[(offset+i)*channels+channel]=Math.max(-1,Math.min(1,audio.getChannelData(Math.min(channel,audio.numberOfChannels-1))[Math.min(i,audio.length-1)]||0))*32767;offset+=Math.ceil(audio.duration*rate);}await ctx.close();const header=new ArrayBuffer(44),view=new DataView(header),write=(at,text)=>[...text].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(i)));write(0,'RIFF');view.setUint32(4,36+out.byteLength,true);write(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,out.byteLength,true);return new Blob([header,out],{type:'audio/wav'});})();
}
export default function ListeningImage({onContextChange,historyEntry,clickableText=text=>text,inputLesson=null,autoGenerate=false}) {
  const { targetLang } = useLanguage();
  const { t: sharedT } = useLanguage();
  const it = text => translateImage(text, targetLang);
  const t = text => sharedT(text);
  const pendingKey = targetLang === 'vi' ? 'listening-image-pending-job' : `listening-image-pending-job-${targetLang}`;
  historyEntry = (historyEntry?.lesson?.targetLang || historyEntry?.targetLang || 'vi') === targetLang ? historyEntry : null;
  const [pages,setPages]=useState([]), [croppedPages,setCroppedPages]=useState([]), [pageIndex,setPageIndex]=useState(0), [joining,setJoining]=useState(false);
  const [crop, setCrop] = useState(null), [preview, setPreview] = useState(null), [upload, setUpload] = useState(null), [confirm, setConfirm] = useState(false);
  const [lesson, setLesson] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [stage, setStage] = useState('');
  const fullAudio=useRef('');
  const [audioUrl,setAudioUrl]=useState('');
  const [clips, setClips] = useState([]), [index, setIndex] = useState(0), [speed, setSpeed] = useState(.8), [audioBusy, setAudioBusy] = useState(false), [audioProgress, setAudioProgress] = useState(0);
  const [voices,setVoices]=useState({});
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false), [elapsed, setElapsed] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [paragraphView,setParagraphView]=useState(false);
  useEffect(()=>{onContextChange?.({source:'image',lesson,activeIndex:index});},[lesson,index,onContextChange]);
  const seekTo = useRef(null);
  const lyricsRef = useRef(null);
  useEffect(() => {
    if(paragraphView)return;
    const panel = lyricsRef.current, line = panel?.querySelector('[aria-current="true"]');
    if (!panel || !line) return;
    panel.scrollTo({ top: panel.scrollTop + line.getBoundingClientRect().top - panel.getBoundingClientRect().top - panel.clientHeight / 2 + line.clientHeight / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [index, clips.length, paragraphView]);
  const audio = useRef(null), resources = useRef([]), fileInput = useRef(null), version = useRef(0), loaded = useRef(false), resume = useRef(false);
  const release = () => { URL.revokeObjectURL(fullAudio.current);fullAudio.current='';setAudioUrl(''); audio.current?.pause(); resume.current = false; seekTo.current = null; resources.current.forEach(c => URL.revokeObjectURL(c.url)); resources.current = []; setClips([]); setIndex(0); setElapsed(0); setPlaying(false); };
  const analyze = async id => {
    setConfirm(false); setBusy(true); setError('');
    try { const data = await pollLesson('listening-image', id ? { imageId: id, targetLang } : { targetLang }, d => setStage(d.stage)); const current = validateTranscript(data['listening-image']); setLesson(current); setVoices(dialogueVoices(current.sentences)); }
    catch (e) { setError(formatErrorMessage(e)); } finally { setBusy(false); }
  };
  useEffect(() => {
    if(inputLesson)return () => {audio.current?.pause();version.current++; URL.revokeObjectURL(fullAudio.current);resources.current.forEach(c=>URL.revokeObjectURL(c.url));};
    (historyEntry?Promise.resolve({session:{listening:historyEntry.lesson}}):fetch('/api/session?type=listening&targetLang='+encodeURIComponent(targetLang)).then(parseApiResponse)).then(data => { if (!loaded.current && data.session?.listening?.sentences?.length) { const restored=validateTranscript(data.session.listening); setLesson(restored);const restoredVoices=dialogueVoices(restored.sentences);setVoices(restoredVoices); !historyEntry && fetch('/api/session?type=previews&targetLang='+encodeURIComponent(targetLang)).then(parseApiResponse).then(p => { if (!loaded.current) setPreview(p.session?.lPreview || null); }).catch(() => {}); } }).catch(() => {});
    if (!historyEntry && sessionStorage.getItem(pendingKey)) { loaded.current = true; analyze(); }
    return () => { version.current++; URL.revokeObjectURL(fullAudio.current); resources.current.forEach(c => URL.revokeObjectURL(c.url)); };
  }, []);
  const chooseFiles = files => {
    if (!files.length) return;
    if (files.length>2 || files.some(file=>!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>25*1024*1024)) {setError(it('Chọn tối đa 2 ảnh JPEG, PNG hoặc WebP, mỗi ảnh dưới 25 MB.'));return;}
    version.current++;loaded.current=true;release();setAudioBusy(false);setAudioProgress(0);setError('');setPages(files);setCroppedPages([]);setPageIndex(0);setCrop(files.length===1?files[0]:null);
  };
  const applyPage = async file => {
    setCrop(null);
    const selected=[...croppedPages,file];setCroppedPages(selected);
    if(pageIndex+1<pages.length){setPageIndex(pageIndex+1);setCrop(pages[pageIndex+1]);return;}
    const token=version.current;setJoining(true);
    try {const combined=selected.length===1?selected[0]:await joinImages(selected);if(token===version.current){setPages([]);setCroppedPages([]);await stageFile(combined);}}
    catch(e){if(token===version.current)setError(formatErrorMessage(e));}
    finally{setJoining(false);}
  };
  const stageFile = async file => {
    const token = ++version.current; loaded.current = true; setAudioBusy(false); setAudioProgress(0);
    release(); setLesson(null); setError(''); setConfirm(true); setUpload({ file, loading: true, id: null, size: file.size });
    const reader = new FileReader(); reader.onload = () => { if (token === version.current) setPreview(reader.result); }; reader.readAsDataURL(file);
    sessionStorage.removeItem(pendingKey);
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await parseApiResponse(await fetchWithRetry('/api/upload', { method: 'POST', body: fd, timeout: 90000 }, 0));
      if (!data.id) throw new Error('Missing upload ID');
      if (token === version.current) setUpload({ file, loading: false, id: data.id, size: data.size });
    } catch (e) { if (token === version.current) setUpload({ file, loading: false, error: formatErrorMessage(e), size: file.size }); }
  };
  const createAudio = async (current = lesson, selectedVoices = voices, cacheOnly = false) => {
    setAudioBusy(true); setError(''); setAudioProgress(0);
    const token = ++version.current;
    // Decode without HTMLAudio metadata probes: mobile browsers can reject detached probes.
    try {
      for (let i = resources.current.length; i < current.sentences.length; i++) {
        if (token !== version.current) return;
        const res = await fetchWithRetry('/api/listening', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paragraph: spokenSentence(current.sentences[i]), cacheOnly, voice: selectedVoices[current.sentences[i].speaker] || "en-US-AriaNeural" }), timeout: 100000 }, 2, 1500);
        if (token !== version.current) return;
        if (!res.ok) await parseApiResponse(res);
        if (!res.headers.get('content-type')?.includes('audio/')) throw new Error(it('TTS response không phải audio'));
        const blob = await res.blob(); if (blob.size < 1000) throw new Error(it('MP3 rỗng'));
        const decoded = await decodeSpeech(blob);
        if (token !== version.current) return;
        const url = URL.createObjectURL(blob);
        try {
          const seconds = decoded.duration;
          if (token !== version.current) { URL.revokeObjectURL(url); return; }
          resources.current.push({ url, blob, decoded, duration: seconds }); setAudioProgress(i + 1);
        } catch (e) { URL.revokeObjectURL(url); throw e; }
      }
      const joined=URL.createObjectURL(speechWav(resources.current.map(c=>c.decoded)));
      if(token!==version.current){URL.revokeObjectURL(joined);return;}
      URL.revokeObjectURL(fullAudio.current);fullAudio.current=joined;setAudioUrl(joined);
      setClips([...resources.current]);
    } catch (e) { if (token === version.current) setError(formatErrorMessage(e)); } finally { if (token === version.current) setAudioBusy(false); }
  };
  useEffect(()=>{if(historyEntry&&lesson)createAudio(lesson,dialogueVoices(lesson.sentences),true);},[historyEntry,lesson?.sentences]);
  useEffect(()=>{if(inputLesson){setLesson(inputLesson);setVoices({});if(autoGenerate)createAudio(inputLesson,{});}},[inputLesson]);
  const saveAudio = async () => {
    try {
      const text = lesson.sentences.map(s => `${s.en}\n${s.vi}`).join('\n\n');
      const joined=await joinAudio(clips.map(c=>c.blob));
      download(joined.type==='audio/mpeg'?new Blob([lyricsTag(text),joined],{type:'audio/mpeg'}):joined,joined.type==='audio/mpeg'?'listening.mp3':'listening.wav');
    } catch (e) { setError(formatErrorMessage(e)); }
  };
  const total = clips.reduce((n, c) => n + c.duration, 0);
  const clock = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  const seek = value => {audio.current.currentTime=value;setElapsed(value);};
  const selectSentence = i => {seek(clips.slice(0,i).reduce((n,c)=>n+c.duration,0));setIndex(i);};
  const updateTime=()=>{
    const value=audio.current.currentTime;setElapsed(value);let start=0;
    const active=clips.findIndex(c=>{start+=c.duration;return value<start;});setIndex(active<0?clips.length-1:active);
  };
  useEffect(()=>{
    if(!audioUrl||!('mediaSession' in navigator))return;
    const media=navigator.mediaSession;
    const handlers={play:()=>audio.current?.play().catch(e=>setError(formatErrorMessage(e))),pause:()=>audio.current?.pause(),seekto:e=>seek(e.seekTime),seekbackward:e=>seek(Math.max(0,audio.current.currentTime-(e.seekOffset||10))),seekforward:e=>seek(Math.min(total,audio.current.currentTime+(e.seekOffset||10)))};
    for(const [name,handler] of Object.entries(handlers))try{media.setActionHandler(name,handler);}catch{}
    return ()=>{for(const name of Object.keys(handlers))try{media.setActionHandler(name,null);}catch{}};
  },[audioUrl,total]);
  return <section id="image-listening" className="space-y-4">
    {!inputLesson && historyEntry?.source !== 'text' && <>
    <h2 className="text-xl font-bold text-teal-200">{t("Listening từ ảnh")}</h2>
    <p className="text-sm text-slate-400">{t("Tạo bài nghe từ trang sách. Khoanh một hoặc nhiều vùng theo thứ tự đọc, ghép thành một bài nghe. Chỉ vùng chọn được gửi AI.")}</p>
    <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; chooseFiles(files); }} />
    <button type="button" data-testid="listening-upload-card" disabled={busy || joining || upload?.loading}
      onClick={() => fileInput.current.click()}
      onDragOver={e => { e.preventDefault(); if (!busy && !joining && !upload?.loading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!busy && !joining && !upload?.loading) chooseFiles(Array.from(e.dataTransfer.files || [])); }}
      className={`group flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${dragging ? 'border-teal-400 bg-teal-950/60' : 'border-slate-600 bg-slate-900/50 hover:border-teal-500 hover:bg-teal-950/30'}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-700/50 bg-teal-950/60 text-teal-300" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 8h5m-2.5-2.5v5M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7M4 16l5-5 5 5 2-2 4 4"/><circle cx="9" cy="8" r="1"/></svg>
      </span>
      <span className="text-base font-semibold text-slate-100">{dragging ? t("Thả ảnh để bắt đầu") : preview || lesson ? t("Chọn ảnh bài nghe khác") : t("Thêm ảnh bài nghe")}</span>
      <span className="text-sm leading-relaxed text-slate-400">{t("Chạm để chọn ảnh hoặc kéo thả vào đây")}</span>
      <span className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white group-hover:bg-teal-500">{t('Chọn ảnh')}</span>
      <span className="text-xs text-slate-500">{t("1–2 ảnh JPG, PNG, WebP · Tối đa 25 MB mỗi ảnh")}</span>
    </button>
    <div className="flex flex-wrap gap-3">
      {(preview || lesson) && <button disabled={busy || joining || upload?.loading} onClick={() => { version.current++; loaded.current = true; release(); setLesson(null); setPreview(null); setUpload(null); setError(''); sessionStorage.removeItem(pendingKey); fetch('/api/session?type=listening&targetLang='+encodeURIComponent(targetLang), { method: 'DELETE' }).catch(() => {}); }} className="rounded-xl bg-slate-800 px-4 py-3 disabled:opacity-50">{t('Xóa bài')}</button>}
    </div>
    {preview && <img src={preview} alt={it("Ảnh bài Listening")} className="mx-auto max-h-72 max-w-full rounded-xl" />}
    {upload?.id && !lesson && !busy && <button onClick={() => analyze(upload.id)} className="w-full rounded-xl bg-teal-600 p-3">{t("Phân tích ảnh đã lưu")}</button>}
    </>}
    {busy && <p role="status" className="text-teal-200">{it('Đang phân tích nền: ')}{stage || 'read-image'}{it('. Có thể đổi tab, tải lại để tiếp tục.')}</p>}
    {error && <div role="alert" className="whitespace-pre-wrap break-words rounded-xl bg-red-950 p-3 text-sm text-red-200">{error}</div>}
    {lesson && <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950 p-3 sm:p-5">
      {inputLesson?<h3 className="font-bold text-teal-200">{lesson.title}</h3>:<ListeningTitle title={lesson.title} id={historyEntry?.id} onSaved={title=>setLesson(current=>({...current,title}))} />}
      {!!Object.keys(voices).length && <div className="space-y-2 rounded-xl bg-slate-900 p-3"><p className="text-sm text-teal-200">{t("Giọng từng nhân vật · US")}</p><p className="text-xs text-slate-400">{it('Chưa rõ giới tính: gán giọng khác nhau, không đoán từ tên. Tên chỉ hiện trong transcript, không đọc thành tiếng.')}</p>{Object.entries(voices).map(([name,voice])=><label key={name} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 break-words text-slate-300">{name}</span><select aria-label={`${it('Giọng ')}${name}`} disabled={audioBusy||busy} value={voice} onChange={e=>{version.current++;release();setVoices(current=>({...current,[name]:e.target.value}));}} className="min-h-11 rounded-lg bg-slate-800 px-2 text-teal-100">{speakerVoices.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label>)}</div>}
      {!clips.length && <button disabled={audioBusy} onClick={() => createAudio()} className="rounded-xl bg-teal-600 p-3 disabled:opacity-50">{audioBusy ? `${it('Đang tạo MP3 ')}${audioProgress}/${lesson.sentences.length}${it(' câu…')}` : resources.current.length ? t("Thử lại các câu chưa tạo") : t("Tạo audio Listening")}</button>}
      <ListeningPlayback sentences={lesson.sentences} index={index} ready={clips.length} paragraphView={paragraphView} setParagraphView={setParagraphView} lyricsRef={lyricsRef} clickableText={clickableText} selectSentence={selectSentence} audio={audio} audioUrl={audioUrl} repeat={repeat} setRepeat={setRepeat} speed={speed} setSpeed={setSpeed} total={total} elapsed={elapsed} seek={seek} updateTime={updateTime} playing={playing} setPlaying={setPlaying} setError={setError} title={lesson.title}>        <details className="border-t border-white/5 pt-3 text-sm text-slate-400">
          <summary className="cursor-pointer text-center hover:text-teal-200">{t('Tải file & thông tin')}</summary>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={saveAudio} className="rounded-lg bg-slate-800 px-3 py-2 text-teal-200">{t("MP3 + lời nhúng")}</button><button onClick={() => download(new Blob([measuredLrc(lesson.sentences, clips.map(c => c.duration))], { type: 'text/plain;charset=utf-8' }), 'listening.lrc')} className="rounded-lg bg-slate-800 px-3 py-2 text-teal-200">Lyrics LRC</button></div>
          <p className="mt-3 text-xs leading-relaxed">{it('LRC đo ở 1×. MP3 nối từng câu có thể có khoảng nghỉ. Lời nhúng và phát nền tùy trình nghe hỗ trợ.')}</p>
        </details></ListeningPlayback>
      <button onClick={() => download(new Blob([lesson.title + '\n\n' + lesson.sentences.map(s => `${s.en}\n${s.vi}`).join('\n\n')], { type: 'text/plain;charset=utf-8' }), 'listening-transcript.txt')} className="text-sm text-teal-200 underline">{t('Tải transcript')}</button>

    </div>}
    {joining&&<p role="status">{t("Đang ghép 2 ảnh theo thứ tự đọc…")}</p>}
    {pages.length===2&&!crop&&!joining&&<div data-testid="listening-pages" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div role="dialog" aria-modal="true" aria-labelledby="listening-pages-title" className="max-h-[85dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5"><h3 id="listening-pages-title" className="text-lg font-bold text-teal-200">{it('Đã chọn ')}{pages.length}{it(' ảnh Listening')}</h3><p>{it('Thứ tự bài nghe: ')}{pages.map((p,i)=>`${i+1}. ${p.name}`).join(' → ')}</p><p className="text-sm text-slate-400">{it('Khoanh phần đầu trước, phần tiếp nối sau. Hai ảnh sẽ thành một bài nghe.')}</p>{pages.length===2&&<button className="rounded-lg bg-slate-800 p-3" onClick={()=>setPages([...pages].reverse())}>{t("Đổi thứ tự 2 ảnh")}</button>}<button className="rounded-lg bg-teal-600 p-3" onClick={()=>{setPageIndex(0);setCroppedPages([]);setCrop(pages[0]);}}>{it('Khoanh vùng ảnh ')}{pageIndex+1}/{pages.length}</button><button className="p-3" onClick={()=>{setPages([]);setCroppedPages([]);}}>{t("Hủy chọn")}</button></div></div>}
    {crop && <ImageCrop key={pageIndex} multiple file={crop} onCancel={() => {setCrop(null);setPages([]);setCroppedPages([]);}} onApply={applyPage} />}
    {confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { if (!upload?.loading) setConfirm(false); }} onKeyDown={e => { if (e.key === "Escape" && !upload?.loading) setConfirm(false); }}><div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="listening-upload-title" className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6"><h3 id="listening-upload-title" className="font-bold">{t("Xác nhận ảnh Listening")}</h3><p role="status" className="break-words text-sm">{upload?.loading ? `${it('Đang tải lên server (')}${(upload.size / 1048576).toFixed(1)}${it(' MB)…')}` : upload?.error || `${it('✓ Đã lưu ảnh trên server (')}${(upload.size / 1048576).toFixed(1)}${it(' MB)')}`}</p><div className="flex gap-3"><button disabled={upload?.loading} onClick={() => setConfirm(false)} className="flex-1 rounded-xl bg-slate-800 p-3 disabled:opacity-50">{t("Để sau")}</button>{upload?.error ? <button onClick={() => stageFile(upload.file)} className="flex-1 rounded-xl bg-amber-600 p-3">{t('Thử lại')}</button> : <button autoFocus disabled={!upload?.id || upload?.loading} onClick={() => analyze(upload.id)} className="flex-1 rounded-xl bg-teal-600 p-3 disabled:opacity-50">{t("OK, phân tích")}</button>}</div></div></div>}
  </section>;
}
