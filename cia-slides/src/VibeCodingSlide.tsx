import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {User,Bot,RotateCcw} from 'lucide-react';
import './vibe-coding.css';

type Stage='intro'|'chat-human'|'chat-ai'|'coding'|'result';
const CODE_LINES=['<!doctype html>','<div class="app">','  <header>Vocab · Grammar · Listening</header>','  <main id="daily-deck"></main>','</div>','<script type="module" src="./app.js"></script>'];

export function VibeCodingSlide({english=false}:{english?:boolean}){
 const[revealed,setRevealed]=useState(false);
 const[stage,setStage]=useState<Stage>('intro');
 const[stageIndex,setStageIndex]=useState(0);
 const[codeLines,setCodeLines]=useState<string[]>([]);
 const[introLeaving,setIntroLeaving]=useState(false);
 const transitionRef=useRef<ReturnType<typeof document.startViewTransition>|null>(null);
 const timersRef=useRef<number[]>([]);
 const clearTimers=()=>{ timersRef.current.forEach(t=>clearTimeout(t)); timersRef.current=[]; };
 useEffect(()=>()=>{ clearTimers(); transitionRef.current?.skipTransition(); document.documentElement.classList.remove('vibe-reveal-morph'); },[]);

 const startSequence=()=>{
  clearTimers(); setStage('intro'); setStageIndex(0); setCodeLines([]); setIntroLeaving(false);
  const sched=(fn:()=>void,ms:number)=>{ timersRef.current.push(window.setTimeout(fn,ms)); };
  sched(()=>setIntroLeaving(true),6000);
  sched(()=>{ setStage('chat-human'); setStageIndex(1); },6400);
  sched(()=>{ setStage('chat-ai'); setStageIndex(2); },11400);
  sched(()=>{
   setStage('coding');
   setStageIndex(3);
   if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    setCodeLines([...CODE_LINES]);
   }else{
    CODE_LINES.forEach((l,i)=>sched(()=>setCodeLines(p=>[...p,l]),i*900+300));
   }
  },14400);
  sched(()=>{ setStage('result'); setStageIndex(4); },20400);
 };

 const reveal=(v:boolean)=>{
  if(transitionRef.current)return;
  clearTimers();
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){ setRevealed(v); if(v)startSequence(); return; }
  document.documentElement.classList.add('vibe-reveal-morph');
  const tr=document.startViewTransition(()=>flushSync(()=>setRevealed(v)));
  transitionRef.current=tr;
  tr.finished.catch(()=>{}).finally(()=>{ transitionRef.current=null; document.documentElement.classList.remove('vibe-reveal-morph'); if(v)startSequence(); });
 };

 const t=(vi:string,en:string)=>english?en:vi;

 return (
  <main className={`vibe-slide ${revealed?'is-decoded':''}`}>
   <div className="vibe-heading">
    <span className="slide-kicker">{t('TỪ VẤN ĐỀ HỌC TẬP ĐẾN WEBSITE HỮU ÍCH','FROM A LEARNING PROBLEM TO A USEFUL WEBSITE')}</span>
    <h1>{t('Quá bận để tự viết code.','I’m too busy to build it.')} <em>{t('AI có thể giúp không?','Can AI help?')}</em></h1>
   </div>
   <div className="vibe-content">
    <figure className="vibe-cinema">
     <div className="vibe-film-label"><span>01 / {t('QUAN SÁT','OBSERVE')}</span><span>CLAUDE × DEVELOPER</span></div>
     <video controls playsInline preload="metadata" aria-label={t('Video meme Claude và developer','Claude and developer meme')} src="/media/claude-developer.mp4"/>
     <figcaption>{t('Meme minh họa · Không phải demo lập trình thật','Meme illustration · Not a real coding demo')}</figcaption>
    </figure>
    <section className="vibe-explanation" aria-live="polite">
     {!revealed ? (
      <>
       <span className="vibe-chapter">02 / {t('ĐOÁN THỬ','YOUR GUESS')}</span>
       <p className="vibe-hook">{t('Tôi cần cách học tốt hơn.','I need a better way to learn.')}<br/><strong>{t('Nhưng không có thời gian tự code.','But I don’t have time to code.')}</strong></p>
       <p className="vibe-prompt">{t('AI có thể giúp tôi tạo website học riêng không?','Can AI help me build my own learning website?')}</p>
       <button onClick={()=>reveal(true)}>{t('Vibe coding hoạt động thế nào','How vibe coding works')} <span aria-hidden="true">↗</span></button>
      </>
     ) : (
      <div className="vibe-stage-container" data-vibe-stage={stage}>
       <div className="vibe-stage-header">
        <span className="vibe-chapter">02 / {t('GIẢI MÃ','THE REVEAL')}</span>
        <div className="vibe-stage-dots" aria-hidden="true">{['intro','chat-human','chat-ai','coding','result'].map((s,i)=><span key={s} className={`vibe-dot ${i<=stageIndex?'active':''}`}/>)}</div>
       </div>
       <div className="vibe-stage-body">
        {stage==='intro'&&(
         <div className={`vibe-scene vibe-scene-intro ${introLeaving?'is-leaving':''}`}>
          <h2 className="vibe-hook">Vibe Coding</h2>
          <p className="vibe-ipa" aria-label="Pronunciation">/vaɪb ˈkoʊdɪŋ/</p>
          <p className="vibe-definition">{t('Mô tả điều bạn cần. AI giúp viết code.','Describe what you need. AI helps write the code.')}</p>
         </div>
        )}
        {(stage==='chat-human'||stage==='chat-ai')&&(
         <div className="vibe-scene vibe-scene-chat">
          <div className="vibe-chat-bubble human"><div className="vibe-chat-sender"><User size={14}/><span>{t('Bạn (Human)','Human')}</span></div><p className="vibe-chat-text">{t('Tạo website học tiếng Anh: từ vựng, ngữ pháp và nghe.','Build an English-learning website for vocabulary, grammar, and listening.')}</p></div>
          {stage==='chat-ai'&&<div className="vibe-chat-bubble ai"><div className="vibe-chat-sender"><Bot size={14}/><span>Claude / AI</span></div><p className="vibe-chat-text">{t('Tôi sẽ tạo bản đầu tiên để bạn dùng thử.','I’ll build a first version for you to try.')}</p></div>}
         </div>
        )}
        {stage==='coding'&&(
         <div className="vibe-scene vibe-scene-coding">
          <div className="vibe-coding-header"><div className="vibe-coding-status"><span className="vibe-coding-pulse"/><span>{t('AI đang viết code…','AI is writing code…')}</span></div><span className="vibe-coding-badge">HTML / JS</span></div>
          <pre className="vibe-terminal" tabIndex={0}><code>{codeLines.join('\n')}{'\n'}<span className="vibe-cursor">▍</span></code></pre>
          <figcaption className="vibe-coding-caption">{t('Minh họa · không phải code trực tiếp','Illustration · not live coding')}</figcaption>
         </div>
        )}
        {stage==='result'&&(
         <div className="vibe-scene vibe-scene-result">
          <div className="vibe-result-header"><span className="vibe-result-title">English</span><span className="vibe-result-tag">{t('Từ nhu cầu thành website.','Your idea, now a website.')}</span></div>
          <div className="vibe-result-frame"><img src="/english-home-light.png" alt={t('Giao diện website học tiếng Anh','English learning website app preview')} loading="eager"/></div>
          <p className="vibe-result-caption">{t('Dùng thử. Đánh giá. Yêu cầu sửa đổi.','Try it. Review it. Ask for changes.')}</p>
         </div>
        )}
       </div>
       <div className="vibe-footer-actions">
        <div className="vibe-action-row">
         <button className="vibe-replay-btn" onClick={startSequence} title={t('Chạy lại hoạt ảnh','Replay animation')}><RotateCcw size={14}/> {t('Xem lại hoạt ảnh','Replay')}</button>
         <button className="vibe-reset" onClick={()=>reveal(false)}>{t('Trở lại câu hỏi','Back to question')}</button>
        </div>
        <p className="story-bridge"><b>{t('Xem sản phẩm đã làm →','Let’s see what we built →')}</b></p>
       </div>
      </div>
     )}
    </section>
   </div>
  </main>
 );
}
