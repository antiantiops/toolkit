import {ReadingTranslate} from './ReadingTranslate';
import {useEffect,useState,useRef} from 'react';
import type {CSSProperties} from 'react';
import './reading-slide.css';
import './reading-depth.css';
export function ReadingSlide({english=false,active=true,depth=false}:{english?:boolean;active?:boolean;depth?:boolean}){
 const bookRef=useRef<HTMLElement>(null);
 const [lens,setLens]=useState({x:0,y:0});
 const [day,setDay]=useState(0),[step,setStep]=useState(-1),[replay,setReplay]=useState(0);
 useEffect(()=>{
  setStep(-1);if(!active)return;
  const timers=[7400,14500,18500,33500,40200].map((ms,i)=>setTimeout(()=>setStep(i),ms));
  return()=>timers.forEach(clearTimeout);
 },[active,replay]);
 useEffect(()=>{
  if(step!==5||!active)return;
  const timer=setTimeout(()=>setStep(6),4300);
  return()=>clearTimeout(timer);
 },[step,active,replay]);
 useEffect(()=>{
  if(step!==3||!active)return;
  const paper=document.querySelector('.practice-paper') as HTMLElement;
  const pen=paper?.querySelector('.practice-pen') as HTMLElement;
  const rows=Array.from(paper?.querySelectorAll('.practice-copy p')||[]) as HTMLElement[];
  if(!pen||!rows.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start=performance.now();let raf=0;
  const paint=()=>{
   const elapsed=(performance.now()-start)/1000;
   const line=Math.min(rows.length-1,Math.max(0,Math.floor((elapsed-.4)/.55)));
   rows.forEach((row,i)=>{
    const progress=reduced?1:Math.max(0,Math.min(1,(elapsed-.4-i*.55)/.45));
    row.style.clipPath=`inset(0 ${100-progress*100}% 0 0)`;
   });
   const row=rows[line],progress=Math.max(0,Math.min(1,(elapsed-.4-line*.55)/.45));
   const width=(row.firstElementChild as HTMLElement).offsetWidth;
   pen.style.left=(row.offsetLeft+width*progress)+'px';
   pen.style.top=(row.offsetTop+23)+'px';
   if(elapsed<5.5&&!reduced)raf=requestAnimationFrame(paint);
  };raf=requestAnimationFrame(paint);return()=>cancelAnimationFrame(raf);
 },[step,active,replay]);
 useEffect(()=>{
  setDay(0);
  if(!active)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=setTimeout(()=>setDay(15),reduced?700:1500);
  return ()=>clearTimeout(timer);
 },[active,replay]);
 useEffect(()=>{
  if(day!==15)return;
  const book=bookRef.current!,page=book.querySelector('.textbook-page') as HTMLElement;
  const glass=book.querySelector('.reading-lens-glass') as HTMLElement;
  const word=page.querySelector('.textbook-word mark') as HTMLElement;
  const clone=page.cloneNode(true) as HTMLElement;
  clone.setAttribute('aria-hidden','true');clone.classList.add('lens-page-copy');
  clone.style.width=page.offsetWidth+'px';clone.style.height=page.offsetHeight+'px';
  glass.appendChild(clone);
  const rect=book.getBoundingClientRect(),scale=rect.width/book.offsetWidth;
  const target=word.getBoundingClientRect();
  let x=(target.x+target.width/2-rect.x)/scale,y=(target.y+target.height/2-rect.y)/scale;
  const local=(el:HTMLElement)=>{let x=0,y=0,node:HTMLElement|null=el;while(node&&node!==book){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}return{x,y};};
  if(depth){const pos=local(word);x=pos.x+word.offsetWidth/2;y=pos.y+word.offsetHeight/2;}
  setLens({x,y});
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf=0;const start=performance.now();
  const paint=()=>{
   const elapsed=performance.now()-start;
   const progress=reduced?1:Math.max(0,Math.min(1,(elapsed-2500)/3000));
   const points=[[x+130,y+100],[x+210,y+170],[x+40,y+210],[x+155,y+60],[x,y]];
   const phase=Math.min(3,Math.floor(progress*4)),f=progress===1?1:progress*4-phase;
   const ease=f*f*(3-2*f),cx=points[phase][0]+(points[phase+1][0]-points[phase][0])*ease,cy=points[phase][1]+(points[phase+1][1]-points[phase][1])*ease;
   const lens=glass.parentElement!;
   lens.style.left=cx+'px';lens.style.top=cy+'px';
   const pr=page.getBoundingClientRect(),br=book.getBoundingClientRect();
   const origin=depth?local(page):{x:(pr.x-br.x)/scale,y:(pr.y-br.y)/scale};
   const px=origin.x,py=origin.y;
   clone.style.transform=`translate(${49-(cx-px)*2}px,${49-(cy-py)*2}px) scale(2)`;
   if(progress<1)raf=requestAnimationFrame(paint);
  };raf=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(raf);clone.remove();};
 },[day,replay,depth]);
 useEffect(()=>{
  if(step!==2||!bookRef.current)return;
  const book=bookRef.current, page=book.querySelector('.textbook-page') as HTMLElement;
  const example=page.querySelector('.indicator-example') as HTMLElement;
  const lens=book.querySelector('.reading-lens') as HTMLElement;
  const clone=lens.querySelector('.lens-page-copy') as HTMLElement;
  const local=(el:HTMLElement)=>{let x=0,y=0,node:HTMLElement|null=el;while(node&&node!==book){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}return{x,y};};
  const target=local(example),origin=local(page),startX=parseFloat(lens.style.left),startY=parseFloat(lens.style.top);
  const x=target.x+Math.min(65,example.offsetWidth/2),y=target.y+example.offsetHeight/2;

  const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let raf=0;
  const points=[[startX,startY],[x,y],[x+Math.min(110,example.offsetWidth/2),y],[x,y],[origin.x+page.offsetWidth-65,y+155]];
  const paint=()=>{const progress=reduced?4:Math.min(4,(performance.now()-start)/900),phase=Math.min(3,Math.floor(progress)),f=progress===4?1:progress-phase,ease=f*f*(3-2*f),cx=points[phase][0]+(points[phase+1][0]-points[phase][0])*ease,cy=points[phase][1]+(points[phase+1][1]-points[phase][1])*ease;lens.style.left=cx+'px';lens.style.top=cy+'px';clone.style.transform=`translate(${49-(cx-origin.x)*2}px,${49-(cy-origin.y)*2}px) scale(2)`;lens.dataset.exampleLens=progress===4?'parked':'scanning';if(progress<4)raf=requestAnimationFrame(paint);};raf=requestAnimationFrame(paint);return()=>{cancelAnimationFrame(raf);delete lens.dataset.exampleLens;};
 },[step]);
 const t=(vi:string,en:string)=>english?en:vi;
 return <main className={`reading-slide ${depth?'reading-depth':''} ${active&&day===15?'reading-active':''}`}><div className="reading-heading"><span className="slide-kicker">{t('TỪ Ý TƯỞNG ĐẾN VẤN ĐỀ THẬT','FROM AN IDEA TO A REAL PROBLEM')}</span><h1>{t('Gặp 10 từ mới,','Ten unfamiliar words.')} <em>{t('bạn làm gì?','What do you do?')}</em></h1></div><div className="reading-stage"><div className={`reading-world ${step>=5?'recall-morning':''}`} data-recall-phase={step>=6?'forgot':step===5?'test':step===4?'ready':'writing'}>{step>=3&&<><div className="practice-stack" aria-hidden="true"><i/><i/></div><div className="practice-paper" aria-label="Repeated vocabulary writing"><small>{t('LUYỆN TỪ VỰNG · HÔM NAY','VOCABULARY PRACTICE · TODAY')}</small>{Array.from({length:9},(_,i)=><div className="practice-copy" key={i} style={{'--copy':i} as CSSProperties}><p><span>indicator · indicator · indicator</span></p></div>)}<svg className="practice-pen" aria-hidden="true" width="48" height="48" viewBox="0 0 48 48"><path d="M0 48 L4 34 L32 6 Q35 3 38 6 L42 10 Q45 13 42 16 L14 44 Z" fill="#f6c85f" stroke="#243c68" strokeWidth="2"/><path d="M0 48 L4 34 L14 44 Z" fill="#ead4ad" stroke="#243c68"/><path d="M0 48 L3 40 L8 45 Z" fill="#243c68"/><path d="M8 35 L35 8 M12 39 L39 12" stroke="#9b6c27"/></svg></div><div className="practice-time"><span className="practice-clock" aria-hidden="true"/>{t('Viết. Viết lại. Rồi viết nữa.','Write. Repeat. Write again.')}</div></>}{step>=5&&<div className="recall-test" aria-label="Vocabulary Test"><small>{t('SÁNG HÔM SAU','THE NEXT MORNING')}</small><h2>Vocabulary Test</h2><p>{t('Điền từ tiếng Anh có nghĩa là “chỉ báo”:','Write the word meaning “a sign that shows a condition”:')}</p><div className="recall-answer"><span className="recall-attempt">i</span></div><span className="recall-pen" aria-hidden="true">✎</span><p className="recall-empty">{t('Không nhớ ra…','Cannot remember…')}</p></div>}<ReadingTranslate active={active} reset={replay} step={step}/><figure ref={bookRef} className={`reading-book book-sequence ${day===15?'book-ready':''}`} data-book-day={day}><div className="book-stack"><div className={`book-hinge ${day===15?'is-open':''}`}><div className="book-cover" aria-hidden={day!==0}><div className="book-seal">CIA</div><p>CEBU INTERNATIONAL ACADEMY</p><h2>BUSINESS<br/>ENGLISH</h2><div>DAILY VOCABULARY<br/><br/>SELF WRITING BOOK</div></div><div className="book-cover-back" aria-hidden="true">{depth?(<div className="book-left-page" aria-label={t('Trang sách bên trái','Left book page')}><div className="textbook-banner"><b>Cebu International Academy</b><span>BUSINESS</span></div><div className="book-writing-lines" aria-label={t("Trang ghi chép có dòng kẻ","Ruled writing page")}/><span className="depth-page-number">72</span></div>):<span>CIA</span>}</div></div><div className="reading-page textbook-page" aria-hidden={day!==15}><div className="textbook-banner"><b>Cebu International Academy</b><span>BUSINESS Self-<br/>Writing</span></div><h2>Day 15</h2><h3>A. Vocabulary</h3><ol className="textbook-vocabulary">{[
 ['Indicator','n','any of a group of statistical values','Current economic indicators show admirable growth in mining.','pointer'],
 ['Industrial','adj','of or relating to industry; producing goods',"My father’s birthplace is an industrial town known for its various products.",''],
 ['Lead','v','to guide the actions of a person or a group','They lead the company to success.','direct, control, manage'],
 ['Likely','adj','having a high probability of occurring or being true','The new CEO is likely to confront major challenges.','probable','impossible'],
 ['Overall','adj','viewed as a whole','Overall profitability was impacted by the lagging demand.','general'],
 ['Promising','adj','likely to succeed or to yield good results','The president has a promising global economic outlook.','optimistic, hopeful','bleak, discouraging'],
 ['Prospect','n','a mental consideration; the act of looking forward','Weak industries are facing prospects of inflated interest rates.','anticipation, vision'],
 ['Prosperity','n','the condition of being successful or thriving','Strong economic growth is a prerequisite for national prosperity.',''],
 ['Rapidly','adv','in a fast manner','As solar technology becomes more affordable, demand will increase rapidly.','quickly, swiftly','slowly'],
 ['Ratio','n','the relationship between two amounts','The ratio of students to teachers is 3 to 1.','proportion, rate']
 ].map(([word,pos,meaning,example,syn,ant],i)=><li key={word} style={{'--word-index':i} as CSSProperties}><div className="textbook-word"><span>{i+1}.</span><mark>{word}</mark></div><div className="textbook-detail"><p><b>({pos})</b> - {meaning}</p><p className={i===0?`indicator-example ${step>=2?'example-pending':''}`:undefined}>Example: {example}</p>{syn&&<p><b>Syn:</b> {syn}{ant&&<span className="textbook-ant"><b>Ant:</b> {ant}</span>}</p>}</div></li>)}</ol><div className="textbook-footer"><span>73</span></div></div></div>{day===15&&<div className={`reading-lens ${step===0?'lens-inspecting':''}`} style={{left:lens.x,top:lens.y}} aria-hidden="true"><div className="reading-lens-glass"/><i/></div>}<figcaption>{t('Dựng lại bố cục theo trang sách bạn cung cấp · Nội dung rút gọn','Layout recreated from the supplied textbook page · Abridged content')}</figcaption></figure></div><section className="reading-question"><span className="reading-counter">10 {t('TỪ MỚI','NEW WORDS')}</span><ol className={`reading-actions ${step>=5?'recall-actions-dim':''}`}>{[t('Tra nghĩa','Look up meanings'),t('Tìm phát âm','Find pronunciations'),t('Dịch ví dụ','Translate examples'),t('Ghi lại…','Write them down…')].map((line,i)=><li key={line} className={step===i?'action-current':step>i?'action-done':''} aria-current={step===i?'step':undefined}><span>0{i+1}</span>{line}</li>)}</ol><div className="reading-action-demo" data-reading-step={step} aria-live="polite">
 {step<0?<div className="reading-demo-wait">{t('Mở sách. Chọn một từ mới.','Open the book. Pick an unfamiliar word.')}</div>:<div key={step} className={`reading-demo-content reading-demo-${step}`}>
 {step===0&&<><small>DICTIONARY · {t('MINH HỌA','ILLUSTRATION')}</small><div className="reading-query">Indicator<span className="reading-search-icon">⌕</span></div><p className="reading-result"><strong>indicator</strong> <small>noun</small><br/>{t('chỉ số; dấu hiệu cho biết tình trạng hoặc xu hướng','a value or sign that shows a condition or trend')}</p></>}
 {step===1&&<><small>{t('PHÁT ÂM · MINH HỌA KHÔNG ÂM THANH','PRONUNCIATION · SILENT ILLUSTRATION')}</small><h2>indicator</h2><p className="reading-ipa">/ˈɪn.də.keɪ.t̬ɚ/ <small>US</small></p><div className="reading-wave" aria-hidden="true">{Array.from({length:17},(_,i)=><i key={i} style={{'--bar':i} as CSSProperties}/>)}</div><p>IN · di · ca · tor</p></>}
 {step===2&&<><small>{t('DỊCH CÂU VÍ DỤ','TRANSLATE THE EXAMPLE')}</small><p className="reading-source">Current economic indicators show admirable growth in mining.</p><p className="reading-translation">Các chỉ số kinh tế hiện tại cho thấy mức tăng trưởng đáng khích lệ trong ngành khai khoáng.</p></>}
 {step===3&&<><small>{t('SỔ TỪ VỰNG','VOCABULARY NOTEBOOK')}</small><div className="reading-notebook"><p className="reading-handwriting">indicator <span>— chỉ số</span></p><p className="reading-note-detail">/ˈɪn.də.keɪ.t̬ɚ/ · noun</p><p className="reading-note-detail">economic indicators = các chỉ số kinh tế</p><span className="reading-pencil" aria-hidden="true">✎</span></div></>}
 {step===4&&<><small>{t('ĐÃ VIẾT KÍN TRANG','A PAGE FULL OF PRACTICE')}</small><h2>{t('Tưởng đã nhớ?','Remember it now?')}</h2><button className="recall-next" onClick={()=>setStep(5)}>{t('Sáng hôm sau','The next morning')} <span aria-hidden="true">›</span></button></>}
 {step>=5&&<div className={`recall-conclusion ${step===6?'is-visible':''}`}><small>{t('ĐẾN LÚC LÀM BÀI TEST','TIME FOR THE TEST')}</small><h2>{t('Hôm qua viết kín trang.','Yesterday: a full page.')}</h2><h2 className="recall-emphasis">{t('Hôm nay vẫn không nhớ.','Today: still cannot recall.')}</h2><p>{t('Tốn thời gian chép. Đến lúc cần, vẫn chưa nhớ ra.','Time spent copying. Still blank when it matters.')}</p></div>}
 </div>}
 </div><button className="reading-replay" onClick={()=>setReplay(n=>n+1)}>{t('Phát lại','Replay')}</button><div className={`reading-forgot ${false?'forgot-visible':''}`}><span>{t('RỒI HÔM SAU','AND THE NEXT DAY')}</span><p>{t('…quên?','…forgotten?')}</p></div></section></div></main>;
}
