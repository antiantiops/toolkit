import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {User,Bot,RotateCcw,Terminal as TermIcon} from 'lucide-react';
import {RobotHead} from 'robot-heads';
import './vibe-coding.css';

type Stage='intro'|'chat-human'|'chat-ai'|'coding'|'result';
const CODE_LINES=[
 'import React from "react";',
 'export function App() {',
 '  return (',
 '    <div className="learning-deck">',
 '      <Header title="Daily Vocab & Grammar" />',
 '      <AudioPractice src="/audio/lesson-1.mp3" />',
 '    </div>',
 '  );',
 '}'
];
const TERMINAL_LOGS=[
 '$ npm run dev',
 '➜  Local:   http://localhost:3000/',
 '➜  Network: use --host to expose',
 '➜  ready in 240ms.'
];

interface FireworkParticle {
 id: number;
 originX: string;
 originY: string;
 tx: number;
 ty: number;
 color: string;
 size: number;
 isRibbon: boolean;
 delay: number;
}

const FIREWORK_PARTICLES: FireworkParticle[] = Array.from({length: 24}, (_, i) => {
 const isLeft = i < 12;
 const angle = ((i % 12) / 12) * 360;
 const dist = 50 + (i % 3) * 28;
 const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];
 const color = colors[i % colors.length];
 const size = 5 + (i % 3) * 2;
 const rad = (angle * Math.PI) / 180;
 const tx = Math.cos(rad) * dist;
 const ty = Math.sin(rad) * dist;
 return {
  id: i,
  originX: isLeft ? '20%' : '80%',
  originY: '25%',
  tx: Math.round(tx),
  ty: Math.round(ty),
  color,
  size,
  isRibbon: i % 3 === 0,
  delay: (i % 4) * 45
 };
});

