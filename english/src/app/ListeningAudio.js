'use client';
import { useEffect,useRef,useState } from 'react';
import { fetchWithRetry,parseApiResponse,formatErrorMessage } from './fetch-helper';
import LucianAudioPlayer from './LucianAudioPlayer';
import LucianAudioUpload from './LucianAudioUpload';
import './lucian.css';
const formatTime=seconds=>Number.isFinite(seconds)&&seconds>=0?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'--:--';
export default function ListeningAudio(){
 const [url,setUrl]=useState(''),[name,setName]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState(''),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[repeat,setRepeat]=useState(false),[speed,setSpeed]=useState(.8),[duration,setDuration]=useState(0);
 const audio=useRef(null),objectUrl=useRef(''),version=useRef(0),panel=useRef(null),fileInput=useRef(null);
 useEffect(()=>{let dead=false;(async()=>{try{const d=await parseApiResponse(await fetch('/api/session?type=listening',{cache:'no-store'}));const saved=d.session?.listening;if(!dead&&saved?.result&&saved?.audio){setResult(saved.result);setName(saved.audio.name);setUrl('/api/listening-audio/file');}}catch{}})();return()=>{dead=true;version.current++;URL.revokeObjectURL(objectUrl.current);};},[]);
 const active=result?.timed ? result.segments.findIndex(s=>time>=s.start&&time<s.end): -1;
 useEffect(()=>{const p=panel.current,line=p?.querySelector('[aria-current="true"]');if(p&&line)p.scrollTo({top:p.scrollTop+line.getBoundingClientRect().top-p.getBoundingClientRect().top-p.clientHeight/2+line.clientHeight/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[active]);
 const choose=async file=>{
  if(!file)return;if(!/\.(mp3|m4a|wav)$/i.test(file.name)||!file.size||file.size>25*1024*1024){setError('Chọn MP3, M4A hoặc WAV tối đa 25 MB');return;}
  const token=++version.current;audio.current?.pause();URL.revokeObjectURL(objectUrl.current);objectUrl.current=URL.createObjectURL(file);setUrl(objectUrl.current);setName(file.name);setResult(null);setTime(0);setDuration(0);setBusy(true);setError('');setStage('Đang upload…');
  try{
   const seconds=await new Promise((resolve,reject)=>{const probe=new Audio(objectUrl.current);const timer=setTimeout(()=>reject(new Error('Không đọc được thời lượng audio')),10000);probe.onloadedmetadata=()=>{clearTimeout(timer);const d=probe.duration;probe.removeAttribute('src');probe.load();resolve(d);};probe.onerror=()=>{clearTimeout(timer);reject(new Error('Audio không đọc được'));};});
   if(!Number.isFinite(seconds)||seconds>900)throw new Error('Audio tối đa 15 phút');setDuration(seconds);
   const body=new FormData();body.set('file',file);const started=await parseApiResponse(await fetchWithRetry('/api/listening-audio',{method:'POST',body,timeout:60000},0));
   const deadline=Date.now()+10*60*1000;
   while(token===version.current&&Date.now()<deadline){let response;try{response=await fetchWithRetry('/api/listening-audio?jobId='+started.jobId,{cache:'no-store',timeout:15000},2);}catch(e){if(token!==version.current)return;setStage('Mất kết nối tạm thời. Đang kết nối lại để lấy transcript…');await new Promise(r=>setTimeout(r,5000));continue;}if(token!==version.current)return;const job=await parseApiResponse(response);if(job.status==='failed')throw new Error(job.error);if(job.status==='completed'){setResult(job.result);return;}setStage(job.stage==='translate'?'Đang dịch transcript…':'Đang nhận dạng lời nói…');await new Promise(r=>setTimeout(r,3000));}
   if(token===version.current)throw new Error('Xử lý quá lâu. Chọn file để thử lại.');
  }catch(e){if(token===version.current)setError(formatErrorMessage(e));}finally{if(token===version.current)setBusy(false);}
 };
 return <section className="space-y-4"><LucianAudioUpload onFile={choose} busy={busy} stage={stage} error={error} cachedName={!busy&&url&&!objectUrl.current?name:''}/>
 {busy&&<p role="status" className="text-sm text-teal-200">{stage}</p>}{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
 {result&&!result.timed&&<p className="text-xs text-slate-400">Gemini trả transcript không có timestamp; vẫn phát/tua file gốc, không đồng bộ từng đoạn.</p>}
 {result&&<div ref={panel} className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4">{result.segments.map((s,i)=><button key={i} disabled={!result.timed} aria-current={active===i?'true':undefined} onClick={()=>{audio.current.currentTime=s.start;setTime(s.start);}} className={`block w-full rounded-xl p-3 text-left ${active===i?'bg-teal-500/10 text-teal-100':'text-slate-400'}`}>{s.speaker&&<span className="mb-1 block text-xs font-semibold text-teal-300">{s.speaker}</span>}<span className="block text-lg">{s.en}</span><span className="mt-1 block text-sm text-slate-400">{s.vi}</span></button>)}</div>}
 {url&&<LucianAudioPlayer audio={audio} src={url} name={name} time={time} duration={duration} playing={playing} speed={speed} repeat={repeat} onToggle={()=>{if(audio.current?.paused)audio.current.play().catch(e=>setError(e.message));else audio.current?.pause();}} onSeek={value=>{if(audio.current){audio.current.currentTime=value;setTime(value);}}} onSpeed={value=>{setSpeed(value);if(audio.current)audio.current.playbackRate=value;}} onRepeat={()=>setRepeat(value=>!value)} onPlaying={setPlaying} onDuration={setDuration}/>}
 <p className="text-xs text-slate-500">Timestamp từ nhận dạng lời nói theo đoạn, không đảm bảo từng câu. Transcript có thể sai khi audio nhiễu. File và transcript được giữ tối đa 24 giờ cho trình duyệt này; reload sẽ khôi phục. Sau đó tự xóa.</p></section>;
}
