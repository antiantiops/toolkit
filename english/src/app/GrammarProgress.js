import { useLanguage } from './LanguageContext';

export default function GrammarProgress({ job }) {
  const { t } = useLanguage();
  if (!job || job.status === 'completed') return null;
  const pages = job.source?.pages || [];
  const partial = job.partialGrammar;
  const names = ['Ý chính & tình huống', 'Công thức & ví dụ', 'Phân biệt & lỗi thường gặp', 'Mẹo nhớ, tự kiểm tra & tóm tắt'];
  return (
    <section data-grammar-progress className="mb-5 space-y-3 rounded-2xl border border-purple-700/70 bg-slate-900 p-4">
      <h3 className="font-semibold text-purple-200">{job.stage === 'extract' ? t('Đang đọc ảnh…') : t('Nội dung hiện dần khi từng phần hoàn tất')}</h3>
      {job.parts?.length > 0 && <ul className="grid gap-2 text-sm sm:grid-cols-2">{job.parts.map(p => <li key={p.index} className="rounded-lg border border-slate-700 p-2 text-slate-200">{p.status === 'completed' ? '✓' : p.status === 'failed' ? '!' : '…'} {t(names[p.index])} — {p.status === 'completed' ? t('Đã xong') : p.status === 'failed' ? t('Cần thử lại') : p.status === 'running' ? t('Đang phân tích') : t('Đang chờ')}</li>)}</ul>}
      {pages.map((page, i) => <details key={i} open className="rounded-xl border border-slate-700 bg-slate-950 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">{t('Trang ')}{i + 1}{page.topic ? ` · ${page.topic}` : ''}</summary>
        {page.facts?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{page.facts.map((fact, j) => <li key={j}>{fact}</li>)}</ul>}
      </details>)}
      {(partial?.title || partial?.keyIdea) && <div className="rounded-xl border border-purple-800/60 bg-slate-950/70 p-3 text-sm text-slate-200">
        {partial.title && <p className="font-semibold text-purple-200">{partial.title}{partial.titleVietnamese ? ` — ${partial.titleVietnamese}` : ''}</p>}
        {partial.keyIdea && <p className="mt-1 whitespace-pre-wrap text-slate-300">{partial.keyIdea}</p>}
      </div>}
      <p className="text-xs text-slate-400">{t('Phần đã xong được giữ lại khi thử lại phần lỗi. Bài đầy đủ xuất hiện khi hoàn tất phân tích.')}</p>
    </section>
  );
}
