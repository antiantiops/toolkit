'use client';
// Lucian UX/UI Prompt #007 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#007
import { useMemo } from 'react';
const fmt=s=>Number.isFinite(s)&&s>=0?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'--:--';
export default function LucianAudioPlayer({ audio, src, name, time, duration, playing, speed, repeat, onToggle, onSeek, onSpeed, onRepeat, onPlaying, onDuration }) {
 const bars=useMemo(()=>Array.from({length:44},(_,i)=>({h:Math.min(100,30+Math.abs(Math.sin(i*.9)*46+Math.sin(i*.37)*24)),d:(i%7)/7})),[]);
 const pct=duration?Math.max(0,Math.min(1,time/duration)):0;
 const seek=e=>{const r=e.currentTarget.getBoundingClientRect();onSeek(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*duration);};
 return <div className={`ux u007 u007-live ${playing?'is-play':''}`} style={{'--p':pct}}>
  <div className="u007-info"><b>{name||'Bài nghe'}</b><span>Chạm waveform để tua · transcript tự theo audio</span></div>
  <div className="u007-disc"><svg className="u007-ring" viewBox="0 0 160 160" aria-hidden="true"><defs><linearGradient id="u007-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B6CFF"/><stop offset="1" stopColor="#FF6B8B"/></linearGradient></defs><circle className="u007-track" cx="80" cy="80" r="72"/><circle className="u007-arc" cx="80" cy="80" r="72"/></svg><span className="u007-pulse" aria-hidden="true"/><button className="u007-btn" type="button" aria-label={playing?'Tạm dừng':'Phát audio'} aria-pressed={playing} onClick={onToggle}><svg viewBox="0 0 40 40" aria-hidden="true">{playing?<><rect x="11" y="9" width="6" height="22" rx="1"/><rect x="23" y="9" width="6" height="22" rx="1"/></>:<polygon points="13,8 32,20 13,32"/>}</svg></button></div>
  <div className="u007-wave" role="slider" tabIndex={0} aria-label="Vị trí audio" aria-valuemin="0" aria-valuemax={duration||0} aria-valuenow={time} aria-valuetext={fmt(time)} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);seek(e);}} onPointerMove={e=>e.currentTarget.hasPointerCapture(e.pointerId)&&seek(e)} onPointerUp={e=>e.currentTarget.releasePointerCapture?.(e.pointerId)} onKeyDown={e=>{const d={ArrowRight:5,ArrowUp:5,ArrowLeft:-5,ArrowDown:-5,Home:-duration,End:duration}[e.key];if(d!==undefined){e.preventDefault();onSeek(Math.max(0,Math.min(duration,time+d)));}}}>{bars.map((b,i)=><i key={i} className={i<Math.round(pct*bars.length)?'on':''} style={{'--h':b.h,'--d':b.d}}/>)}</div>
  <div className="u007-time"><b>{fmt(time)}</b><span>{fmt(duration)}</span></div>
  <div className="u007-controls"><select aria-label="Tốc độ phát" value={speed} onChange={e=>onSpeed(+e.target.value)}>{[.6,.8,1,1.2].map(x=><option key={x} value={x}>{x}×</option>)}</select><button type="button" aria-pressed={repeat} onClick={onRepeat}>↻ Lặp {repeat?'bật':'tắt'}</button></div>
  <audio ref={audio} src={src} loop={repeat} onLoadedMetadata={()=>{if(audio.current){audio.current.playbackRate=speed;const d=audio.current.duration;if(Number.isFinite(d)&&d>0)onDuration(d);}}} onTimeUpdate={()=>audio.current&&onSeek(audio.current.currentTime)} onPlay={()=>onPlaying(true)} onPause={()=>onPlaying(false)} onEnded={()=>onPlaying(false)} />
 </div>;
}
