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
  const [playState, setPlayState] = useState(null);
  const audio = useRef(null);
  const busyRef = useRef(false);
  const runRef = useRef(0);
  const supplied = pronunciation?.source === 'Oxford' ? pronunciation : null;

  const reset = () => {
    busyRef.current = false;
    setPlayState(null);
  };

  useEffect(() => {
    let active = true;
    setError('');
    setResult(null);
    if (/^[A-Za-z][A-Za-z'-]{0,63}$/.test(key)) {
      if (supplied) {
        setResult({ key, value: supplied });
      } else {
        load(key).then(value => { if (active) setResult({ key, value }); })
          .catch(e => { if (active) setError(e.message); });
      }
    }
    return () => {
      active = false;
      runRef.current += 1;
      busyRef.current = false;
      setPlayState(null);
      audio.current?.pause();
    };
  }, [key, supplied, retry]);

  const value = result?.key === key ? result.value : null;

  const play = async (region, url) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const run = ++runRef.current;
    setPlayState({ region, phase: 'loading' });
    setError('');
    const player = audio.current;
    if (!player) {
      reset();
      return;
    }
    for (const other of document.querySelectorAll('audio')) if (other !== player) other.pause();
    globalThis.speechSynthesis?.cancel();
    player.src = url;
    try {
      await player.play();
    } catch {
      if (runRef.current !== run) return;
      reset();
      setError('Không phát được âm thanh Oxford. Bấm lại để thử.');
    }
  };

  if (!/^[A-Za-z][A-Za-z'-]{0,63}$/.test(key)) return null;

  const isBusy = busyRef.current || Boolean(playState);

  return <div data-testid="oxford-pronunciation" className="mt-1 text-sm not-italic text-violet-300">
    <audio
      ref={audio}
      preload="none"
      onPlaying={() => { if (busyRef.current) setPlayState(s => (s ? { ...s, phase: 'playing' } : null)); }}
      onWaiting={() => { if (busyRef.current) setPlayState(s => (s ? { ...s, phase: 'loading' } : null)); }}
      onEnded={reset}
      onPause={reset}
      onError={() => {
        reset();
        setError('Không tải được âm thanh Oxford. Bấm lại để thử.');
      }}
    />
    {value ? <>
      <div className="flex flex-wrap gap-x-3 gap-y-1">{['uk', 'us'].map(region => {
        const url = value[region === 'uk' ? 'audioUk' : 'audioUs'];
        const isThisLoading = playState?.region === region && playState?.phase === 'loading';
        const isThisPlaying = playState?.region === region && playState?.phase === 'playing';
        const label = `Nghe Oxford ${region.toUpperCase()}: ${word}`;
        return <span key={region} className="inline-flex items-center gap-1">
          <span>{region.toUpperCase()}: {value[region] || 'Chưa có'}</span>
          {url && <button
            type="button"
            onClick={() => play(region, url)}
            disabled={isBusy}
            aria-busy={isThisLoading}
            aria-label={label}
            title={label}
            className={`inline-flex min-h-7 min-w-7 items-center justify-center p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${
              isThisPlaying ? 'text-violet-400' : 'hover:text-violet-100'
            } ${isBusy && !isThisLoading && !isThisPlaying ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {isThisLoading ? (
              <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167A2.167 2.167 0 001 9.167v1.666A2.167 2.167 0 003.167 13h1.536l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.06 6.25 6.25 0 010 8.84.75.75 0 001.06 1.06 7.75 7.75 0 000-10.96zM13.829 7.172a.75.75 0 00-1.061 1.06 3.25 3.25 0 010 4.596.75.75 0 101.06 1.06 4.75 4.75 0 000-6.716z" />
              </svg>
            )}
          </button>}
        </span>;
      })}</div>
      <a href={value.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 underline">Nguồn: Oxford</a>
    </> : !error && <span className="text-xs text-slate-400" role="status">Đang tải phát âm Oxford…</span>}
    {error && <div role="alert" className="text-xs text-amber-300">{error} {!value && <button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 px-2 underline">Thử lại</button>}</div>}
  </div>;
}
