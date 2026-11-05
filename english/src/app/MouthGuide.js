"use client";
import { useState } from 'react';
const guides = [
  { label: '/f/ · /v/', sounds: ['f','v'], video: 'nR-K3mrHFv0', slug: 'english-pronounce-f-v-consonants', note: 'Răng trên chạm nhẹ môi dưới. /f/ không rung; /v/ rung thanh quản.' },
  { label: '/θ/ · /ð/', sounds: ['θ','ð'], video: 'nlKNo1TGALA', slug: 'english-pronounce-th-consonants', note: 'Đầu lưỡi hơi nhô giữa hai hàm răng. /θ/ không rung; /ð/ rung thanh quản.' },
  { label: '/r/', sounds: ['r','ɹ'], video: 'G_OQjKLvt0E', slug: 'english-pronounce-r-consonant', note: 'Âm R Mỹ: lưỡi không chạm lợi trên; môi có thể tròn nhẹ.' },
  { label: '/l/', sounds: ['l','ɫ'], video: 'FP0jHNoFqWo', slug: 'english-pronounce-l-consonant', note: 'Đầu lưỡi chạm gờ lợi sau răng cửa trên, hơi đi qua hai bên lưỡi.' },
  { label: '/uː/', sounds: ['u'], video: 'IwahymIkGJ0', slug: 'english-pronounce-oo-vowel', note: 'Môi tròn, lưỡi nâng cao về phía sau. Không thêm âm cuối ngoài từ.' },
  { label: '/iː/', sounds: ['i'], video: 'C5WKc4R7mD4', slug: 'english-pronounce-ee-vowel', note: 'Lưỡi nâng cao phía trước, môi không tròn. Video hướng dẫn âm EE.' },
];
export default function MouthGuide({ ipa = '' }) {
  const [open, setOpen] = useState(false), [selected, setSelected] = useState(null);
  const matching = guides.filter(g => g.sounds.some(s => ipa.includes(s)));
  const ordered = [...matching, ...guides.filter(g => !matching.includes(g))];
  const current = guides.find(g => g.video === selected) || ordered[0];
  return <>
    <button type="button" aria-expanded={open} aria-controls="mouth-guide" onClick={() => setOpen(v => !v)} className="min-h-8 rounded-md border border-violet-600/50 bg-violet-900/20 px-2 text-[11px] font-medium leading-tight text-violet-200">{open ? 'Ẩn khẩu hình' : 'Xem khẩu hình'}</button>
    {open && <div id="mouth-guide" className="mt-3 basis-full space-y-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-200">
      <p>Video khẩu hình · Rachel’s English · giọng Mỹ. Chọn âm để xem; đây là hướng dẫn từng âm, không phải video riêng cho từ.</p>
      {matching.length === 0 && <p className="text-slate-400">Chưa có video khớp IPA của từ. Có thể chọn trong bộ âm mẫu bên dưới.</p>}
      <div role="group" aria-label="Chọn âm xem khẩu hình" className="flex flex-wrap gap-2">{ordered.map(g => <button key={g.video} type="button" aria-pressed={current.video === g.video} onClick={() => setSelected(g.video)} className={`min-h-11 rounded-lg border px-3 ${current.video === g.video ? 'border-violet-400 bg-violet-800 text-white' : 'border-slate-600 text-slate-200'}`}>{g.label}</button>)}</div>
      <p>{current.note}</p>
      <iframe key={current.video} title={`Khẩu hình ${current.label} — Rachel’s English`} src={`https://www.youtube-nocookie.com/embed/${current.video}`} className="aspect-video w-full rounded-lg border-0" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      <p className="text-xs text-slate-400">YouTube tải khi mở mục này. Nếu video không phát: <a href={`https://rachelsenglish.com/${current.slug}/`} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">Mở bài hướng dẫn gốc ↗</a></p>
    </div>}
  </>;
}
