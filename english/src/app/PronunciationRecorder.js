"use client";
import { useEffect, useRef, useState } from 'react';
import MouthGuide from './MouthGuide';

function CoachScoreCircle({ score }) {
  const hasScore = Number.isInteger(score);
  return (
    <div className="flex flex-col items-center justify-center" aria-label={hasScore ? `Điểm phát âm ${score}` : 'Chưa có điểm'}>
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
              strokeDashoffset={2 * Math.PI * 50 * (1 - score / 100)}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {hasScore ? (
            <span className={`text-4xl font-extrabold tracking-tight ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {score}
            </span>
          ) : (
            <div className="flex gap-1.5 text-2xl font-bold text-slate-500">
              <span>-</span>
              <span>-</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {hasScore ? 'Độ chính xác' : 'Hãy nói từ / cụm sau'}
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

export default function PronunciationRecorder({ word, ipa }) {
  const [state, setState] = useState('idle'), [clip, setClip] = useState(null), [result, setResult] = useState(null), [error, setError] = useState(''), [notice,setNotice] = useState(''), [jobId,setJobId] = useState(null);
  const live = useRef(false), recorder = useRef(null), stream = useRef(null), timer = useRef(null), controller = useRef(null), url = useRef(null), currentJobId = useRef(null);
  useEffect(() => {
    live.current = true;
    let saved;try { saved=sessionStorage.getItem('pronunciation-job:'+word); }catch{}
    if(saved) {currentJobId.current=saved;setJobId(saved);setState('sending');poll(saved);}

    return () => { live.current = false; clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  async function start() {
    controller.current?.abort();
    setError(''); setResult(null); setNotice(''); setClip(null); currentJobId.current = null; setJobId(null); try{sessionStorage.removeItem('pronunciation-job:'+word);}catch{} setState('permission');
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
          url.current = URL.createObjectURL(audio); setClip({ blob: audio, url: url.current }); setState('ready'); assess(false, audio);
        } catch (e) { if (live.current) { setError(e.message); setState('idle'); } }
      };
      setClip(null); rec.start(); setState('recording'); timer.current = setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 30000);
    } catch (e) { stream.current?.getTracks().forEach(t => t.stop()); if (live.current) { setError(e.name === 'NotAllowedError' ? 'Microphone bị từ chối. Cho phép microphone trong cài đặt trình duyệt rồi thử lại.' : e.message); setState('idle'); } }
  }
  function remember(id) { currentJobId.current = id; setJobId(id);try{sessionStorage.setItem('pronunciation-job:'+word,id);}catch{} }
  async function request(options, endpoint='/api/pronunciation-assess') {
    const abort=new AbortController();controller.current=abort;
    const timeout=setTimeout(()=>abort.abort(),20000);
    try { const response=await fetch(endpoint,{...options,signal:abort.signal});const data=await response.json();if(!response.ok){const e=Error(data.error||'Yêu cầu thất bại');e.http=response.status;throw e;}return data; }
    finally {clearTimeout(timeout);}
  }
  async function poll(id) {
    const deadline=Date.now()+6*60*1000;
    while(live.current&&currentJobId.current===id&&Date.now()<deadline) {
      try {
        const data=await request({},'/api/pronunciation-assess?jobId='+id);
        if(!live.current||currentJobId.current!==id)return;
        if(data.status==='completed') {setResult(data.result);setNotice('');setState('ready');return;}
        if(data.status==='failed') {setError(data.error);setNotice('');setState('ready');return;}
        setNotice(data.status==='retrying'||data.attempt>1?'Gemini phản hồi chậm. Server đang thử lại, không cần gửi thêm.':'Server đã lưu bản ghi. Đang chờ Gemini đánh giá…');
      } catch(e) {
        if(!live.current||currentJobId.current!==id)return;
        if(e.http&&e.http!==429&&e.http<500) {setError(e.message);setNotice('');setState('ready');if(e.http===404){currentJobId.current=null;setJobId(null);try{sessionStorage.removeItem('pronunciation-job:'+word);}catch{}}return;}
        setNotice('Kết nối gián đoạn. Đang nối lại để nhận kết quả; không gửi lại audio.');
      }
      await new Promise(r=>setTimeout(r,3000));
    }
    if(live.current&&currentJobId.current===id){setNotice('Bản ghi đã lưu. Bấm Kiểm tra kết quả để nối lại.');setState('ready');}
  }
  async function assess(retry=false, recordedClip=null) {
    if(!recordedClip&&state==='sending')return;
    if(recordedClip) { currentJobId.current=null; setJobId(null); try{sessionStorage.removeItem('pronunciation-job:'+word);}catch{} }
    const activeJobId = recordedClip ? null : currentJobId.current;
    setState('sending');setError('');setResult(null);setNotice(activeJobId?'Đang nối lại bản ghi đã lưu…':'Đang gửi bản ghi lên server…');
    try {
      if(activeJobId&&!retry){await poll(activeJobId);return;}
      let options;
      if(activeJobId) options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:activeJobId,retry:true})};
      else {const audio=recordedClip || clip?.blob;if(!audio)throw Error('Chưa có bản ghi để đánh giá.');const form=new FormData();form.set('word',word);form.set('ipa',ipa||'');form.set('file',audio,'pronunciation.wav');options={method:'POST',body:form};}
      const data=await request(options);
      if(!live.current)return;
      if(data.result){if(data.jobId)remember(data.jobId);setResult(data.result);setNotice('');setState('ready');return;}
      if(!data.jobId)throw Error('Server chưa xác nhận lưu bản ghi. Thử gửi lại.');
      remember(data.jobId);await poll(data.jobId);
    } catch(e) {if(live.current){setError(e.http?e.message:'Chưa nhận xác nhận từ server. Bản ghi còn đây; gửi lại sẽ tự nhận diện, không tạo đánh giá trùng.');setNotice('');setState('ready');}}
  }
  const busy = ['permission', 'encoding', 'sending'].includes(state);
  return (
    <section data-testid="pronunciation-recorder" aria-label="Luyện phát âm" className="mt-4 rounded-2xl border border-slate-700/60 bg-[#121421] p-5 text-sm shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Luyện phát âm · The Coach</h3>
        </div>
        <MouthGuide ipa={ipa} />
      </div>

      {/* 1. Header: Vòng tròn điểm số / trạng thái */}
      <div className="mt-5 flex justify-center">
        <CoachScoreCircle score={result?.score} />
      </div>

      {/* 2. Từ cần đọc & Phiên âm ở trên nút ghi âm */}
      <div className="mt-6 flex flex-col items-center text-center">
        {Array.isArray(result?.segments) && result.segments.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-1 text-3xl font-bold tracking-tight text-white">
            {result.segments.map((s, i) => (
              <span
                key={i}
                className={s.status === 'wrong' ? 'text-rose-500 font-extrabold underline decoration-rose-500 decoration-2' : s.status === 'correct' ? 'text-emerald-400 font-extrabold' : 'text-slate-300'}
              >
                {s.text}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-3xl font-extrabold tracking-tight text-white">
            {word}
          </div>
        )}

        {ipa && (
          <div className="mt-2 font-mono text-sm tracking-wide text-slate-400">
            {ipa}
          </div>
        )}
      </div>

      {result?.heard?.trim() && (
        <div data-testid="pronunciation-heard" className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-center text-sm break-words">
          <p className="text-slate-400">Bạn đọc nghe như: <strong className="text-amber-200">{result.heard}</strong></p>
          <p className="mt-1 text-slate-400">Từ cần đọc: <strong className="text-emerald-300">{word}</strong></p>
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

      {/* 4. Nút ghi âm kiểu The Coach */}
      <div className="mt-6 flex flex-col items-center">
        {state === 'recording' ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 animate-pulse">
              Nhấn để dừng
            </span>
            <button
              type="button"
              onClick={() => recorder.current?.stop()}
              aria-label="Dừng ghi âm và gửi AI đánh giá"
              className="flex h-14 w-32 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-4 w-1 rounded-full bg-white animate-[bounce_1s_infinite_100ms]" />
                <span className="h-6 w-1 rounded-full bg-white animate-[bounce_1s_infinite_300ms]" />
                <span className="h-5 w-1 rounded-full bg-white animate-[bounce_1s_infinite_200ms]" />
                <span className="h-3 w-1 rounded-full bg-white animate-[bounce_1s_infinite_400ms]" />
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={start}
              aria-label="Bắt đầu ghi âm"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6zm5 8v3h2v-3h-2z" />
              </svg>
            </button>
            {result && (
              <button
                type="button"
                onClick={start}
                disabled={busy}
                className="h-12 rounded-full bg-sky-600 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-sky-600/30 active:scale-95 disabled:opacity-50"
              >
                Tiếp tục / Đọc lại
              </button>
            )}
          </div>
        )}

        <p className="mt-2 text-center text-xs text-slate-400">
          {state === 'recording'
            ? 'Đang lắng nghe bạn nói…'
            : busy
            ? 'Đang phân tích phát âm…'
            : !result
            ? 'Bấm mic để bắt đầu nói'
            : ''}
        </p>

        {(clip || jobId) && error && (
          <button
            type="button"
            disabled={busy || state === 'recording'}
            onClick={() => assess(!!error && !!jobId)}
            className="mt-3 min-h-11 rounded-lg bg-sky-700 px-3 py-2 text-white disabled:opacity-50"
          >
            {jobId ? 'Thử đánh giá lại' : 'Gửi lại đánh giá'}
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
    </section>
  );
}
