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
  return <div className="mb-3 flex justify-end"><button type="button" id="theme-switch" aria-label="Giao diện sáng" aria-pressed={light} onClick={toggle} className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">{light ? '☾ Dark' : '☀ Light'}</button></div>;
}
