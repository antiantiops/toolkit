"use client";
import { useEffect, useRef, useState } from 'react';
import MouthGuide from './MouthGuide';
import { useLanguage } from './LanguageContext';
import ErrorBoundary from './ErrorBoundary';
import { validateAssessment } from '../lib/assessment-result';
import PronunciationCelebration from './PronunciationCelebration';
import { translatePronunciation } from '../lib/lookup/pronunciation-ui.mjs';

function CoachScoreCircle({ score, t: tProp }) {
  const { targetLang } = useLanguage();
  const t = tProp || ((text) => translatePronunciation(text, targetLang));
  const hasScore = Number.isInteger(score);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(score)) {
      setDisplayScore(0);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayScore(score);
      return;
    }
    let frameId;
    const startTime = performance.now();
    const duration = 900; // ms

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(score * ease));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [score]);

  return (
    <div className="flex flex-col items-center justify-center" aria-label={hasScore ? `${t('Điểm phát âm ')}${score}` : t('Chưa có điểm')}>
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#2b2d42" strokeWidth="6" strokeLinecap="round" />
          {hasScore && (
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke={score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - displayScore / 100)}
              style={{ transition: 'stroke 0.3s ease' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {hasScore ? (
            <span className={`text-4xl font-extrabold tracking-tight ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {displayScore}
            </span>
          ) : (
            <div className="flex gap-1.5 text-2xl font-bold text-slate-500">
              <span>-</span>
              <span>-</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs font-medium text-slate-400">
        {hasScore ? t('Độ chính xác') : t('Hãy nói từ / cụm sau')}
      </p>
    </div>
  );
}
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


function normalizeDisplayWord(text) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (trimmed.includes(' ') || (/^[A-Z0-9]+$/.test(trimmed) && trimmed.length > 1)) return trimmed;
  return trimmed.toLowerCase();
}

export default function PronunciationRecorder(props) {
  return <ErrorBoundary key={props.word}><PronunciationRecorderPanel {...props} /></ErrorBoundary>;
}

function PronunciationRecorderPanel({ word, ipa, lookup }) {
  const { targetLang } = useLanguage();
  const t = (text) => translatePronunciation(text, targetLang);
  const pendingKey = 'pronunciation-job:'+word+(targetLang==='vi'?'':':'+targetLang);
  const [targetType, setTargetType] = useState('word'); // 'word' | 'collocation' | 'sentence'
  const [practiceData, setPracticeData] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [state, setState] = useState('idle'), [clip, setClip] = useState(null), [result, setResult] = useState(null), [error, setError] = useState(''), [notice,setNotice] = useState(''), [jobId,setJobId] = useState(null);
  const live = useRef(false), recorder = useRef(null), stream = useRef(null), timer = useRef(null), controller = useRef(null), url = useRef(null), currentJobId = useRef(null);

  // Derive initial or lookup-based practice items
  useEffect(() => {
    let coll = null;
    if (lookup?.collocations?.[0]?.phrase) {
      coll = {
        phrase: lookup.collocations[0].phrase,
        meaning: lookup.collocations[0].meaning || lookup.collocations[0].note || '',
      };
    }
    let sent = null;
    const ex = lookup?.contrastExamples?.[0] || (lookup?.example ? { english: lookup.example, vietnamese: lookup.exampleVietnamese || '' } : null);
    if (ex?.english) {
      sent = {
        text: ex.english,
        meaning: ex.vietnamese || '',
      };
    }
    if (coll && sent) {
      setPracticeData({ word, collocation: coll, sentence: sent });
    }
  }, [lookup, word]);

  // When result score > 90, if practiceData missing collocation or sentence, fetch from api
  useEffect(() => {
    if (result?.score > 90 && !practiceData && !practiceLoading) {
      setPracticeLoading(true);
      fetch(`/api/pronunciation-practice?word=${encodeURIComponent(word)}&targetLang=${encodeURIComponent(targetLang)}`)
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (live.current && data?.collocation && data?.sentence) {
            setPracticeData(data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (live.current) setPracticeLoading(false);
        });
    }
  }, [result?.score, practiceData, practiceLoading, word]);

  const activeTargetText = targetType === 'sentence'
    ? practiceData?.sentence?.text || word
    : targetType === 'collocation'
    ? practiceData?.collocation?.phrase || word
    : word;

  const activeTargetIpa = targetType === 'word' ? ipa : '';

  useEffect(() => {
    live.current = true;
    let saved;try { saved=sessionStorage.getItem(pendingKey); }catch{}
    if(saved) {currentJobId.current=saved;setJobId(saved);setState('sending');poll(saved);}

    return () => { live.current = false; clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  async function start() {
    controller.current?.abort();
    setError(''); setResult(null); setNotice(''); setClip(null); currentJobId.current = null; setJobId(null); try{sessionStorage.removeItem(pendingKey);}catch{} setState('permission');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw Error(t('Ghi âm cần HTTPS và trình duyệt hỗ trợ microphone.'));
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!live.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const rec = new MediaRecorder(media), chunks = []; recorder.current = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onerror = () => { clearTimeout(timer.current); media.getTracks().forEach(t => t.stop()); if (live.current) { setError(t('Ghi âm lỗi. Thử thu lại.')); setState('idle'); } };
      rec.onstop = async () => {
        clearTimeout(timer.current); media.getTracks().forEach(t => t.stop());
        if (!live.current) return;
        setState('encoding');
        try {
          const audio = await wav(new Blob(chunks, { type: rec.mimeType }));
          if (!live.current) return;
          if (url.current) URL.revokeObjectURL(url.current);
          url.current = URL.createObjectURL(audio); setClip({ blob: audio, url: url.current }); setState('ready'); assess(false, audio);
        } catch (e) { if (live.current) { setError(e.message); setState('idle'); } }
      };
      setClip(null); rec.start(); setState('recording'); timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 30000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); if (live.current) { setError(e.name === 'NotAllowedError' ? t('Microphone bị từ chối. Cho phép microphone trong cài đặt trình duyệt rồi thử lại.') : e.message); setState('idle'); } }
  }
  function restartRecording() {
    clearTimeout(timer.current);
    const rec = recorder.current;
    if (rec && rec.state === 'recording') { rec.onstop = null; rec.stop(); }
    stream.current?.getTracks().forEach(t => t.stop());
    start();
  }
  function remember(id) { currentJobId.current = id; setJobId(id);try{sessionStorage.setItem(pendingKey,id);}catch{} }
  async function request(options, endpoint='/api/pronunciation-assess') {
    const abort=new AbortController();controller.current=abort;
    const timeout=setTimeout(()=>abort.abort(),20000);
    try { const response=await fetch(endpoint,{...options,signal:abort.signal});const data=await response.json();if(!response.ok){const e=Error(data.error||t('Yêu cầu thất bại'));e.http=response.status;throw e;}return data; }
    finally {clearTimeout(timeout);}
  }
  async function poll(id) {
    const deadline=Date.now()+6*60*1000;
    while(live.current&&currentJobId.current===id&&Date.now()<deadline) {
      try {
        const data=await request({},'/api/pronunciation-assess?jobId='+id);
        if(!live.current||currentJobId.current!==id)return;
        if(data.status==='completed') {setResult(validateAssessment(data.result));setNotice('');setState('ready');return;}
        if(data.status==='failed') {setError(data.error);setNotice('');setState('ready');return;}
        setNotice(data.status==='retrying'||data.attempt>1?t('Gemini phản hồi chậm. Server đang thử lại, không cần gửi thêm.'):t('Server đã lưu bản ghi. Đang chờ Gemini đánh giá…'));
      } catch(e) {
        if(!live.current||currentJobId.current!==id)return;
        if(!e.http && e.message.startsWith('Kết quả phát âm')) {setError(e.message);setNotice('');setState('ready');return;}
        if(e.http&&e.http!==429&&e.http<500) {setError(e.message);setNotice('');setState('ready');if(e.http===404){currentJobId.current=null;setJobId(null);try{sessionStorage.removeItem(pendingKey);}catch{}}return;}
        setNotice(t('Kết nối gián đoạn. Đang nối lại để nhận kết quả; không gửi lại audio.'));
      }
      await new Promise(r=>setTimeout(r,3000));
    }
    if(live.current&&currentJobId.current===id){setNotice(t('Bản ghi đã lưu. Bấm Kiểm tra kết quả để nối lại.'));setState('ready');}
  }
  async function assess(retry=false, recordedClip=null) {
    if(!recordedClip&&state==='sending')return;
    if(recordedClip) { currentJobId.current=null; setJobId(null); try{sessionStorage.removeItem(pendingKey);}catch{} }
    const activeJobId = recordedClip ? null : currentJobId.current;
    setState('sending');setError('');setResult(null);setNotice(activeJobId?t('Đang nối lại bản ghi đã lưu…'):t('Đang gửi bản ghi lên server…'));
    try {
      if(activeJobId&&!retry){await poll(activeJobId);return;}
      let options;
      if(activeJobId) options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:activeJobId,retry:true,targetLang})};
      else {const audio=recordedClip || clip?.blob;if(!audio)throw Error(t('Chưa có bản ghi để đánh giá.'));const form=new FormData();form.set('targetLang',targetLang);form.set('word',activeTargetText);form.set('ipa',activeTargetIpa||'');form.set('file',audio,'pronunciation.wav');options={method:'POST',body:form};}
      const data=await request(options);
      if(!live.current)return;
      if(data.result){if(data.jobId)remember(data.jobId);setResult(validateAssessment(data.result));setNotice('');setState('ready');return;}
      if(!data.jobId)throw Error(t('Server chưa xác nhận lưu bản ghi. Thử gửi lại.'));
      remember(data.jobId);await poll(data.jobId);
    } catch(e) {if(live.current){setError(e.http || e.message.startsWith('Kết quả phát âm')?e.message:t('Chưa nhận xác nhận từ server. Bản ghi còn đây; gửi lại sẽ tự nhận diện, không tạo đánh giá trùng.'));setNotice('');setState('ready');}}
  }
  const busy = ['permission', 'encoding', 'sending'].includes(state);
  return (
    <section data-testid="pronunciation-recorder" aria-label="Luyện phát âm" className="relative mt-4 rounded-2xl border border-slate-700/60 bg-[#121421] p-5 text-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-300">Luyện phát âm</h3>
        </div>
        <MouthGuide ipa={ipa} />
      </div>

      {/* 1. Header: Vòng tròn điểm số / trạng thái */}
      <div className="mt-5 flex justify-center">
        <CoachScoreCircle score={result?.score} />
      </div>

      <PronunciationCelebration result={result} />

      {/* 2. Từ cần đọc & Phiên âm ở trên nút ghi âm */}
      <div className="mt-6 flex flex-col items-center text-center">
        {targetType !== 'word' && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sky-600/40 bg-sky-950/60 px-3 py-1 text-xs font-semibold text-sky-200">
            <span>{targetType === 'collocation' ? '🔗 Đang luyện Collocation' : '📝 Đang luyện Câu'}</span>
            <button
              type="button"
              onClick={() => { setTargetType('word'); setResult(null); setError(''); }}
              className="ml-1 text-sky-300 hover:text-white underline text-[11px]"
            >
              Luyện lại từ gốc: {word}
            </button>
          </div>
        )}
        {Array.isArray(result?.segments) && result.segments.length > 0 ? (
          <div className="text-3xl font-bold tracking-tight text-white">
            {result.segments.map((s, i) => {
              const isSingleWord = !activeTargetText.includes(' ') && !/^[A-Z0-9]+$/.test(activeTargetText.trim());
              const text = isSingleWord ? s.text.toLowerCase() : s.text;
              return (
                <span
                  key={i}
                  className={s.status === 'wrong' ? 'text-rose-500 font-extrabold underline decoration-rose-500 decoration-2' : s.status === 'correct' ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}
                >
                  {text}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {normalizeDisplayWord(activeTargetText)}
          </div>
        )}

        {activeTargetIpa && (
          <div className="mt-2 font-mono text-sm tracking-wide text-slate-400">
            {activeTargetIpa}
          </div>
        )}
      </div>

      {result?.heard?.trim() && result.heard.trim().toLowerCase() !== activeTargetText.trim().toLowerCase() && (
        <div data-testid="pronunciation-heard" className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-center text-sm break-words">
          <p className="text-slate-400">Bạn đọc nghe như: <strong className="text-amber-300">{normalizeDisplayWord(result.heard)}</strong></p>
          <p className="mt-0.5 text-slate-400">Nội dung cần đọc: <strong className="text-emerald-400">{normalizeDisplayWord(activeTargetText)}</strong></p>
        </div>
      )}

      {/* Advanced Practice Section (>90 score) */}
      {result?.score > 90 && (
        <div data-testid="advanced-pronunciation-practice" className="mt-6 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/40 to-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <h4 className="font-semibold text-emerald-300">Luyện nâng cao sau điểm &gt; 90</h4>
            </div>
            {targetType !== 'word' && (
              <button
                type="button"
                onClick={() => { setTargetType('word'); setResult(null); setError(''); }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Luyện lại từ gốc: {word}
              </button>
            )}
          </div>

          {practiceLoading && !practiceData ? (
            <div className="mt-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-300" />
              Đang chuẩn bị collocation và câu ví dụ…
            </div>
          ) : practiceData ? (
            <div className="mt-3 space-y-3">
              {practiceData.collocation?.phrase && (
                <div className="rounded-xl border border-teal-800/60 bg-teal-950/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-teal-400">1. Collocation</div>
                      <div className="mt-1 text-base font-bold text-teal-100">{practiceData.collocation.phrase}</div>
                      <div className="text-xs text-teal-200/80">{practiceData.collocation.meaning}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTargetType('collocation'); setResult(null); setError(''); }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${targetType === 'collocation' ? 'bg-teal-600 text-white' : 'bg-teal-900/60 text-teal-200 hover:bg-teal-800'}`}
                    >
                      Luyện collocation
                    </button>
                  </div>
                </div>
              )}

              {practiceData.sentence?.text && (
                <div className="rounded-xl border border-sky-800/60 bg-sky-950/30 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">2. Câu chứa từ và collocation</div>
                      <div className="mt-1 text-sm font-medium text-sky-100 leading-relaxed">{practiceData.sentence.text}</div>
                      <div className="text-xs text-sky-200/80 mt-0.5">{practiceData.sentence.meaning}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTargetType('sentence'); setResult(null); setError(''); }}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${targetType === 'sentence' ? 'bg-sky-600 text-white' : 'bg-sky-900/60 text-sky-200 hover:bg-sky-800'}`}
                    >
                      Luyện câu
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* 3. Nhận xét đánh giá dạng Coach bubble nếu có */}
      {result && (
        <div className="mt-6 flex flex-col items-center">
          <div className="relative rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-medium text-amber-200 shadow-sm max-w-sm">
            {result.summary || (result.score >= 80 ? 'Xuất sắc!' : 'Cần chú ý nguyên âm / phụ âm')}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-amber-500/30" />
          </div>
          <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-base shadow">
            🧑‍🏫
          </div>
        </div>
      )}

      {/* 4. Nút ghi âm */}
      <div className="mt-6 flex flex-col items-center">
        {state === 'recording' ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium text-amber-300">
              Nhấn để dừng
            </span>
            <div className="relative">
            <button
              type="button"
              onClick={() => recorder.current?.stop()}
              aria-label="Dừng ghi âm và gửi AI đánh giá"
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xl shadow-orange-500/25 ring-4 ring-orange-400/30 active:scale-95 transition-all"
            >
              <div className="flex items-center justify-center gap-1.5 h-8">
                <span className="w-1 rounded-full bg-white wave-bar wave-1" />
                <span className="w-1 rounded-full bg-white wave-bar wave-2" />
                <span className="w-1 rounded-full bg-white wave-bar wave-3" />
                <span className="w-1 rounded-full bg-white wave-bar wave-2" />
                <span className="w-1 rounded-full bg-white wave-bar wave-1" />
              </div>
            </button>
            <button type="button" onClick={restartRecording} aria-label="Ghi âm lại" title="Ghi âm lại" className="absolute left-full top-1/2 ml-5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-700 text-xl text-white transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">↻</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={start}
              aria-label="Bắt đầu ghi âm"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 fill-current">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6zm5 8v3h2v-3h-2z" />
              </svg>
            </button>
          </div>
        )}

        <p className="mt-2 text-center text-xs text-slate-400">
          {state === 'recording'
            ? 'Đang lắng nghe bạn nói…'
            : busy
            ? 'Đang phân tích phát âm…'
            : !result
            ? 'Bấm mic để bắt đầu nói'
            : 'Bấm mic để nói lại'}
        </p>

        {(clip || jobId) && error && (
          <button
            type="button"
            disabled={busy || state === 'recording'}
            onClick={() => assess(!!error && !!jobId)}
            className="mt-3 min-h-11 rounded-lg bg-sky-700 px-3 py-2 text-white disabled:opacity-50"
          >
            {jobId ? 'Thử đánh giá lại' : 'Gửi đánh giá'}
          </button>
        )}
      </div>

      {/* 5. Audio & Chi tiết tips (thu gọn) */}
      {clip && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <audio aria-label="Nghe lại bản ghi" controls src={clip.url} className="w-full h-9 min-w-0" />
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-center text-xs text-amber-200">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-center text-xs text-red-300">{error}</p>}

      {result?.tips && result.tips.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-400 mb-1">Mẹo cải thiện:</p>
          <ul className="list-disc pl-4 space-y-1">
            {result.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .wave-bar {
          transform-origin: center;
          animation: natural-wave 1.2s ease-in-out infinite alternate;
        }
        .wave-1 { height: 12px; animation-delay: 0s; }
        .wave-2 { height: 22px; animation-delay: 0.2s; }
        .wave-3 { height: 30px; animation-delay: 0.4s; }
        @keyframes natural-wave {
          0% { transform: scaleY(0.35); opacity: 0.7; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wave-bar { animation: none; }
        }
      `}</style>
    </section>
  );
}