export function VibeCodingSlide({english=false}:{english?:boolean}){
 const[revealed,setRevealed]=useState(false);
 const[stage,setStage]=useState<Stage>('intro');
 const[stageIndex,setStageIndex]=useState(0);
 const[codeLines,setCodeLines]=useState<string[]>([]);
 const[terminalLines,setTerminalLines]=useState<string[]>([]);
 const[introLeaving,setIntroLeaving]=useState(false);
 const[chatRobotLeaving,setChatRobotLeaving]=useState(false);
 const[deployReady,setDeployReady]=useState(false);
 const[showMouse,setShowMouse]=useState(false);
 const[mouseClicking,setMouseClicking]=useState(false);
 const[mouseRipple,setMouseRipple]=useState(false);
 const[deployClicked,setDeployClicked]=useState(false);

 const transitionRef=useRef<ReturnType<typeof document.startViewTransition>|null>(null);
 const timersRef=useRef<number[]>([]);
 const clearTimers=()=>{ timersRef.current.forEach(t=>clearTimeout(t)); timersRef.current=[]; };
 const sched=(fn:()=>void,ms:number)=>{ const id=window.setTimeout(fn,ms); timersRef.current.push(id); return id; };

 useEffect(()=>()=>{ clearTimers(); transitionRef.current?.skipTransition(); document.documentElement.classList.remove('vibe-reveal-morph'); },[]);

 const triggerDeployClick=()=>{
  clearTimers();
  setDeployClicked(true);
  setMouseRipple(true);
  setShowMouse(false);
  sched(()=>{ setStage('result'); setStageIndex(4); },280);
 };

 const startSequence=()=>{
  clearTimers();
  setStage('intro');
  setStageIndex(0);
  setCodeLines([]);
  setTerminalLines([]);
  setIntroLeaving(false);
  setChatRobotLeaving(false);
  setDeployReady(false);
  setShowMouse(false);
  setMouseClicking(false);
  setMouseRipple(false);
  setDeployClicked(false);

  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   sched(()=>setIntroLeaving(true),2000);
   sched(()=>{ setStage('chat-human'); setStageIndex(1); },2200);
   sched(()=>{ setStage('chat-ai'); setStageIndex(2); },4000);
   sched(()=>{
    setStage('coding');
    setStageIndex(3);
    setCodeLines([...CODE_LINES]);
    setTerminalLines([...TERMINAL_LOGS]);
    setDeployReady(true);
   },6000);
   sched(()=>{ setStage('result'); setStageIndex(4); },8000);
   return;
  }

  sched(()=>setIntroLeaving(true),6000);
  sched(()=>{ setStage('chat-human'); setStageIndex(1); },6400);
  sched(()=>{ setStage('chat-ai'); setStageIndex(2); },11400);
  sched(()=>setChatRobotLeaving(true),13200);
  sched(()=>{
   setStage('coding');
   setStageIndex(3);
   CODE_LINES.forEach((l,i)=>sched(()=>setCodeLines(p=>[...p,l]),i*420+300));
   TERMINAL_LOGS.forEach((tl,idx)=>sched(()=>setTerminalLines(p=>[...p,tl]),CODE_LINES.length*420+400+idx*400));
  },15000);
  sched(()=>setDeployReady(true),20600);
  sched(()=>setShowMouse(true),21200);
  sched(()=>{
   setMouseClicking(true);
   setMouseRipple(true);
   setDeployClicked(true);
  },22200);
  sched(()=>{ setStage('result'); setStageIndex(4); },22800);
 };

 const reveal=(v:boolean)=>{
  if(transitionRef.current)return;
  clearTimers();
  setChatRobotLeaving(false);
  setDeployReady(false);
  setShowMouse(false);
  setMouseClicking(false);
  setMouseRipple(false);
  setDeployClicked(false);
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
          {stage==='chat-ai'&&(
           <div className="vibe-ai-wrap">
            <div className="vibe-chat-bubble ai"><div className="vibe-chat-sender"><Bot size={14}/><span>Claude / AI</span></div><p className="vibe-chat-text">{t('Tôi sẽ tạo bản đầu tiên để bạn dùng thử.','I’ll build a first version for you to try.')}</p></div>
            <div className={`vibe-ai-robot ${chatRobotLeaving?'is-flying':''}`} aria-hidden="true"><RobotHead state={chatRobotLeaving?'working':'speaking'} size={60} interactive={false} color="#8b5cf6"/></div>
           </div>
          )}
         </div>
        )}
        {stage==='coding'&&(
         <div className="vibe-scene vibe-scene-coding">
          <div className="vibe-vscode-window">
           <div className="vibe-vscode-titlebar">
            <div className="vibe-window-dots" aria-hidden="true"><span className="vibe-wdot dot-red"/><span className="vibe-wdot dot-yellow"/><span className="vibe-wdot dot-green"/></div>
            <div className="vibe-vscode-robot is-entering" aria-hidden="true" title="AI working"><RobotHead state="working" size={24} interactive={false} color="#a78bfa"/></div>
            <div className="vibe-vscode-tabs">
             <div className="vibe-vscode-tab active"><span className="tab-icon ts">TSX</span> App.tsx</div>
             <div className="vibe-vscode-tab"><span className="tab-icon css">#</span> styles.css</div>
            </div>
           </div>
           <div className="vibe-vscode-body">
            <div className="vibe-editor-pane">
             <div className="vibe-line-numbers" aria-hidden="true">{Array.from({length:Math.max(codeLines.length+1,7)},(_,i)=><span key={i}>{i+1}</span>)}</div>
             <pre className="vibe-terminal" tabIndex={0}><code>{codeLines.join('\n')}{'\n'}<span className="vibe-cursor">▍</span></code></pre>
            </div>
            <div className="vibe-vscode-terminal">
             <div className="vibe-vscode-term-header"><TermIcon size={12}/><span>TERMINAL</span><span className="vibe-vscode-term-status">zsh · node</span></div>
             <div className="vibe-vscode-term-body">{terminalLines.map((line,i)=><div key={i} className={`term-line ${line.startsWith('➜')?'term-success':''}`}>{line}</div>)}{terminalLines.length===0&&<span className="term-line term-dim">{t('$ đang khởi động dev server…','$ starting dev server…')}</span>}</div>
            </div>
           </div>
           {deployReady&&(
            <div className={`vibe-deploy-toast ${deployClicked?'is-clicked':''}`} role="status">
             <div className="vibe-deploy-badge">
              <span className="vibe-deploy-icon" aria-hidden="true">🚀</span>
              <div className="vibe-deploy-info">
               <span className="vibe-deploy-title">{t('Deploy thành công!','Deploy successful!')}</span>
               <span className="vibe-deploy-sub">localhost:3000 · {t('sẵn sàng','ready')}</span>
              </div>
              <button type="button" className="vibe-deploy-btn" onClick={triggerDeployClick} aria-label={t('Mở xem sản phẩm','Open preview')}>
               {t('Xem ngay','Preview')} <span aria-hidden="true">↗</span>
              </button>
             </div>
             {mouseRipple&&<span className="vibe-click-ripple" aria-hidden="true"/>}
            </div>
           )}
           {showMouse&&(
            <div className={`vibe-sim-mouse ${mouseClicking?'is-clicking':''}`} aria-hidden="true">
             <svg className="vibe-mouse-cursor" viewBox="0 0 32 40" width="24" height="30">
              <path d="M3 2V30L11 24L17 37L23 34L17 21H29Z" fill="white" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round"/>
             </svg>
            </div>
           )}
          </div>
          <figcaption className="vibe-coding-caption">{t('Minh họa · VS Code mockup tự động sinh mã','Illustration · Auto-generated VS Code mockup')}</figcaption>
         </div>
        )}
        {stage==='result'&&(
         <div className="vibe-scene vibe-scene-result">
          <div className="vibe-fireworks" aria-hidden="true">
           {FIREWORK_PARTICLES.map(p=>(
            <span
             key={p.id}
             className={`vibe-particle ${p.isRibbon?'ribbon':''}`}
             style={{
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.isRibbon?p.size*2.2:p.size}px`,
              animationDelay: `${p.delay}ms`,
              left: p.originX,
              top: p.originY
             } as React.CSSProperties}
            />
           ))}
          </div>
          <div className="vibe-browser-window">
           <div className="vibe-browser-titlebar">
            <div className="vibe-window-dots" aria-hidden="true"><span className="vibe-wdot dot-red"/><span className="vibe-wdot dot-yellow"/><span className="vibe-wdot dot-green"/></div>
            <div className="vibe-browser-addressbar"><span className="vibe-browser-lock">🔒</span><span className="vibe-browser-url">http://localhost:3000</span></div>
            <span className="vibe-browser-tag">{t('Sản phẩm hoàn thiện','Live Preview')}</span>
           </div>
           <div className="vibe-result-frame"><img src="/english-home-light.png" alt={t('Giao diện website học tiếng Anh','English learning website app preview')} loading="eager"/></div>
          </div>
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
