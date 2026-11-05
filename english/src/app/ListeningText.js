"use client";
import {useEffect,useState} from 'react';
import ListeningImage from './ListeningImage';
export default function ListeningText({onContextChange,clickableText}) {
 const [text,setText]=useState(''),[lesson,setLesson]=useState(null);
 useEffect(()=>{onContextChange?.({source:'text',text:lesson?.sentences.map(s=>s.en).join(' ')||text});},[text,lesson,onContextChange]);
 const wordCount=text.trim()?text.trim().split(/\s+/u).length:0;
 function generate(){
  if(!wordCount||wordCount>5000)return;
  const parts=Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(text.trim()),s=>s.segment.trim()).filter(Boolean);
  // ponytail: split long sentences at whitespace for bounded TTS; upgrade to provider timestamps for word-level sync.
  const sentences=parts.flatMap(s=>s.match(/.{1,550}(?:\s+|$)|\S{1,550}/gs)||[s]).map(en=>({en:en.trim(),vi:''}));
  setLesson({title:'Bài nghe từ văn bản',sentences});
 }
 return <section data-testid="listening-text" className="space-y-4">
  <h2 className="text-xl font-semibold text-teal-300">Nghe từ văn bản</h2>
  <p className="text-sm text-slate-300">Dán tiếng Anh để tạo bài nghe theo câu. Giữ nguyên nội dung. Giọng Mỹ.</p>
  <label className="block text-sm text-slate-300">Văn bản tiếng Anh<textarea value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder="Dán nội dung tiếng Anh vào đây…" className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3 text-white" /></label>
  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-400">{wordCount}/5000 từ</span><button type="button" onClick={generate} disabled={!wordCount||wordCount>5000} className="min-h-11 rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Tạo audio</button></div>
  {wordCount>5000&&<p role="alert" className="text-sm text-red-300">Tối đa 5.000 từ. Hãy rút ngắn văn bản trước khi tạo audio.</p>}
  {lesson&&<ListeningImage key={JSON.stringify(lesson)} inputLesson={lesson} autoGenerate clickableText={clickableText} />}
 </section>;
}
