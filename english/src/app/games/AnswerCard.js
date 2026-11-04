"use client";
import {useState} from 'react';
import ContrastTip from "../ContrastTip";
import SpeakBtn from '../SpeakBtn';
function CopyBtn({text}) {
 const [copied,setCopied]=useState(false),[error,setError]=useState(false);
 if (!text) return null;
 return <><button type="button" aria-label="Sao chép" title="Sao chép" className="ml-1 inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded text-sm text-slate-400 hover:bg-slate-800" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);setError(false);}catch{setError(true);}}}>{copied?'✓':'📋'}</button>{error && <span role="alert" className="text-xs text-amber-300">Không sao chép được. Hãy chọn văn bản để copy.</span>}</>;
}
export default function AnswerCard({word:w}) {
 return <div data-game-vocabulary-card className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1 text-lg sm:text-xl font-bold text-blue-400 break-words"><span>{w.word}</span><CopyBtn text={w.word} /></div>
                  <div className="mt-1 flex items-center gap-2"><span className="text-purple-400 italic text-sm">{w.ipa}</span>{w.partOfSpeech && <span className="rounded-full border border-blue-800 bg-blue-950 px-2 py-0.5 text-xs font-semibold text-blue-200">{w.partOfSpeech}</span>}</div>
                </div>
                <SpeakBtn text={w.word} className="shrink-0 w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-lg transition-colors" title="Nghe phát âm">🔊</SpeakBtn>
              </div>
              <div className="mt-3 text-slate-100 font-medium">{w.meaning}</div>
              {w.definition && (
                <div className="mt-3 border-l-2 border-violet-500 pl-3">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
                    <span>English definition</span>
                    <div className="flex gap-1">
                      <CopyBtn text={w.definition} />
                      <SpeakBtn text={w.definition} className="shrink-0 rounded-md bg-violet-800/70 px-2 py-1 normal-case text-violet-100 hover:bg-violet-700" title="Đọc định nghĩa tiếng Anh">🔊 Đọc</SpeakBtn>
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-slate-200 leading-relaxed">{w.definition}</div>
                  {w.definitionVietnamese && <div className="mt-1 text-sm text-slate-400 leading-relaxed">{w.definitionVietnamese}</div>}
                </div>
              )}
              {w.easyReading && (
                <div className="mt-3 rounded-lg bg-sky-950/60 border border-sky-900 px-3 py-2 text-sm text-sky-100">
                  <span className="font-semibold text-sky-300">Dễ đọc:</span> {w.easyReading}
                </div>
              )}
              <details className="mt-3 group/details">
                <summary className="cursor-pointer text-sm text-slate-400 hover:text-blue-300 select-none">Xem ví dụ, mẹo dùng</summary>
                <div className="mt-3 border-t border-slate-700 pt-3">
                  <div className="text-sm text-slate-300 mb-2">
                    <span className="text-slate-500">Ví dụ:</span> {w.example}<CopyBtn text={w.example} /><SpeakBtn text={w.example} aria-label="Nghe ví dụ" title="Nghe ví dụ" className="ml-2 text-sm text-slate-300 hover:text-white">🔊</SpeakBtn>
                    {w.exampleVietnamese && <div className="text-slate-400 italic mt-1">{w.exampleVietnamese}</div>}
                  </div>
                  {w.pending && <div className="text-sm text-blue-300">Đang bổ sung nghĩa và mẹo dùng...</div>}
                  {w.synonyms && !w.contrastTip && <p className="mt-2 text-sm text-slate-300">Đồng nghĩa: {w.synonyms}</p>}
                  {w.antonyms && !w.contrastTip && <p className="mt-2 text-sm text-slate-300">Trái nghĩa: {w.antonyms}</p>}
                  {w.contrastTip && <div data-testid="vocab-contrast-tip" className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm"><div className="font-semibold text-amber-300">Mẹo nhớ cực ngắn</div><ContrastTip raw={w.contrastTip} examples={w.contrastExamples} CopyBtn={CopyBtn} /></div>}
                  {w.collocations?.length > 0 && <div className="mt-3 rounded-lg border border-teal-800/70 bg-teal-950/40 p-3"><div className="text-xs font-semibold uppercase tracking-wide text-teal-300">Collocation</div>{w.collocations.map((c, ci) => <div key={ci} className="mt-2 text-sm"><div className="font-medium text-teal-100">{c.phrase}<CopyBtn text={c.phrase} /> <SpeakBtn text={c.phrase} className="text-xs text-teal-300 hover:text-white">🔊</SpeakBtn></div><div className="mt-1 text-teal-200/70">{c.meaning}{c.note && ` — ${c.note}`}</div></div>)}</div>}
                  {w.note && <div className="text-sm text-amber-400 mt-2">💡 {w.note}</div>}
                </div>
              </details>
 </div>;
}
