import {useEffect,useState} from 'react';
export function ReadingTranslate({active,reset}:{active:boolean;reset:number}){
 const [stage,setStage]=useState(0),[typed,setTyped]=useState('');
 useEffect(()=>{setStage(0);setTyped('');if(!active)return;const timers=[7400,8500,9700,10400].map((ms,i)=>setTimeout(()=>setStage(i+1),ms));return()=>timers.forEach(clearTimeout);},[active,reset]);
 useEffect(()=>{if(stage!==4)return;let n=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduced){setTyped('Indicator');return;}const timer=setInterval(()=>{setTyped('Indicator'.slice(0,++n));if(n===9)clearInterval(timer);},130);return()=>clearInterval(timer);},[stage]);
 return stage>0?<div className={`reading-translate translate-stage-${stage}`} data-translate-stage={stage}>
 <div className="translate-launcher" aria-hidden="true"><svg viewBox="0 0 48 48"><path fill="#4285f4" d="M5 5h27v30H5z"/><path fill="#e8eaed" stroke="#9aa0a6" d="M20 14h24v29H20z"/><text x="9" y="28" fill="white" fontSize="24" fontFamily="Arial">G</text><text x="23" y="35" fill="#5f6368" fontSize="20">文</text></svg></div>
 <svg className="translate-pointer" viewBox="0 0 32 40" aria-hidden="true"><path d="M3 2V30L11 24L17 37L23 34L17 21H29Z" fill="white" stroke="#172033" strokeWidth="2"/></svg><i className="translate-click" aria-hidden="true"/>
 {stage>=3&&<section className="translate-window" aria-label="Google Translate illustration">
 <div className="translate-title"><span className="translate-brand"><span className="translate-menu">☰</span><b><i>G</i><i>o</i><i>o</i><i>g</i><i>l</i><i>e</i></b> Translate</span><small>MINH HỌA · DEMO</small></div>
 <div className="translate-tabs"><span className="selected">▣ Text</span><span>▧ Images</span><span>▤ Documents</span><span>▱ Websites</span></div>
 <div className="translate-languages"><span><small>Detect language</small><b>English</b>⌄</span><span>⇄</span><span><b>Vietnamese</b><small>Spanish</small>⌄</span></div>
 <div className="translate-columns"><div><div className="translate-input">{typed}{typed.length<9&&<i className="typing-caret"/>}</div><p className="translate-roman">{typed==='Indicator'?'ˈindəˌkādər':''}</p><p className="translate-dictionary">{typed==='Indicator'?'Noun · See dictionary':''}</p><div className="translate-tools"><span>♩　♬</span><small>{typed.length} / 5,000</small></div></div><div className="translate-result-panel"><div className="translate-output">{typed==='Indicator'?'Chỉ số':''}</div><p className="translate-dictionary">{typed==='Indicator'?'See dictionary':''}</p><div className="translate-tools"><span>♬</span><span>▢　☆　♧</span></div></div></div>
 <div className="translate-bottom"><b>More translations</b><span>Expand all</span></div><div className="translate-alternatives">{typed==='Indicator'&&<><p><span>chỉ báo</span><small>Noun</small><span>indicator</span></p><p><span>dấu hiệu</span><small>Noun</small><span>sign, indicator</span></p></>}</div>
 <div className="translate-history"><span>◷<small>History</small></span><span>☆<small>Saved</small></span></div></section>}

 </div>:null;
}
