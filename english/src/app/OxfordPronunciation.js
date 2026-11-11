"use client";
import { useEffect, useRef, useState } from 'react';

const cache = new Map();
function load(word) {
  if (!cache.has(word)) {
    if (cache.size >= 300) cache.delete(cache.keys().next().value);
    const pending = fetch('/api/pronunciation?word=' + encodeURIComponent(word))
      .then(async response => {
        if (!response.ok) throw Error('Không tải được phát âm Oxford.');
        const data = await response.json();
        if (!data.pronunciation) throw Error('Oxford chưa có phát âm cho từ này.');
        return data.pronunciation;
      }).catch(error => { cache.delete(word); throw error; });
    cache.set(word, pending);
  }
  return cache.get(word);
}
export default function OxfordPronunciation({ word, pronunciation }) {
  const key = (word || '').trim().toLowerCase();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const audio = useRef(null);
  const supplied = pronunciation?.source === 'Oxford' ? pronunciation : null;
  useEffect(() => {
    let active = true;
    setError('');
    setResult(null);
    if (!/^[A-Za-z][A-Za-z'-]{0,63}$/.test(key)) return;
    if (supplied) { setResult({ key, value: supplied }); return; }
    load(key).then(value => { if (active) setResult({ key, value }); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; audio.current?.pause(); };
  }, [key, supplied, retry]);
  const value = result?.key === key ? result.value : null;
  const play = async url => {
    setError('');
    const player = audio.current;
    for (const other of document.querySelectorAll('audio')) if (other !== player) other.pause();
    globalThis.speechSynthesis?.cancel();
    player.src = url;
    try { await player.play(); } catch { setError('Không phát được âm thanh Oxford. Bấm lại để thử.'); }
  };
  if (!/^[A-Za-z][A-Za-z'-]{0,63}$/.test(key)) return null;
  return <div data-testid="oxford-pronunciation" className="mt-1 text-sm not-italic text-violet-300">
    <audio ref={audio} preload="none" onError={() => setError('Không tải được âm thanh Oxford. Bấm lại để thử.')} />
    {value ? <>
      <div className="flex flex-wrap gap-x-3 gap-y-1">{['uk', 'us'].map(region => {
        const url = value[region === 'uk' ? 'audioUk' : 'audioUs'];
        return <span key={region} className="inline-flex items-center gap-1"><span>{region.toUpperCase()}: {value[region] || 'Chưa có'}</span>{url && <button type="button" onClick={() => play(url)} aria-label={`Nghe Oxford ${region.toUpperCase()}: ${word}`} className="min-h-11 min-w-11 rounded-lg border border-violet-700 px-2 hover:bg-violet-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">▶</button>}</span>;
      })}</div>
      <a href={value.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 underline">Nguồn: Oxford</a>
    </> : !error && <span className="text-xs text-slate-400" role="status">Đang tải phát âm Oxford…</span>}
    {error && <div role="alert" className="text-xs text-amber-300">{error} {!value && <button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 px-2 underline">Thử lại</button>}</div>}
  </div>;
}
