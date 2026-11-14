'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, normalizeTargetLang } from '../lib/lookup/languages.mjs';
import { translateUi } from '../lib/lookup/ui-language.mjs';

const STORAGE_KEY = 'english.lookupLanguage';

const defaultT = (text) => text;

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  targetLang: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  supportedLanguages: SUPPORTED_LANGUAGES,
  t: defaultT,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const normalized = normalizeTargetLang(stored);
      if (normalized && normalized !== DEFAULT_LANGUAGE) {
        setLanguageState(normalized);
      }
    } catch {
      // localStorage disabled or failed
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((nextLang) => {
    const normalized = normalizeTargetLang(nextLang);
    if (!normalized) {
      return;
    }
    setLanguageState(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // localStorage failed or quota exceeded
    }
  }, []);

  const t = useCallback((text) => translateUi(text, language), [language]);

  const value = {
    language,
    targetLang: language,
    setLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      <div key={language} className="contents">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { LanguageContext, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };
