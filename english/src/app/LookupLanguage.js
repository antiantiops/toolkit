'use client';
import { SUPPORTED_LANGUAGES } from '../lib/lookup/languages.mjs';

export default function LookupLanguage({ value, onChange }) {
  const language = SUPPORTED_LANGUAGES[value] || SUPPORTED_LANGUAGES.vi;
  return <div className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 bg-slate-800 focus-within:ring-2 focus-within:ring-blue-400" title="Word lookup language — changes word explanations only">
    <span aria-hidden="true" className="text-xl">{language.flag}</span>
    <select aria-label="Word lookup language — changes word explanations only" value={value} onChange={event => onChange(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0">
      {Object.values(SUPPORTED_LANGUAGES).map(item => <option key={item.code} value={item.code}>{item.nativeLabel}</option>)}
    </select>
  </div>;
}
