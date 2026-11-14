import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SPOTIFY_UI_TRANSLATIONS, translateSpotify } from '../src/lib/lookup/spotify-ui.mjs';

const foreignLocales = ['en', 'ja', 'ko', 'zh-TW'];

// 1. Read actual ListeningSpotify.js source code
const spotifyPath = path.resolve('src/app/ListeningSpotify.js');
const spotifySrc = fs.readFileSync(spotifyPath, 'utf8');

// 2. Extract t('...') calls
const tCalls = [...spotifySrc.matchAll(/\bt\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
assert(tCalls.length >= 25, `Expected >= 25 t('...') calls, found ${tCalls.length}`);

// 3. Verify every static phrase in dictionary has full en, ja, ko, zh-TW translations
for (const phrase of tCalls) {
  assert(
    Object.prototype.hasOwnProperty.call(SPOTIFY_UI_TRANSLATIONS, phrase),
    `SPOTIFY_UI_TRANSLATIONS missing key: "${phrase}"`
  );
  const entry = SPOTIFY_UI_TRANSLATIONS[phrase];
  for (const loc of foreignLocales) {
    assert(
      typeof entry[loc] === 'string' && entry[loc].trim().length > 0,
      `Phrase "${phrase}" must have nonempty translation for locale "${loc}"`
    );
    assert.equal(
      translateSpotify(phrase, loc),
      entry[loc],
      `translateSpotify("${phrase}", "${loc}") must return translation`
    );
  }
  // Vietnamese identity returns original phrase nonempty
  assert.equal(translateSpotify(phrase, 'vi'), phrase);
  assert.equal(translateSpotify(phrase), phrase);
}

// 4. Invariants check: targetLang and translateSpotify imported, sourceaudio URLs & metadata untouched
assert.match(spotifySrc, /import\s+\{\s*useLanguage\s*\}\s+from\s+['"]\.\/LanguageContext['"]/, 'imports useLanguage');
assert.match(spotifySrc, /import\s+\{\s*translateSpotify\s*\}\s+from\s+['"]\.\.\/lib\/lookup\/spotify-ui\.mjs['"]/, 'imports translateSpotify');
assert.match(spotifySrc, /const\s+\{\s*targetLang\s*\}\s*=\s*useLanguage\(\)/, 'extracts targetLang');
assert.match(spotifySrc, /const\s+t\s*=\s*\(text\)\s*=>\s*translateSpotify\(text,\s*targetLang\)/, 'defines local t callback');

// Verify metadata and network URLs preserved without distortion
assert.match(spotifySrc, /form\.append\('targetLang',\s*targetLang\)/, 'FormData appends targetLang');
assert.match(spotifySrc, /\/api\/spotify/, 'Spotify API endpoint preserved');
assert.match(spotifySrc, /\/api\/listening-audio/, 'Listening audio API endpoint preserved');
assert.match(spotifySrc, /\{tItem\.title\|\|tItem\.id\}/, 'Track title/id preserved');
assert.match(spotifySrc, /\{tItem\.artist\}/, 'Track artist preserved');
assert.match(spotifySrc, /src=\{'\/api\/spotify\/'\+selected\+\(variant==='original'\?'':'\?variant='\+variant\)\}/, 'Audio src preserved');
assert.match(spotifySrc, /\{current\.title\}\s*·\s*\{current\.artist\}/, 'Current track metadata display preserved');
assert.match(spotifySrc, /\{s\.en\}/, 'Transcript English text preserved');
assert.match(spotifySrc, /\{s\.vi\}/, 'Transcript Vietnamese translation preserved');

// 5. Test unknown strings pass through unchanged
assert.equal(translateSpotify('Some unknown custom track info', 'en'), 'Some unknown custom track info');
assert.equal(translateSpotify('Some unknown custom track info', 'zh-TW'), 'Some unknown custom track info');
assert.equal(translateSpotify('Some unknown custom track info', 'vi'), 'Some unknown custom track info');

console.log('checks/spotify-ui-language.mjs passed: all invariants verified.');
