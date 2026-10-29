import {RobotHead} from 'robot-heads';
import {Languages,Image,FileText,PanelsTopLeft,Mic,Volume2,Copy,Star,Share2,History,Menu} from 'lucide-react';
import {useEffect,useState,useRef} from 'react';
const exampleText='Current economic indicators show admirable growth in mining.';
const exampleVi='Các chỉ số kinh tế hiện tại cho thấy mức tăng trưởng đáng khích lệ trong ngành khai khoáng.';
export function ReadingTranslate({active,reset,step}:{active:boolean;reset:number;step:number}){
 const root=useRef<HTMLDivElement>(null),speaker=useRef<HTMLSpanElement>(null);
 const [aim,setAim]=useState({x:0,y:0}),[approach,setApproach]=useState(false);
 useEffect(()=>{setApproach(false);if(!active)return;const timer=setTimeout(()=>setApproach(true),13700);return()=>clearTimeout(timer)},[active,reset]);
 useEffect(()=>{if(!approach||!root.current||!speaker.current)return;let x=0,y=0,node:HTMLElement|null=speaker.current;while(node&&node!==root.current){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}setAim({x:x+speaker.current.offsetWidth/2,y:y+speaker.current.offsetHeight/2});},[approach]);
 const [stage,setStage]=useState(0),[typed,setTyped]=useState('');
 useEffect(()=>{setStage(0);setTyped('');if(!active)return;const timers=[7400,8500,9700,10400].map((ms,i)=>setTimeout(()=>setStage(i+1),ms));return()=>timers.forEach(clearTimeout);},[active,reset]);
 useEffect(()=>{if(stage!==4)return;let n=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){setTyped('Indicator');return;}const timer=setInterval(()=>{setTyped('Indicator'.slice(0,++n));if(n===9)clearInterval(timer);},130);return()=>clearInterval(timer);},[stage]);
 const [examplePhase,setExamplePhase]=useState(0),[sentence,setSentence]=useState('');
 useEffect(()=>{
  setExamplePhase(0);setSentence('');if(step!==2)return;
  const timers=[1000,2400,3400].map((ms,i)=>setTimeout(()=>setExamplePhase(i+1),ms));return()=>timers.forEach(clearTimeout);
 },[step,reset]);
 useEffect(()=>{if(examplePhase!==3)return;let n=0;if(matchMedia('(prefers-reduced-motion: reduce)').matches){setSentence(exampleText);return;}const timer=setInterval(()=>{setSentence(exampleText.slice(0,++n));if(n===exampleText.length)clearInterval(timer);},55);return()=>clearInterval(timer);},[examplePhase]);
 const exampleMode=step===2, input=exampleMode?(examplePhase>=3?sentence:'Indicator'):typed;
 return stage>0?<div ref={root} className={`reading-translate translate-stage-${stage} ${exampleMode?'translate-example':''} ${approach&&step<=1?'speaker-approach':''} ${step===1?'speaker-playing':''}`} style={{'--speaker-x':`${aim.x}px`,'--speaker-y':`${aim.y}px`} as React.CSSProperties} data-translate-stage={stage}>
 <div className="translate-launcher" aria-hidden="true"><svg viewBox="0 0 48 48"><path fill="#4285f4" d="M5 5h27v30H5z"/><path fill="#e8eaed" stroke="#9aa0a6" d="M20 14h24v29H20z"/><text x="9" y="28" fill="white" fontSize="24" fontFamily="Arial">G</text><text x="23" y="35" fill="#5f6368" fontSize="20">文</text></svg></div>
 <svg className="translate-pointer" viewBox="0 0 32 40" aria-hidden="true"><path d="M3 2V30L11 24L17 37L23 34L17 21H29Z" fill="white" stroke="#172033" strokeWidth="2"/></svg><i className="translate-click" aria-hidden="true"/>
 {stage>=3&&<section className="translate-window" aria-label="Google Translate illustration">
 <div className="translate-title"><span className="translate-brand"><Menu className="translate-menu"/><b><i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i></b> Translate</span><small>MINH HỌA · DEMO</small></div>
 <div className="translate-tabs"><span className="selected"><Languages/> Text</span><span><Image/> Images</span><span><FileText/> Documents</span><span><PanelsTopLeft/> Websites</span></div>
 <div className="translate-languages"><span><small>Detect language</small><b>English</b>⌄</span><span>⇄</span><span><b>Vietnamese</b><small>Spanish</small>⌄</span></div>
 <div className="translate-columns"><div><div className="translate-input">{input}{(exampleMode?examplePhase===3&&sentence.length<exampleText.length:typed.length<9)&&<i className="typing-caret"/>}</div><p className="translate-roman">{!exampleMode&&typed==='Indicator'?'ˈindəˌkādər':''}</p><p className="translate-dictionary">{!exampleMode&&typed==='Indicator'?'Noun · See dictionary':''}</p><div className="translate-tools"><span><Mic/><span ref={speaker} className="indicator-speaker"><Volume2/></span></span><small>{input.length} / 5,000</small></div></div><div className="translate-result-panel"><div className="translate-output">{exampleMode?(sentence===exampleText?exampleVi:''):(typed==='Indicator'?'Chỉ số':'')}</div><p className="translate-dictionary">{!exampleMode&&typed==='Indicator'?'See dictionary':''}</p><div className="translate-tools"><span><Volume2/></span><span><Copy/><Star/><Share2/></span></div></div></div>
 <div className="translate-bottom"><b>More translations</b><span>Expand all</span></div><div className="translate-alternatives">{!exampleMode&&typed==='Indicator'&&<><p><span>chỉ báo</span><small>Noun</small><span>indicator</span></p><p><span>dấu hiệu</span><small>Noun</small><span>sign, indicator</span></p></>}</div>
 <div className="translate-history"><span><History/><small>History</small></span><span><Star/><small>Saved</small></span></div></section>}

 {exampleMode&&examplePhase>0&&<div className={`example-robot look-${examplePhase===1?'book':'app'}`} data-example-phase={examplePhase}><RobotHead state={examplePhase===1?'searching':examplePhase===2?'thinking':'working'} size={110} interactive={false} color="#4267c9" aria-label="Example translation robot"/><small>{examplePhase===1?'Read example':examplePhase===2?'Google Translate':'English → Vietnamese'}</small></div>}
 {step===1&&<div className="translate-speaking" aria-label="Silent pronunciation illustration"><RobotHead className="speaker-robot" state="speaking" shape="rectangle" size={88} interactive={false} color="#4267c9" aria-label="Speaking robot"/><div><b>Indicator</b><p>/ˈɪn.də.keɪ.t̬ɚ/</p><div className="speaker-wave" aria-hidden="true">{Array.from({length:13},(_,i)=><i key={i} style={{animationDelay:`${i*.09}s`}}/>)}</div><small>DEMO · SILENT</small></div></div>}
 </div>:null;
}
