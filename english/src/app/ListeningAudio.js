'use client';
import ListeningPlayback from './ListeningPlayback';
import { useEffect,useRef,useState } from 'react';
import { transcriptParagraph } from '../lib/transcript-paragraph.mjs';
import { fetchWithRetry,parseApiResponse,formatErrorMessage } from './fetch-helper';
const formatTime=seconds=>Number.isFinite(seconds)&&seconds>=0?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'--:--';
export default function ListeningAudio({onContextChange,historyEntry,clickableText=text=>text}){
 const [url,setUrl]=useState(''),[name,setName]=useState(''),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[stage,setStage]=useState(''),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[repeat,setRepeat]=useState(false),[speed,setSpeed]=useState(.8),[duration,setDuration]=useState(0);
 const [paragraphView,setParagraphView]=useState(false);
 const audio=useRef(null),objectUrl=useRef(''),version=useRef(0),panel=useRef(null),fileInput=useRef(null);
 useEffect(()=>{let dead=false;(async()=>{try{const d=historyEntry?{session:{listening:historyEntry.lesson}}:await parseApiResponse(await fetch('/api/session?type=listening',{cache:'no-store'}));const saved=d.session?.listening;if(!dead&&saved?.result&&saved?.audio){setResult(saved.result);setName(saved.audio.name);setUrl('/api/listening-audio/file'+(historyEntry?'?history='+encodeURIComponent(historyEntry.id):''));}}catch{}})();return()=>{dead=true;version.current++;URL.revokeObjectURL(objectUrl.current);};},[]);
 const active=result?.timed ? result.segments.findIndex(s=>time>=s.start&&time<s.end): -1;
 useEffect(()=>{if(paragraphView)return;const p=panel.current,line=p?.querySelector('[aria-current="true"]');if(p&&line)p.scrollTo({top:p.scrollTop+line.getBoundingClientRect().top-p.getBoundingClientRect().top-p.clientHeight/2+line.clientHeight/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[active,paragraphView]);
 useEffect(()=>{onContextChange?.({source:'audio',name,transcript:result,activeSegment:active>=0?result.segments[active]:null});},[result,name,active,onContextChange]);
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
 return <section className="space-y-4"><input ref={fileInput} type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav" className="hidden" onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/><button disabled={busy} onClick={()=>fileInput.current.click()} className="min-h-48 w-full rounded-2xl border-2 border-dashed border-teal-700 bg-teal-950/20 p-6 text-center disabled:opacity-50"><span className="block text-lg font-semibold text-teal-200">Thêm file nghe</span><span className="mt-2 block text-sm text-slate-400">MP3, M4A, WAV · 25 MB · 15 phút<br/>Phát file gốc, transcript Anh–Việt</span></button>
 {busy&&<p role="status" className="text-sm text-teal-200">{stage}</p>}{error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
 {result&&!result.timed&&<p className="text-xs text-slate-400">Gemini trả transcript không có timestamp; vẫn phát/tua file gốc, không đồng bộ từng đoạn.</p>}
 <ListeningPlayback onDuration={d=>{if(Number.isFinite(d)&&d>0)setDuration(d);}} sentences={result?.segments||[]} index={active} ready={url&&result?.timed?result.segments.length:0} paragraphView={paragraphView} setParagraphView={setParagraphView} lyricsRef={panel} clickableText={clickableText} selectSentence={i=>{const t=result.segments[i].start;audio.current.currentTime=t;setTime(t);}} audio={audio} audioUrl={url} repeat={repeat} setRepeat={setRepeat} speed={speed} setSpeed={setSpeed} total={duration} elapsed={time} seek={t=>{audio.current.currentTime=t;setTime(t);}} updateTime={()=>setTime(audio.current.currentTime)} playing={playing} setPlaying={setPlaying} setError={setError} title={name}>
 <details className="border-t border-white/5 pt-3 text-sm text-slate-400"><summary className="cursor-pointer text-center">Tải file & thông tin</summary><a href={url} download={name} className="mt-3 inline-flex min-h-11 items-center text-teal-200">Tải file audio gốc</a></details>
 </ListeningPlayback>
 <p className="text-xs text-slate-500">Timestamp từ nhận dạng lời nói theo đoạn, không đảm bảo từng câu. Transcript có thể sai khi audio nhiễu. File và transcript lưu trong lịch sử 7 ngày theo tài khoản.</p></section>;
}
