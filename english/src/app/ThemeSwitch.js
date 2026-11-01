'use client';
import { useEffect, useState } from 'react';
export default function ThemeSwitch() {
  const [light, setLight] = useState(false);
  useEffect(() => setLight(document.documentElement.dataset.theme === 'light'), []);
  function toggle() {
    const next = !light;
    document.documentElement.dataset.theme = next ? 'light' : 'dark';
    try { localStorage.setItem('english-theme', next ? 'light' : 'dark'); } catch {}
    setLight(next);
  }
  return <button type="button" id="theme-switch" aria-label="Giao diện sáng" aria-pressed={light} title={light ? 'Chuyển sang Dark' : 'Chuyển sang Light'} onClick={toggle} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
      <g className="theme-sun"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5" /></g>
      <path className="theme-moon" d="M20.5 13.1A8.5 8.5 0 0 1 10.9 3.5a8.5 8.5 0 1 0 9.6 9.6Z" />
    </svg>
  </button>;
}
