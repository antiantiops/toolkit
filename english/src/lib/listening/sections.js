import { validateTranscript } from './transcript.js';
export function validateListeningPage(value) {
  const input = value?.sections || [value];
  if (!Array.isArray(input) || !input.length || input.length > 20) throw new Error('Invalid listening sections');
  const sections = input.map(validateTranscript);
  if (sections.reduce((n,s)=>n+s.sentences.reduce((m,x)=>m+x.en.length,0),0)>24000) throw new Error('Trang quá dài. Hãy cắt ảnh thành phần nhỏ hơn.');
  return sections;
}
export function selectListeningSections(sections, indices) {
  const checked=validateListeningPage({sections});
  if(!Array.isArray(indices)||!indices.length||indices.length>checked.length||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=checked.length))throw new Error('Chọn ít nhất một đoạn hợp lệ');
  const selected=[...indices].sort((a,b)=>a-b).map(i=>checked[i]);
  // ponytail: reuse bounded single-lesson player; split selection if exceeding its limits.
  const lesson=validateTranscript({title:selected.map(s=>s.title).join(' · ').slice(0,200),sentences:selected.flatMap((s,i)=>s.sentences.map(x=>({...x,speaker:x.speaker&&selected.length>1?`${i+1} · ${x.speaker}`:x.speaker})))});
  return lesson;
}
