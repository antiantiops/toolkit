import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {RobotHead} from 'robot-heads';
import {ArrowUpRight,BookOpen,Headphones,MessageCircle,PenLine,Sparkles,Volume2,Check,Bookmark,Play,Pause,SkipBack,SkipForward,Repeat,List,Maximize2,X} from 'lucide-react';
import './english-bento.css';

export function EnglishBentoSlide({english=false,active=true}:{english?:boolean;active?:boolean}){
 const t=(vi:string,en:string)=>english?en:vi;
 const coachRef=useRef<HTMLDivElement>(null);
 const [beam,setBeam]=useState({width:230,height:286,points:''});
 useLayoutEffect(()=>{const scene=coachRef.current;if(!scene)return;const measure=()=>{const span=scene.querySelector<HTMLElement>('.coach-email p span'),head=scene.querySelector<HTMLElement>('.coach-mascot');if(!span||!head)return;const pos=(el:HTMLElement)=>{let x=0,y=0;for(let n:HTMLElement|null=el;n&&n!==scene;n=n.offsetParent as HTMLElement|null){x+=n.offsetLeft;y+=n.offsetTop;}return{x,y};};const a=pos(span),h=pos(head);setBeam({width:scene.clientWidth,height:scene.clientHeight,points:`${h.x+32},${h.y+32} ${a.x},${a.y+span.offsetHeight+3} ${a.x+span.offsetWidth},${a.y+span.offsetHeight+3}`});};measure();const observer=new ResizeObserver(measure);observer.observe(scene);return()=>observer.disconnect();},[]);
 const [coachStage,setCoachStage]=useState(0);
 const [wordsFocus,setWordsFocus]=useState(false);
 useEffect(()=>{setCoachStage(0);setWordsFocus(false);if(!active)return;const timers=[setTimeout(()=>setCoachStage(1),900),setTimeout(()=>setCoachStage(2),1350),setTimeout(()=>setWordsFocus(true),1800),setTimeout(()=>setCoachStage(3),2150),setTimeout(()=>setCoachStage(4),3950)];return()=>timers.forEach(clearTimeout);},[active]);
 const listenItems=[['Tôi là một người mẹ có hai con nhỏ.','Anna','I took this job because it offered me flexible hours.','Tôi nhận công việc này vì nó cho tôi giờ giấc linh hoạt.'],['Tôi nhận công việc này vì nó cho tôi giờ giấc linh hoạt.','Anna','I can work and still pick them up from school.','Tôi vừa làm việc vừa đón con đi học được.'],['Tôi vừa làm việc vừa đón con đi học được.','Anna','That balance matters most to me.','Sự cân bằng đó quan trọng nhất với tôi.']];
 const listenTimes=[3,9,15,21];
 const [listenStep,setListenStep]=useState(0);
 useEffect(()=>{if(!active){setListenStep(0);return;}if(matchMedia('(prefers-reduced-motion: reduce)').matches){setListenStep(3);return;}setListenStep(0);const timers=[1,2,3].map(n=>setTimeout(()=>setListenStep(n),1300+n*1900));return()=>timers.forEach(clearTimeout);},[active]);
 const listening=listenStep<3,lineNow=Math.min(listenStep,2);
 const [chatOpen,setChatOpen]=useState(false);
 const [chatTick,setChatTick]=useState(0);
 const [chatReplay,setChatReplay]=useState(0);
 const chatBody=useRef<HTMLDivElement>(null);
 const chatLines=[
  'Today I go to the market and buyed some fruits.',
  '“Yesterday I went to the market and bought some fruit.” Go → went. Buy → bought.',
  'How do I say “Tôi rất thích trái cây”?',
  '“I really love fruit!” or “I’m a big fan of fruit.” Try it out loud!'
 ];
 const chatDurations=chatLines.map(line=>line.length*24+650);
 const chatElapsed=chatDurations.reduce<number[]>((a,d)=>[...a,(a.at(-1)||600)+d],[]);
 useEffect(()=>{setChatOpen(false);if(!active)return;const timer=setTimeout(()=>setChatOpen(true),1800);return()=>clearTimeout(timer);},[active]);
 useEffect(()=>{setChatTick(0);if(!chatOpen)return;const timer=setInterval(()=>setChatTick(n=>n+40),40);const stop=setTimeout(()=>clearInterval(timer),chatElapsed[3]+100);return()=>{clearInterval(timer);clearTimeout(stop);};},[chatOpen,english,chatReplay]);
 useEffect(()=>{const body=chatBody.current;if(body)body.scrollTop=body.scrollHeight;},[chatTick]);

 const mainRef=useRef<HTMLElement>(null);
 const [spotlight,setSpotlight]=useState<string|null>(null);
 const [closing,setClosing]=useState<string|null>(null);
 const [spotlightTransform,setSpotlightTransform]=useState<{dx:number;dy:number;scale:number}|null>(null);
 const lastActiveElement=useRef<HTMLElement|null>(null);
 const closeBtnRef=useRef<HTMLButtonElement>(null);
 const closeTimer=useRef<number|null>(null);

 const openSpotlight=(id:string)=>{
  if(closeTimer.current){clearTimeout(closeTimer.current);closeTimer.current=null;}
  if(spotlight===id)return;
  lastActiveElement.current=document.activeElement as HTMLElement|null;
  const main=mainRef.current;
  if(!main){
   setSpotlight(id);
   return;
  }
  const tile=main.querySelector<HTMLElement>(`.bento-${id}`);
  if(!tile){
   setSpotlight(id);
   return;
  }
  const prevTransform=tile.style.transform;
  tile.style.transform='none';
  const mainRect=main.getBoundingClientRect();
  const tileRect=tile.getBoundingClientRect();
  tile.style.transform=prevTransform;

  const canvasScale=mainRect.width/(main.clientWidth||1);
  const tileLocalX=(tileRect.left-mainRect.left)/canvasScale;
  const tileLocalY=(tileRect.top-mainRect.top)/canvasScale;
  const tileLocalW=tileRect.width/canvasScale;
  const tileLocalH=tileRect.height/canvasScale;

  const targetCenterX=main.clientWidth/2;
  const targetCenterY=main.clientHeight/2;
  const currentCenterX=tileLocalX+tileLocalW/2;
  const currentCenterY=tileLocalY+tileLocalH/2;

  const paddingX=56;
  const paddingY=44;
  const maxScaleX=(main.clientWidth-paddingX)/tileLocalW;
  const maxScaleY=(main.clientHeight-paddingY)/tileLocalH;
  const fitScale=Math.min(maxScaleX,maxScaleY);
  const scale=Math.max(0.6,Math.min(fitScale,1.65));

  const dx=targetCenterX-currentCenterX;
  const dy=targetCenterY-currentCenterY;

  setSpotlightTransform({dx,dy,scale});
  setClosing(null);
  setSpotlight(id);
 };

 const closeSpotlight=()=>{
  if(!spotlight)return;
  const curr=spotlight;
  setClosing(curr);
  setSpotlight(null);
  setSpotlightTransform(null);
  if(closeTimer.current)clearTimeout(closeTimer.current);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  closeTimer.current=window.setTimeout(()=>{
   setClosing(null);
   lastActiveElement.current?.focus?.();
  },reduced?20:360);
 };

 useEffect(()=>{
  if(!spotlight)return;
  const onKeyDown=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){
    e.preventDefault();
    e.stopPropagation();
    closeSpotlight();
    return;
   }
   if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)){
    const target=e.target as HTMLElement|null;
    if(!target?.matches('input,textarea,select')){
     e.stopPropagation();
    }
   }
   if(e.key==='Tab'){
    const main=mainRef.current;
    if(!main)return;
    const activeTile=main.querySelector<HTMLElement>(`.bento-${spotlight}`);
    const closeBtn=main.querySelector<HTMLElement>('.bento-spotlight-close');
    const focusables=[
     closeBtn,
     ...(activeTile?Array.from(activeTile.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')):[])
    ].filter((el):el is HTMLElement=>!!el&&!el.hasAttribute('disabled')&&el.offsetParent!==null);
    if(!focusables.length)return;
    const first=focusables[0];
    const last=focusables[focusables.length-1];
    if(e.shiftKey){
     if(document.activeElement===first){
      e.preventDefault();
      last.focus();
     }
    }else{
     if(document.activeElement===last){
      e.preventDefault();
      first.focus();
     }
    }
   }
  };
  window.addEventListener('keydown',onKeyDown,true);
  return()=>window.removeEventListener('keydown',onKeyDown,true);
 },[spotlight]);

 useEffect(()=>{
  if(spotlight){
   requestAnimationFrame(()=>{
    closeBtnRef.current?.focus();
   });
  }
 },[spotlight]);

 useEffect(()=>{
  return()=>{
   if(closeTimer.current)clearTimeout(closeTimer.current);
  };
 },[]);

 useEffect(()=>{
  if(!spotlight)return;
  const onResize=()=>closeSpotlight();
  window.addEventListener('resize',onResize);
  return()=>window.removeEventListener('resize',onResize);
 },[spotlight]);

 const onCardClick=(id:string,e:React.MouseEvent)=>{
  if(spotlight)return;
  const target=e.target as HTMLElement|null;
  if(target?.closest('button,a,input,textarea,select,[role="button"],.listening-model-controls,.listening-model-viewport'))return;
  openSpotlight(id);
 };

 return <main ref={mainRef} className={`english-bento ${active?'bento-ready':''} ${spotlight?'has-spotlight':''}`}>
  <div className="bento-heading"><div><span>{t('KẾT QUẢ · ENGLISH WEB','THE RESULT · ENGLISH WEB')}</span><h1>{t('Đừng chỉ chép.','Beyond copying.')} <em>{t('Học để nhớ.','Learn to remember.')}</em></h1></div><a href="https://english.nimtechnology.com" target="_blank" rel="noopener noreferrer">english.nimtechnology.com <ArrowUpRight size={17}/></a></div>
  <div className="bento-grid">
   <section className={`bento-tile bento-hero ${spotlight==='hero'?'bento-spotlight-active':''} ${closing==='hero'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('hero',e)} style={spotlight==='hero'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='hero'?{transform:'none'}:undefined} role={spotlight==='hero'?'dialog':undefined} aria-modal={spotlight==='hero'?true:undefined} aria-label={spotlight==='hero'?t('Chi tiết Góc học tiếng Anh','Details of English Learning Space'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to Góc học tiếng Anh','Zoom into English space')} onClick={e=>{e.stopPropagation();openSpotlight('hero');}}><Maximize2 size={16}/></button>
    <div className="bento-label"><Sparkles size={17}/> {t('GÓC HỌC TIẾNG ANH CỦA BẠN','YOUR ENGLISH LEARNING SPACE')}</div><h2>English<span className="bento-center-sub">{t('Một góc nhỏ. Học mỗi ngày.','Your daily learning space.')}</span></h2><p>{t('Tra từ, luyện nghe, sửa câu. Mang tiếng Anh vào mỗi ngày.','Look up words. Train your ear. Refine your sentences.')}</p><img className="bento-real-home" src="/english-home-light.png" alt={t('Ảnh chụp giao diện English Learner thật','Screenshot of the real English Learner website')}/><small className="bento-demo">{t('ẢNH CHỤP WEBSITE THẬT','ACTUAL WEBSITE SCREENSHOT')}</small>
   </section>

   <section className={`bento-tile bento-listening ${spotlight==='listening'?'bento-spotlight-active':''} ${closing==='listening'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('listening',e)} style={spotlight==='listening'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='listening'?{transform:'none'}:undefined} role={spotlight==='listening'?'dialog':undefined} aria-modal={spotlight==='listening'?true:undefined} aria-label={spotlight==='listening'?t('Chi tiết Luyện nghe','Details of Listening'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to Luyện nghe','Zoom into Listening')} onClick={e=>{e.stopPropagation();openSpotlight('listening');}}><Maximize2 size={16}/></button>
    <Headphones size={27}/><h2>{t('Nghe. Hiểu.','Listen. Understand.')}</h2><p>{t('Tạo bài nghe từ ảnh hoặc file audio.','Start from an image or audio file.')}</p><div className="listening-model" aria-label="Listening UI illustration">
     <div className="listening-model-transcript"><div className="listening-model-caption"><span>TRANSCRIPT<small>{lineNow+2} / 22</small></span><List size={13}/></div><div className="listening-model-viewport"><div className="listening-model-track" style={{'--lm-step':lineNow} as React.CSSProperties}>{listenItems.map(([prev,who,en,vi])=><div key={en} className="listening-model-slide"><p className="listening-model-previous">{prev}</p><div className="listening-model-focus"><small>{who}</small><strong>{en}</strong><p>{vi}</p></div></div>)}</div></div><small className="listening-model-hint">Bấm câu để nghe lại · Tự cuộn theo câu đang phát</small></div>
     <div className="listening-model-player"><div className="listening-model-progress"><i style={{width:`${listenTimes[listenStep]/99*100}%`}}/></div><div className="listening-model-time"><span>0:{String(listenTimes[listenStep]).padStart(2,'0')}</span><span>1:39</span></div><div className="listening-model-controls"><span className="listening-model-speed">0.8×⌄</span><SkipBack size={17}/><span className={`listening-model-play ${listening?'is-playing':'is-paused'}`} role="img" aria-label={listening?'Playing':'Paused'}>{listening?<Pause size={23} fill="currentColor"/>:<Play size={23} fill="currentColor"/>}</span><SkipForward size={17}/><span className="listening-model-repeat"><Repeat size={16}/><small>Lặp: tắt</small></span></div><small className="listening-model-download">▸ Tải file &amp; thông tin</small></div><small className="listening-model-note">{t('MINH HỌA GIAO DIỆN','UI ILLUSTRATION')}</small>
    </div><div className="bento-wave" aria-hidden="true">{Array.from({length:29},(_,i)=><i key={i} style={{height:12+(i*17%51),animationDelay:`${i*.06}s`}}/>)}</div><div className="bento-transcript">“The more you <strong>practice</strong>,<br/>the more you understand.”</div>
   </section>

   <section className={`bento-tile bento-words ${wordsFocus?'words-focused':''} ${spotlight==='words'?'bento-spotlight-active':''} ${closing==='words'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('words',e)} style={spotlight==='words'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='words'?{transform:'none'}:undefined} role={spotlight==='words'?'dialog':undefined} aria-modal={spotlight==='words'?true:undefined} aria-label={spotlight==='words'?t('Chi tiết My Words','Details of My Words'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to My Words','Zoom into My Words')} onClick={e=>{e.stopPropagation();openSpotlight('words');}}><Maximize2 size={16}/></button>
    <div><h2>My Words</h2><p>{t('Lưu từ mới.','Save new words.')}<br/>{t('Quay lại ôn.','Come back to review.')}</p><small>{t('Bấm ảnh để xem lớn','Click image to enlarge')}</small></div><a className="words-image-frame" href="/my-words-en.png" target="_blank" rel="noreferrer" aria-label="Open translated My Words screenshot"><img src="/my-words-en.png" alt="My Words — supplied screenshot translated into English: 99 words, 169 lookups"/></a>
   </section>

   <section className={`bento-tile bento-writing ${spotlight==='writing'?'bento-spotlight-active':''} ${closing==='writing'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('writing',e)} style={spotlight==='writing'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='writing'?{transform:'none'}:undefined} role={spotlight==='writing'?'dialog':undefined} aria-modal={spotlight==='writing'?true:undefined} aria-label={spotlight==='writing'?t('Chi tiết Email Coach','Details of Email Coach'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to Email Coach','Zoom into Email Coach')} onClick={e=>{e.stopPropagation();openSpotlight('writing');}}><Maximize2 size={16}/></button>
    <div ref={coachRef} className={`coach-scene coach-stage-${coachStage}`} data-coach-stage={coachStage}><span className="coach-badge">Writing</span><h2>Your Email Coach</h2><p className="coach-subtitle">AI dạy viết email tự nhiên</p><div className="coach-email"><div>To: <strong>manager@company.com</strong></div><div>Subject: <strong>Request for a meeting</strong></div><p><span>I want to ask if we can meet</span> on Friday.<i/></p></div><div className="coach-mascot" aria-hidden="true"><RobotHead state={coachStage===4?'speaking':coachStage>=2?'thinking':'idle'} size={64} interactive={false} color="#aebce8"/></div><svg className="coach-gaze-beam" viewBox={`0 0 ${beam.width} ${beam.height}`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="coach-gaze"><stop stopColor="#67e8f9" stopOpacity=".1"/><stop offset="1" stopColor="#a78bfa" stopOpacity=".55"/></linearGradient></defs><polygon points={beam.points} fill="url(#coach-gaze)"/></svg><div className="coach-suggestion" aria-hidden={coachStage<4}><p>✨ AI suggests: <strong>“Could we schedule a meeting for Friday?”</strong></p><small>(Gợi ý: Lịch sự và tự nhiên hơn!)</small><div><button type="button" onClick={e=>{const card=e.currentTarget.closest('.coach-scene');const line=card?.querySelector('.coach-email p');if(line)line.textContent='Could we schedule a meeting for Friday?';e.currentTarget.textContent='Applied ✓';}}>Apply ↵</button><button type="button" onClick={e=>{const hint=e.currentTarget.closest('.coach-suggestion')?.querySelector('small');if(hint)hint.textContent='“Could we…” là cách đề nghị lịch sự trong email công việc.';}}>💡 Xem giải thích</button></div></div><div className="coach-bottom-tags"><span>🏷 Drafting</span><span>Formal Tone</span><span>Live Feedback</span></div></div>
   </section>

   <section className={`bento-tile bento-chat ${spotlight==='chat'?'bento-spotlight-active':''} ${closing==='chat'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('chat',e)} style={spotlight==='chat'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='chat'?{transform:'none'}:undefined} role={spotlight==='chat'?'dialog':undefined} aria-modal={spotlight==='chat'?true:undefined} aria-label={spotlight==='chat'?t('Chi tiết AI đồng hành','Details of AI Chat'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to AI đồng hành','Zoom into AI Chat')} onClick={e=>{e.stopPropagation();openSpotlight('chat');}}><Maximize2 size={16}/></button>
    <MessageCircle size={25}/><div><h2>{t('AI đồng hành.','AI alongside you.')}</h2><p>{t('Hỏi tiếp ngay khi đang học.','Keep learning. Keep asking.')}</p></div>  {chatOpen&&<div className="bento-chat-backdrop"><section className="bento-chat-window" aria-label="English learning chat illustration"><div className="demo-chat-body" ref={chatBody}>{chatLines.map((line,i)=>{const start=i===0?600:chatElapsed[i-1];const sent=i%2===0?start+400+line.length*24:start;if(chatTick<sent)return null;const count=i%2===0?line.length:Math.max(0,Math.floor((chatTick-start-400)/24));return <div key={i} className={`demo-chat-message ${i%2?'assistant':'student'}`}><small>{i%2?(i===1?'Grammar Check':'Natural Speaking'):'Human'}</small><p>{count?line.slice(0,count):'•••'}{count>0&&count<line.length&&<span className="demo-chat-caret">▍</span>}</p></div>;})}</div><div className="demo-chat-footer"><span className="demo-chat-draft">{chatLines.map((line,i)=>{const start=i===0?600:chatElapsed[i-1];return i%2===0&&chatTick>=start&&chatTick<start+400+line.length*24?line.slice(0,Math.max(0,Math.floor((chatTick-start-400)/24))):'';}).join('')||'Type a message…'}</span><button type="button" aria-label="Replay conversation" onClick={()=>setChatReplay(n=>n+1)}>↻</button></div><div className="companion-head" aria-hidden="true"><RobotHead state={chatTick>600?'speaking':'idle'} size={64} interactive={false} color="#7952d9"/></div><small className="companion-demo">Illustrative conversation</small></section></div>}
   </section>

   <section className={`bento-tile bento-vocabulary ${spotlight==='vocabulary'?'bento-spotlight-active':''} ${closing==='vocabulary'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('vocabulary',e)} style={spotlight==='vocabulary'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='vocabulary'?{transform:'none'}:undefined} role={spotlight==='vocabulary'?'dialog':undefined} aria-modal={spotlight==='vocabulary'?true:undefined} aria-label={spotlight==='vocabulary'?t('Chi tiết Ngữ pháp','Details of Grammar'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to Ngữ pháp','Zoom into Grammar')} onClick={e=>{e.stopPropagation();openSpotlight('vocabulary');}}><Maximize2 size={16}/></button>
    <h2>Grammar</h2><div className="grammar-lesson"><div className="grammar-teacher" aria-hidden="true"><RobotHead state={active?'speaking':'idle'} size={64} interactive={false} color="#aebce8"/><svg viewBox="0 0 85 70"><path className="grammar-arm" d="M25 47 Q39 49 52 33"/><path className="grammar-pointer" d="M47 39 L81 3"/><circle className="grammar-hand" cx="52" cy="33" r="4"/></svg></div><div className="grammar-board" aria-label="Sentence structure: Subject plus Verb plus Object"><small>{t('CẤU TRÚC CÂU','SENTENCE STRUCTURE')}</small><div className="grammar-formula"><strong>S</strong><b>+</b><strong>V</strong><b>+</b><strong>O</strong></div><div className="grammar-labels"><span>Subject</span><span>Verb</span><span>Object</span></div><div className="grammar-example"><span>I</span><span>love</span><span>English.</span></div><i/></div></div><small className="grammar-caption">{t('AI giảng từng phần của câu.','AI explains each part of a sentence.')}</small>
   </section>

   <section className={`bento-tile bento-context ${spotlight==='context'?'bento-spotlight-active':''} ${closing==='context'?'bento-spotlight-closing':''}`} onClick={e=>onCardClick('context',e)} style={spotlight==='context'&&spotlightTransform?{transform:`translate(${spotlightTransform.dx}px,${spotlightTransform.dy}px) scale(${spotlightTransform.scale})`}:closing==='context'?{transform:'none'}:undefined} role={spotlight==='context'?'dialog':undefined} aria-modal={spotlight==='context'?true:undefined} aria-label={spotlight==='context'?t('Chi tiết Bối cảnh','Details of Context'):undefined}>
    <button type="button" className="bento-spotlight-btn" aria-label={t('Phóng to Bối cảnh','Zoom into Context')} onClick={e=>{e.stopPropagation();openSpotlight('context');}}><Maximize2 size={16}/></button>
    <Sparkles size={27}/><div><h2>{t('Học theo cách của bạn.','Make it your English.')}</h2><p>{t('Từ mới. Bài nghe. Câu viết. Kết nối trong một web.','Words. Audio. Sentences. Together in one web.')}</p></div>
   </section>
  </div>

  {(spotlight||closing)&&<div className={`bento-spotlight-backdrop ${closing?'is-closing':''}`} onClick={spotlight?closeSpotlight:undefined} aria-hidden="true"/>}
  {spotlight&&<button ref={closeBtnRef} type="button" className="bento-spotlight-close" onClick={closeSpotlight} aria-label={t('Đóng','Close')}><X size={22}/></button>}
 </main>;
}
