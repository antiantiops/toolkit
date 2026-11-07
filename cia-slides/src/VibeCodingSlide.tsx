import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import './vibe-coding.css';
export function VibeCodingSlide({english=false}:{english?:boolean}){
 const[revealed,setRevealed]=useState(false);
 const transitionRef=useRef<ReturnType<typeof document.startViewTransition>|null>(null);
 useEffect(()=>()=>{transitionRef.current?.skipTransition();document.documentElement.classList.remove('vibe-reveal-morph');},[]);
 const reveal=(value:boolean)=>{
  if(transitionRef.current)return;
  if(!document.startViewTransition||matchMedia('(prefers-reduced-motion: reduce)').matches){setRevealed(value);return;}
  document.documentElement.classList.add('vibe-reveal-morph');
  const transition=document.startViewTransition(()=>flushSync(()=>setRevealed(value)));
  transitionRef.current=transition;
  transition.finished.catch(()=>{}).finally(()=>{transitionRef.current=null;document.documentElement.classList.remove('vibe-reveal-morph');});
 };
 const t=(vi:string,en:string)=>english?en:vi;
 return <main className={`vibe-slide ${revealed?'is-decoded':''}`}><div className="vibe-heading"><span className="slide-kicker">{t('TỪ VẤN ĐỀ ĐẾN BẢN THỬ','FROM THE PROBLEM TO A BUILD')}</span><h1>{t('Nếu AI viết code…','If AI writes the code…')} <em>{t('bạn làm gì?','what do you do?')}</em></h1></div><div className="vibe-content"><figure className="vibe-cinema"><div className="vibe-film-label"><span>01 / {t('QUAN SÁT','OBSERVE')}</span><span>CLAUDE × DEVELOPER</span></div><video controls playsInline preload="metadata" aria-label={t('Video meme Claude và developer','Claude and developer meme')} src="/media/claude-developer.mp4"/><figcaption>{t('Meme minh họa · Không phải demo lập trình thật','Meme illustration · Not a real coding demo')}</figcaption></figure><section className="vibe-explanation" aria-live="polite">{!revealed?<><span className="vibe-chapter">02 / {t('ĐOÁN THỬ','YOUR GUESS')}</span><p className="vibe-hook">{t('Một người ra ý tưởng.','One gives direction.')}<br/><strong>{t('Một người làm hết?','One does it all?')}</strong></p><p className="vibe-prompt">{t('Trong clip, ai mới là “lập trình viên”?','Who is the “programmer” in this clip?')}</p><button onClick={()=>reveal(true)}>{t('Giải mã video','Decode the video')} <span aria-hidden="true">↗</span></button></>:<><span className="vibe-chapter">02 / {t('GIẢI MÃ','THE REVEAL')}</span><h2 className="vibe-hook">Vibe<br/>Coding<span>.</span></h2><p className="vibe-definition">{t('Bạn mô tả điều muốn làm. AI biến ý tưởng thành code.','You describe what you want. AI turns the idea into code.')}</p><ol>{[[t('Nêu ý tưởng','Describe'),t('“Tạo web học tiếng Anh.”','“Build an English-learning website.”')],[t('AI viết code','AI builds'),t('Tạo bản chạy thử.','Creates a working draft.')],[t('Thử & chỉnh','Try & refine'),t('“Thêm nút nghe. Chữ to hơn.”','“Add Listen. Make text bigger.”')]].map(([title,body],i)=><li key={title}><span className="vibe-step">0{i+1}</span><div><b>{title}</b><span>{body}</span></div></li>)}</ol><p className="vibe-caution">{t('AI viết. Bạn vẫn kiểm tra kết quả, bảo mật và dữ liệu.','AI writes code. You decide what to build—and what to fix. Check security and data.')}</p><p className="story-bridge">{t('Mình đã dùng cách này để làm web học tiếng Anh.','I used this approach to build my English-learning web app.')} <b>{t('Kết quả →','The result →')}</b></p><button className="vibe-reset" onClick={()=>reveal(false)}>{t('Trở lại câu hỏi','Back to the question')}</button></>}</section></div></main>;
}
