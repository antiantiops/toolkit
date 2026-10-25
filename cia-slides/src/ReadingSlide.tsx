import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import './reading-slide.css';
export function ReadingSlide({english=false,active=true}:{english?:boolean;active?:boolean}){
 const [day,setDay]=useState(0);
 useEffect(()=>{
  setDay(0);
  if(!active)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=setTimeout(()=>setDay(15),reduced?700:1500);
  return ()=>clearTimeout(timer);
 },[active]);
 const t=(vi:string,en:string)=>english?en:vi;
 return <main className={`reading-slide ${active&&day===15?'reading-active':''}`}><div className="reading-heading"><span className="slide-kicker">{t('TỪ Ý TƯỞNG ĐẾN VẤN ĐỀ THẬT','FROM AN IDEA TO A REAL PROBLEM')}</span><h1>{t('Gặp 10 từ mới,','Ten unfamiliar words.')} <em>{t('bạn làm gì?','What do you do?')}</em></h1></div><div className="reading-stage"><figure className={`reading-book book-sequence ${day===15?'book-ready':''}`} data-book-day={day}><div className="book-stack"><div className={`book-hinge ${day===15?'is-open':''}`}><div className="book-cover" aria-hidden={day!==0}><div className="book-seal">CIA</div><p>CEBU INTERNATIONAL ACADEMY</p><h2>BUSINESS<br/>ENGLISH</h2><div>DAILY VOCABULARY<br/><br/>SELF WRITING BOOK</div></div><div className="book-cover-back" aria-hidden="true"><span>CIA</span></div></div><div className="reading-page textbook-page" aria-hidden={day!==15}><div className="textbook-banner"><b>Cebu International Academy</b><span>BUSINESS Self-<br/>Writing</span></div><h2>Day 15</h2><h3>A. Vocabulary</h3><ol className="textbook-vocabulary">{[
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
 ].map(([word,pos,meaning,example,syn,ant],i)=><li key={word} style={{'--word-index':i} as CSSProperties}><div className="textbook-word"><span>{i+1}.</span><mark>{word}</mark></div><div className="textbook-detail"><p><b>({pos})</b> - {meaning}</p><p>Example: {example}</p>{syn&&<p><b>Syn:</b> {syn}{ant&&<span className="textbook-ant"><b>Ant:</b> {ant}</span>}</p>}</div></li>)}</ol><div className="textbook-footer"><span>73</span></div></div></div><figcaption>{t('Dựng lại bố cục theo trang sách bạn cung cấp · Nội dung rút gọn','Layout recreated from the supplied textbook page · Abridged content')}</figcaption></figure><section className="reading-question"><span className="reading-counter">10 {t('TỪ MỚI','NEW WORDS')}</span><ol>{[t('Tra nghĩa','Look up meanings'),t('Tìm phát âm','Find pronunciations'),t('Dịch ví dụ','Translate examples'),t('Ghi lại…','Write them down…')].map((line,i)=><li key={line}><span>0{i+1}</span>{line}</li>)}</ol><div className="reading-forgot"><span>{t('RỒI HÔM SAU','AND THE NEXT DAY')}</span><p>{t('…quên?','…forgotten?')}</p></div></section></div></main>;
}
