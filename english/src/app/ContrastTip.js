"use client";
import SpeakBtn from "./SpeakBtn";
export default function ContrastTip({raw="",examples=[],clickableText=text=>text,CopyBtn=()=>null}) {
    if (!raw || typeof raw !== "string") return null;
    const sections = [];
    const lines = raw.split(/\n/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const cleanHeader = line.replace(/^\*{1,3}|[\*#:]+$/g, "").replace(/^[-•*#\d.]+\s*/, "").trim();
      const headingMatch = cleanHeader.match(/^(Đồng nghĩa|Trái nghĩa)(?:\s*\([^)]*\))?\s*[:：]?\s*(.*)$/i);
      if (headingMatch) {
        const isOpposite = /^Trái/i.test(headingMatch[1]);
        const title = headingMatch[1];
        const rest = headingMatch[2]?.trim();
        const s = { title, opposite: isOpposite, items: [] };
        sections.push(s);
        if (rest) s.items.push(rest);
      } else {
        if (!sections.length) {
          sections.push({ title: "Phân biệt sắc thái", opposite: false, items: [] });
        }
        sections[sections.length - 1].items.push(line);
      }
    }

    return (
      <div data-testid="contrast-sections" className="mt-3 space-y-3">
        {sections.map((sec, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3.5 transition-colors ${
              sec.opposite
                ? "border-rose-700/60 bg-rose-950/40 text-rose-100"
                : "border-emerald-700/60 bg-emerald-950/40 text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-2.5 font-bold text-sm tracking-wide">
              <span>{sec.opposite ? "⚡" : "🔗"}</span>
              <span className={sec.opposite ? "text-rose-300" : "text-emerald-300"}>
                {sec.title}
              </span>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed">
              {sec.items.map((item, j) => {
                const clean = item.replace(/^[-•*#\d.]+\s*/, "").trim();
                const m = clean.match(/^(\*{0,2})([A-Za-z][A-Za-z\s'’\-]*?)(\*{0,2})\s*(?:\(([^)]+)\))?\s*[:=–—]\s*(.*)$/);
                if (m) {
                  const word = m[2].trim();
                  const vi = m[4]?.trim() || "";
                  const desc = m[5]?.trim() || "";
                  const example = Array.isArray(examples) ? examples.find(x => typeof x?.word === "string" && x.word.toLowerCase() === word.toLowerCase()) : null;
                  return (
                    <li key={j} className="relative py-1 leading-relaxed">
                      <div className="min-h-9 pr-24">
                        <span className="font-bold text-sky-300 hover:text-sky-200 underline decoration-dotted underline-offset-4 cursor-pointer">
                          {clickableText(word)}
                        </span>
                        {vi && <span className="ml-1 font-normal text-amber-300">({vi})</span>}
                        <SpeakBtn text={word} title={`Nghe ${word}`} aria-label={`Nghe ${word}`} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white" />
                      </div>
                      <p className="text-sm leading-relaxed text-slate-200">{desc}</p>
                      {example?.english && example?.vietnamese && (
                        <details data-testid="contrast-example" className="group/example">
                          <summary aria-label={`Ví dụ cho ${word}`} className="absolute right-0 top-0 flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-400 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 [&::-webkit-details-marker]:hidden">
                            <span>Ví dụ</span>
                            <span aria-hidden="true" className="example-chevron">⌄</span>
                          </summary>
                          <div data-testid="contrast-example-body" className={`mt-3 border-l-2 pl-3 ${sec.opposite ? "border-rose-500/50" : "border-emerald-500/50"}`}>
                            <div className="mb-1 flex justify-end gap-1">
                              <CopyBtn text={example.english} />
                              <SpeakBtn text={example.english} title="Nghe câu ví dụ" aria-label="Nghe câu ví dụ" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm text-sky-200 hover:bg-slate-800" />
                            </div>
                            <div className="break-words text-sm font-medium text-sky-100">{clickableText(example.english)}</div>
                            <div className="mt-1.5 text-sm leading-relaxed text-slate-400">{example.vietnamese}</div>
                          </div>
                        </details>
                      )}
                    </li>
                  );
                }
                return (
                  <li key={j} className="text-slate-200 leading-relaxed">
                    {item}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
}
