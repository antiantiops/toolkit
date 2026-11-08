"use client";
import { useEffect, useRef, useState } from 'react';
import MouthGuide from './MouthGuide';

function ScoreGauge({ score }) {
  if (!Number.isInteger(score)) return null;
  return <div className="relative h-24 w-40" aria-label={`Điểm phát âm ${score}%`}><svg viewBox="0 0 120 78" className="h-full w-full overflow-visible"><path d="M 18 64 A 44 44 0 0 1 102 64" fill="none" stroke="#312e5b" strokeWidth="9" strokeLinecap="round"/><path d="M 18 64 A 44 44 0 0 1 102 64" fill="none" stroke={score>=80?'#22c55e':score>=55?'#f97316':'#ef4444'} strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${score} 100`}/></svg><strong className="absolute inset-x-0 top-9 text-center text-2xl tracking-tight text-white">{score}%</strong></div>;
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
  const live = useRef(false), recorder = useRef(null), stream = useRef(null), timer = useRef(null), controller = useRef(null), url = useRef(null);
  useEffect(() => {
    live.current = true;
    let saved;try { saved=sessionStorage.getItem('pronunciation-job:'+word); }catch{}
    if(saved) {setJobId(saved);setState('sending');poll(saved);}

    return () => { live.current = false; clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(t => t.stop()); controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  async function start() {
    setError(''); setResult(null); setNotice(''); setJobId(null); try{sessionStorage.removeItem('pronunciation-job:'+word);}catch{} setState('permission');
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
  function remember(id) { setJobId(id);try{sessionStorage.setItem('pronunciation-job:'+word,id);}catch{} }
  async function request(options, endpoint='/api/pronunciation-assess') {
    const abort=new AbortController();controller.current=abort;
    const timeout=setTimeout(()=>abort.abort(),20000);
    try { const response=await fetch(endpoint,{...options,signal:abort.signal});const data=await response.json();if(!response.ok){const e=Error(data.error||'Yêu cầu thất bại');e.http=response.status;throw e;}return data; }
    finally {clearTimeout(timeout);}
  }
  async function poll(id) {
    const deadline=Date.now()+6*60*1000;
    while(live.current&&Date.now()<deadline) {
      try {
        const data=await request({},'/api/pronunciation-assess?jobId='+id);
        if(!live.current)return;
        if(data.status==='completed') {setResult(data.result);setNotice('');setState('ready');return;}
        if(data.status==='failed') {setError(data.error);setNotice('');setState('ready');return;}
        setNotice(data.status==='retrying'||data.attempt>1?'Gemini phản hồi chậm. Server đang thử lại, không cần gửi thêm.':'Server đã lưu bản ghi. Đang chờ Gemini đánh giá…');
      } catch(e) {
        if(!live.current)return;
        if(e.http&&e.http!==429&&e.http<500) {setError(e.message);setNotice('');setState('ready');if(e.http===404){setJobId(null);try{sessionStorage.removeItem('pronunciation-job:'+word);}catch{}}return;}
        setNotice('Kết nối gián đoạn. Đang nối lại để nhận kết quả; không gửi lại audio.');
      }
      await new Promise(r=>setTimeout(r,3000));
    }
    if(live.current){setNotice('Bản ghi đã lưu. Bấm Kiểm tra kết quả để nối lại.');setState('ready');}
  }
  async function assess(retry=false, recordedClip=null) {
    if(state==='sending')return;
    setState('sending');setError('');setResult(null);setNotice(jobId?'Đang nối lại bản ghi đã lưu…':'Đang gửi bản ghi lên server…');
    try {
      if(jobId&&!retry){await poll(jobId);return;}
      let options;
      if(jobId) options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId,retry:true})};
      else {const audio=recordedClip || clip?.blob;if(!audio)throw Error('Chưa có bản ghi để đánh giá.');const form=new FormData();form.set('word',word);form.set('ipa',ipa||'');form.set('file',audio,'pronunciation.wav');options={method:'POST',body:form};}
      const data=await request(options);
      if(!live.current)return;
      if(data.result){if(data.jobId)remember(data.jobId);setResult(data.result);setNotice('');setState('ready');return;}
      if(!data.jobId)throw Error('Server chưa xác nhận lưu bản ghi. Thử gửi lại.');
      remember(data.jobId);await poll(data.jobId);
    } catch(e) {if(live.current){setError(e.http?e.message:'Chưa nhận xác nhận từ server. Bản ghi còn đây; gửi lại sẽ tự nhận diện, không tạo đánh giá trùng.');setNotice('');setState('ready');}}
  }
  const busy = ['permission', 'encoding', 'sending'].includes(state);
  return <section data-testid="pronunciation-recorder" aria-label="Luyện phát âm" className="mt-4 rounded-xl border border-violet-700/60 bg-violet-950/20 p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-violet-200">Luyện phát âm</h3><MouthGuide ipa={ipa} /></div>
    <p className="mt-1 text-slate-300">Đọc “{word}”. Tối đa 30 giây. Bấm micro để bắt đầu; bấm lần nữa để dừng. Dừng là tự gửi Gemini góp ý.</p>
    <div className="mt-5 flex flex-col items-center">
      <button type="button" disabled={busy} onClick={state === 'recording' ? () => recorder.current?.stop() : start} aria-label={state === 'recording' ? 'Dừng ghi âm và gửi AI đánh giá' : 'Bắt đầu ghi âm'} className={`flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] text-white shadow-[0_8px_24px_rgba(249,115,22,.35)] transition-transform active:scale-95 disabled:opacity-50 ${state === 'recording' ? 'border-rose-200 bg-rose-500 animate-pulse' : 'border-orange-100 bg-gradient-to-br from-rose-500 to-amber-400'}`}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-9 w-9 fill-current">{state==='recording'?<rect x="7" y="7" width="10" height="10" rx="1"/>:<><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H6zm5 8v3h2v-3h-2z"/></>}</svg></button>
      <p className="mt-2 text-xs font-medium text-violet-200">{state === 'recording' ? 'Đang ghi · Bấm để dừng và chấm' : busy ? 'Đang chuẩn bị và gửi AI…' : 'Bấm để ghi âm'}</p>
      {(clip || jobId) && error && <button type="button" disabled={busy || state === 'recording'} onClick={() => assess(!!error && !!jobId)} className="mt-3 min-h-11 rounded-lg bg-sky-700 px-3 py-2 text-white disabled:opacity-50">{jobId ? 'Thử đánh giá lại' : 'Gửi lại đánh giá'}</button>}
    </div>
    <p role="status" className="mt-2 text-slate-300">{state === 'recording' ? 'Đang ghi âm… tự dừng sau 30 giây.' : state === 'permission' ? 'Chờ quyền microphone…' : state === 'encoding' ? 'Đang chuẩn bị bản ghi…' : ''}</p>
    {clip && <audio aria-label="Nghe lại bản ghi" controls src={clip.url} className="mt-2 w-full min-w-0" />}
    {notice && <p role="status" className="mt-2 text-amber-200">{notice}</p>}
    {jobId && <p className="mt-1 break-all text-[10px] text-slate-400">Mã bản ghi: {jobId.slice(0,12)} · lưu 24 giờ</p>}
    {error && <p role="alert" className="mt-2 text-red-300">{error}</p>}
    {result && <div aria-live="polite" className="mt-5 overflow-hidden rounded-2xl border border-violet-500/50 bg-[#15152a] text-slate-100">
      <div className="flex flex-col items-center border-b border-violet-500/25 px-4 pt-4"><ScoreGauge score={result.score}/><p className="-mt-2 pb-3 text-xs font-semibold uppercase tracking-[.18em] text-violet-200">{Number.isInteger(result.score)?'Độ chính xác phát âm':'Góp ý từ AI'}</p></div>
      <div className="flex flex-col items-center gap-3 p-4">
        {Array.isArray(result.segments)&&result.segments.length>0 ? <>
          <div className="flex items-center justify-center gap-2 text-4xl font-bold tracking-wide">
            {result.segments.map((s,i)=><span key={i} className={s.status==='wrong'?'text-rose-500':s.status==='correct'?'text-emerald-500':'text-slate-300'}>{s.text}</span>)}
          </div>
          {ipa && <div className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1 font-mono text-sm tracking-wider text-violet-200">{ipa}</div>}
        </> : <div className="flex flex-wrap items-center gap-2 text-base"><strong>Nghe được:</strong> <span className={result.heard && result.heard.trim().toLowerCase() !== word.trim().toLowerCase() ? 'rounded bg-rose-500/20 px-2 py-0.5 font-semibold text-rose-200 line-through decoration-rose-300' : 'rounded bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-200'}>{result.heard || 'Không rõ'}</span>{result.heard && result.heard.trim().toLowerCase() !== word.trim().toLowerCase() && <><span className="text-slate-500">→</span><span className="rounded bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-200">{word}</span></>}</div>}
        <p className="w-full text-center text-sm leading-relaxed text-slate-200">{result.summary}</p>
        {result.tips.length > 0 && <ul className="w-full space-y-2 border-t border-violet-500/25 pt-3">{result.tips.map((tip, i) => <li key={i} className="rounded-lg bg-amber-500/10 px-3 py-2 text-left text-sm text-amber-100">{tip}</li>)}</ul>}
      </div>
    </div>}
  </section>;
}
