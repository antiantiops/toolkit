"use client";
import TranscriptSwitch from "./TranscriptSwitch";
import {transcriptParagraph} from "../lib/transcript-paragraph.mjs";
import {formatErrorMessage} from "./fetch-helper";
const clock=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}`;
export default function ListeningPlayback({sentences,index,ready,paragraphView,setParagraphView,lyricsRef,clickableText,selectSentence,audio,audioUrl,repeat,setRepeat,speed,setSpeed,total,elapsed,seek,updateTime,playing,setPlaying,setError,title,children,onDuration}) {return <>
      <div className="overflow-hidden rounded-2xl border border-teal-900/60 bg-gradient-to-b from-teal-950/50 to-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4"><div className="text-xs font-semibold uppercase tracking-widest text-teal-300"><span>Transcript</span><span className="mt-1 block text-[10px] text-slate-400">{ready ? `${index + 1} / ${sentences.length}` : audioUrl ? 'Không có timestamp' : 'Chưa có audio'}</span></div><TranscriptSwitch paragraphView={paragraphView} onChange={setParagraphView} /></div>
        {paragraphView?<div data-transcript-paragraph className="max-h-[48dvh] space-y-4 overflow-y-auto px-5 py-4 text-base leading-relaxed sm:px-8"><p className="whitespace-pre-wrap text-slate-100">{clickableText(transcriptParagraph(sentences,'en'))}</p>{sentences.some(s=>s.vi)&&<div className="border-t border-slate-700 pt-3"><h4 className="mb-2 text-xs font-semibold text-teal-300">Bản dịch tiếng Việt</h4><p className="whitespace-pre-wrap text-sm text-slate-300">{transcriptParagraph(sentences,'vi')}</p></div>}</div>:<div ref={lyricsRef} data-testid="listening-lyrics" aria-label="Transcript Listening" className="relative max-h-[48dvh] min-h-64 overflow-y-auto overscroll-contain px-5 py-24 sm:px-8">
          {sentences.map((s, i) => <button key={i} disabled={!ready} data-transcript-line aria-current={ready && i === index ? 'true' : undefined} onClick={() => selectSentence(i)} className={`block w-full py-5 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-100 motion-reduce:transition-none ${ready && i === index ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {s.speaker&&<span className="mb-2 block text-xs font-medium text-teal-400">{s.speaker}</span>}
            <span className="block break-words text-[25px] font-semibold leading-relaxed tracking-tight sm:text-3xl">{s.en}</span>
            <span className={`mt-3 block text-base leading-relaxed ${ready && i === index ? 'text-teal-200' : 'text-slate-600'}`}>{s.vi}</span>
          </button>)}
        </div>
        }
        <p className="px-5 pb-4 text-xs text-slate-400">{paragraphView?'Bấm từ tiếng Anh để tra nghĩa':'Bấm câu để nghe lại · Tự cuộn theo câu đang phát'}</p>
      </div>
      {!!audioUrl && <div data-testid="listening-player" className="sticky bottom-2 z-10 space-y-4 rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-5 shadow-2xl backdrop-blur-xl">
        <audio ref={audio} src={audioUrl} loop={repeat} preload="auto"
          onTimeUpdate={updateTime} onPause={() => setPlaying(false)}
          onLoadedMetadata={() => { audio.current.playbackRate = speed; onDuration?.(audio.current.duration); }}
          onPlay={() => { document.querySelectorAll("audio").forEach(player => { if (player !== audio.current) player.pause(); }); setPlaying(true); if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: 'English Learner' }); }}
          onEnded={() => setPlaying(false)} />
        <div className="space-y-1">
          <input aria-label="Vị trí phát toàn bài" type="range" min="0" max={total} step="0.1" value={Math.min(total, elapsed)} onChange={e => seek(Number(e.target.value))} className="h-6 w-full cursor-pointer accent-teal-300" />
          <div className="flex justify-between text-xs tabular-nums text-slate-400"><span>{clock(elapsed)}</span><span>{clock(total)}</span></div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm text-slate-300"><span className="sr-only">Tốc độ</span><select aria-label="Tốc độ phát" value={speed} onChange={e => { const value = Number(e.target.value); setSpeed(value); audio.current.playbackRate = value; }} className="rounded-full border border-white/10 bg-slate-800 px-2 py-2">{[.6,.7,.8,1,1.2].map(v => <option key={v} value={v}>{v}×</option>)}</select></label>
          <div className="flex items-center gap-3">
            <button aria-label="Câu trước" disabled={!ready || index <= 0} onClick={() => selectSentence(index - 1)} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 disabled:opacity-25"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M6 5h2v14H6zm12 0v14L9 12z"/></svg></button>
            <button aria-label={playing ? 'Tạm dừng' : 'Phát bài nghe'} onClick={() => { if (audio.current.paused) audio.current.play().catch(e => setError(formatErrorMessage(e))); else audio.current.pause(); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-300 text-slate-950 shadow-lg shadow-teal-400/15 hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">{playing ? <path d="M6 4h4v16H6zm8 0h4v16h-4z"/> : <path d="m8 4 13 8-13 8z"/>}</svg></button>
            <button aria-label="Câu tiếp" disabled={!ready || index >= ready - 1} onClick={() => selectSentence(index + 1)} className="flex h-11 w-11 items-center justify-center rounded-full text-slate-200 hover:bg-white/10 disabled:opacity-25"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M16 5h2v14h-2zM6 5l9 7-9 7z"/></svg></button>
          </div>
          <button type="button" aria-label="Lặp lại toàn bài" aria-pressed={repeat} title={repeat ? 'Tắt lặp lại toàn bài' : 'Bật lặp lại toàn bài'} onClick={() => setRepeat(value => !value)} className={`flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${repeat ? 'bg-teal-300/15 text-teal-200' : 'text-slate-400 hover:bg-white/10'}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m17 2 4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4m14-1v2a3 3 0 0 1-3 3H3"/></svg><span>{repeat ? 'Lặp: bật' : 'Lặp: tắt'}</span></button>
        </div>
        {children}

      </div>}

</>;}
