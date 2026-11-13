import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import './vibe-coding.css';

export function VibeCodingSlide({english=false}:{english?:boolean}){
 const[revealed,setRevealed]=useState(false);
 const transitionRef=useRef<ReturnType<typeof document.startViewTransition>|null>(null);

 useEffect(()=>()=>{
  transitionRef.current?.skipTransition();
  document.documentElement.classList.remove('vibe-reveal-morph');
 },[]);

 const reveal=(value:boolean)=>{
  if(transitionRef.current)return;
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){
   setRevealed(value);
   return;
  }
  document.documentElement.classList.add('vibe-reveal-morph');
  const transition=document.startViewTransition(()=>flushSync(()=>setRevealed(value)));
  transitionRef.current=transition;
  transition.finished.catch(()=>{}).finally(()=>{
   transitionRef.current=null;
   document.documentElement.classList.remove('vibe-reveal-morph');
  });
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
     <div className="vibe-film-label">
      <span>01 / {t('QUAN SÁT','OBSERVE')}</span>
      <span>CLAUDE × DEVELOPER</span>
     </div>
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
      <>
       <span className="vibe-chapter">02 / {t('GIẢI MÃ','THE REVEAL')}</span>
       <h2 className="vibe-hook">Vibe Coding</h2>
       <p className="vibe-subtitle">{t('Bạn mô tả ý tưởng. AI xây dựng website.','You describe your idea. AI builds the website.')}</p>

       <div className="vibe-cards">
        <div className="vibe-card">
         <span className="vibe-card-tag">{t('BẠN YÊU CẦU','YOUR REQUEST')}</span>
         <p className="vibe-card-quote">“{t('Tôi muốn một website để học từ vựng, luyện ngữ pháp và cải thiện kỹ năng nghe.','I want a website to learn vocabulary, practice grammar, and improve listening.')}”</p>
        </div>

        <div className="vibe-card">
         <span className="vibe-card-tag ai">{t('AI XÂY DỰNG','AI BUILDS')}</span>
         <p className="vibe-card-detail">{t('Tự viết code, tạo website hoạt động được và cập nhật mỗi khi bạn yêu cầu.','Writes the code, creates a working website, and updates it when you ask.')}</p>
        </div>
       </div>

       <div className="vibe-footer-actions">
        <p className="story-bridge"><b>{t('Xem sản phẩm đã làm →','Let’s see what we built →')}</b></p>
        <button className="vibe-reset" onClick={()=>reveal(false)}>{t('Trở lại câu hỏi','Back to question')}</button>
       </div>
      </>
     )}
    </section>
   </div>
  </main>
 );
}
