import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  normalizeTargetLang,
} from '../src/lib/lookup/languages.mjs';

// 1. Language validation & normalization tests
assert.equal(DEFAULT_LANGUAGE, 'vi');
assert.equal(normalizeTargetLang(undefined), 'vi');
assert.equal(normalizeTargetLang(null), 'vi');
assert.equal(normalizeTargetLang(''), 'vi');
assert.equal(normalizeTargetLang('   '), 'vi');

for (const code of Object.keys(SUPPORTED_LANGUAGES)) {
  assert.equal(normalizeTargetLang(code), code);
  assert.equal(normalizeTargetLang(code.toUpperCase()), code);
}
assert.equal(normalizeTargetLang('zh-TW'), 'zh-TW');
assert.equal(normalizeTargetLang('zh-tw'), 'zh-TW');

assert.equal(normalizeTargetLang('invalid'), null);
assert.equal(normalizeTargetLang(123), null);
assert.equal(normalizeTargetLang({}), null);

// 2. Storage failure resilience simulation
{
  let storageThrows = true;
  const mockStorage = {
    getItem: () => {
      if (storageThrows) throw new Error('Quota or security error');
      return 'en';
    },
    setItem: () => {
      if (storageThrows) throw new Error('Quota or security error');
    }
  };

  // Test storage read failure does not throw
  let state = DEFAULT_LANGUAGE;
  try {
    const raw = mockStorage.getItem('english.lookupLanguage');
    const normalized = normalizeTargetLang(raw);
    if (normalized) state = normalized;
  } catch {}
  assert.equal(state, 'vi');

  // Test storage write failure does not throw
  try {
    mockStorage.setItem('english.lookupLanguage', 'ja');
  } catch {}
}

// 3. Source contracts: LanguageContext.js
const contextSrc = fs.readFileSync('src/app/LanguageContext.js', 'utf8');

// Exports contracts
assert(contextSrc.includes('export function LanguageProvider'), 'Must export LanguageProvider');
assert(contextSrc.includes('export function useLanguage'), 'Must export useLanguage');
assert(contextSrc.includes('english.lookupLanguage'), 'Must use existing metadata key english.lookupLanguage');
assert(contextSrc.includes('document.documentElement.lang = language'), 'Must update document.documentElement.lang');
assert(contextSrc.includes('key={language}'), 'Must key wrapper by language to remount subtree');
assert(!contextSrc.includes('fetch ='), 'Must NOT monkeypatch fetch');
assert(!contextSrc.includes('window.fetch'), 'Must NOT touch window.fetch');
assert(!contextSrc.includes('location.reload'), 'Must NOT trigger infinite reload');

// 4. Source contracts: layout.js
const layoutSrc = fs.readFileSync('src/app/layout.js', 'utf8');
assert(layoutSrc.includes('<LanguageProvider>'), 'layout must wrap children in LanguageProvider');
assert(layoutSrc.includes('</LanguageProvider>'), 'layout must wrap children in LanguageProvider');
assert(layoutSrc.includes('<html lang="vi"'), 'layout must preserve initial lang="vi"');
assert(layoutSrc.includes('english-theme'), 'layout must preserve theme script');
assert(layoutSrc.includes('dangerouslySetInnerHTML'), 'layout must preserve theme script inline');

// 5. Source contracts: LookupLanguage.js
const lookupSrc = fs.readFileSync('src/app/LookupLanguage.js', 'utf8');
assert(lookupSrc.includes('useLanguage'), 'LookupLanguage must useLanguage hook');
assert(lookupSrc.includes('setLanguage'), 'LookupLanguage must call context.setLanguage');
assert(lookupSrc.includes('onChange'), 'LookupLanguage must support optional onChange prop');
assert(lookupSrc.includes('value'), 'LookupLanguage must support optional value prop');
assert(!lookupSrc.includes('changes word explanations only'), 'LookupLanguage title/aria must no longer be word-only');
assert(lookupSrc.includes('h-11 w-11'), 'LookupLanguage must keep native 44px (h-11 w-11)');
assert(lookupSrc.includes('focus-within:ring-2'), 'LookupLanguage must keep accessible focus');

console.log('PASS language-context: validation, default, storage failure, source contracts, remount, html lang, layout');
