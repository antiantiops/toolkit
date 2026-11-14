"use client";
import {useEffect,useState} from 'react';
import {parseApiResponse} from './fetch-helper';
import ListeningImage from './ListeningImage';
import { useLanguage } from './LanguageContext';
export default function ListeningText({onContextChange,clickableText,historyEntry=null}) {
 const { targetLang } = useLanguage(), { t = text => text } = useLanguage();
 historyEntry = (historyEntry?.lesson?.targetLang || historyEntry?.targetLang || 'vi') === targetLang ? historyEntry : null;
 const [text,setText]=useState(''),[lesson,setLesson]=useState(null),[preparing,setPreparing]=useState(false);
 const [dismissHistory,setDismissHistory]=useState(false);
 useEffect(()=>{setDismissHistory(false);},[historyEntry]);
 const activeLesson=lesson||(!dismissHistory&&historyEntry?.lesson?.sentences?.length?historyEntry.lesson:null);
 useEffect(()=>{onContextChange?.({source:'text',text:activeLesson?.sentences?.map(s=>s.en).join(' ')||text});},[text,activeLesson,onContextChange]);
 const wordCount=text.trim()?text.trim().split(/\s+/u).length:0;
 async function generate(){
  if(!wordCount||wordCount>5000)return;
  const parts=Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(text.trim()),s=>s.segment.trim()).filter(Boolean);
  // ponytail: split long sentences at whitespace for bounded TTS; upgrade to provider timestamps for word-level sync.
  const sentences=parts.flatMap(s=>s.match(/.{1,550}(?:\s+|$)|\S{1,550}/gs)||[s]).map(en=>({en:en.trim(),vi:''}));
  setPreparing(true);
  try { const next=await parseApiResponse(await fetch('/api/listening-text',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Bài nghe từ văn bản',sentences,targetLang})})); setLesson(next.lesson); }
  finally { setPreparing(false); }
 }
 if(historyEntry && !dismissHistory) return <section data-testid="listening-text" className="space-y-4">
  <div className="flex items-center justify-between gap-2">
   <h2 className="text-xl font-semibold text-teal-300">{t('Nghe từ văn bản')}</h2>
   <button type="button" onClick={()=>setDismissHistory(true)} className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-slate-700">{t('Nhập bài mới')}</button>
  </div>
  <ListeningImage historyEntry={historyEntry} clickableText={clickableText} />
 </section>;
 return <section data-testid="listening-text" className="space-y-4">
  <div className="flex items-center justify-between gap-2">
   <h2 className="text-xl font-semibold text-teal-300">{t('Nghe từ văn bản')}</h2>
   {lesson&&<button type="button" onClick={()=>{setLesson(null);setText('');}} className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-teal-300 hover:bg-slate-700">{t('Tạo bài mới')}</button>}
  </div>
  <p className="text-sm text-slate-300">{t('Dán tiếng Anh để tạo bài nghe theo câu. Giữ nguyên nội dung. Giọng Mỹ.')}</p>
  <label className="block text-sm text-slate-300">{t('Văn bản tiếng Anh')}<textarea value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder={t('Dán nội dung tiếng Anh vào đây…')} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white" /></label>
  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{wordCount}/5000 {t('từ')}</span><button type="button" onClick={generate} disabled={preparing||!!lesson||!wordCount||wordCount>5000} /* disabled={!wordCount||wordCount>5000} */ className="min-h-11 rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{preparing?t('Đang dịch bài nghe…'):t('Tạo audio')}</button></div>
  {wordCount>5000&&<p role="alert" className="text-sm text-red-300">{t('Tối đa 5.000 từ. Hãy rút ngắn văn bản trước khi tạo audio.')}</p>}
  {lesson&&<ListeningImage key={JSON.stringify(lesson)} inputLesson={lesson} autoGenerate clickableText={clickableText} />}
 </section>;
}
