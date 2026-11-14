'use client';
import { useLanguage } from './LanguageContext';
import { SUPPORTED_LANGUAGES } from '../lib/lookup/languages.mjs';

export default function LookupLanguage({ value, onChange }) {
  const context = useLanguage();
  const currentLang = value !== undefined ? value : (context?.language || 'vi');
  const language = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.vi;

  const handleChange = (event) => {
    const nextCode = event.target.value;
    if (context?.setLanguage) {
      context.setLanguage(nextCode);
    }
    if (typeof onChange === 'function') {
      onChange(nextCode);
    }
  };

  return (
    <div
      className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 bg-slate-800 focus-within:ring-2 focus-within:ring-blue-400"
      title="App and lookup language"
    >
      <span aria-hidden="true" className="text-xl">{language.flag}</span>
      <select
        aria-label="App and lookup language"
        value={currentLang}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
      >
        {Object.values(SUPPORTED_LANGUAGES).map(item => (
          <option key={item.code} value={item.code}>{item.nativeLabel}</option>
        ))}
      </select>
    </div>
  );
}
