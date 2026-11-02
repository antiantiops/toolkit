export default function WritingProgress({job}) {
  if (!job || job.status === 'completed') return null;
  const pages = job.source?.pages || [];
  const lesson = job.writing || {};
  const sections = lesson.sample?.sections || lesson.sections || [];
  const names = ['Thông tin bài học', 'Yêu cầu đề bài', 'Phân tích bài mẫu / dàn ý', 'Cụm từ và hướng dẫn'];
  return <section data-writing-progress className="mb-5 space-y-3 rounded-2xl border border-teal-700 bg-slate-900 p-4">
    <h3 className="font-semibold text-teal-200">{job.stage === 'extract' ? 'Đang đọc ảnh…' : 'Nội dung hiện dần khi từng phần hoàn tất'}</h3>
    {job.parts?.length > 0 && <ul className="grid gap-2 text-sm sm:grid-cols-2">{job.parts.map(p => <li key={p.index} className="rounded-lg border border-slate-700 p-2 text-slate-200">{p.status === 'completed' ? '✓' : p.status === 'failed' ? '!' : '…'} {names[p.index]} — {p.status === 'completed' ? 'Đã xong' : p.status === 'failed' ? 'Cần thử lại' : p.status === 'running' ? 'Đang phân tích' : 'Đang chờ'}</li>)}</ul>}
    {pages.map((page,i) => <details key={i} open className="rounded-xl border border-slate-700 bg-slate-950 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">Trang {i+1} · Nguyên văn từ ảnh{page.topic ? ` · ${page.topic}` : ''}</summary>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-200">{page.sourceText}</p>
      {page.wordBank?.length > 0 && <p className="mt-2 text-sm text-teal-200">Word Bank: {page.wordBank.join(' · ')}</p>}
    </details>)}
    {lesson.task?.scenarioVietnamese && <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{lesson.task.scenarioVietnamese}</p>}
    {sections.length > 0 && <details open className="rounded-xl border border-slate-700 p-3"><summary className="cursor-pointer font-semibold text-teal-200">Phân tích đã sẵn sàng</summary>{sections.map((s,i) => <div key={i} className="mt-3 text-sm leading-7 text-slate-200"><h4 className="font-semibold">{s.labelVietnamese || s.label}</h4><p>{s.purpose}</p>{(s.sentences || []).map((sentence,j) => <div key={j} className="mt-2"><p>{sentence.english}</p><p>{sentence.vietnamese}</p><p className="text-slate-400">{sentence.why}</p></div>)}</div>)}</details>}
    <p className="text-xs text-slate-400">Phần đã xong được giữ lại khi thử lại phần lỗi. Bài đầy đủ xuất hiện khi hoàn tất phân tích.</p>
  </section>;
}
