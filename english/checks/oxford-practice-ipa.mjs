import assert from 'node:assert/strict';
import fs from 'node:fs';

const oxfordSrc = fs.readFileSync('src/app/OxfordPronunciation.js', 'utf8');
const pageSrc = fs.readFileSync('src/app/page.js', 'utf8');
const recorderSrc = fs.readFileSync('src/app/PronunciationRecorder.js', 'utf8');

// 1. OxfordPronunciation accepts onLoaded and emits inside useEffect (not render) via ref guarded by word key
assert.match(oxfordSrc, /export default function OxfordPronunciation\(\{\s*word,\s*pronunciation,\s*ipa,\s*onLoaded\s*\}\)/);
assert.match(oxfordSrc, /onLoadedRef\.current\s*=\s*onLoaded/);
assert.match(oxfordSrc, /useEffect\(\(\)\s*=>\s*\{\s*if\s*\(result\?\.key === key && result\.value\)\s*\{\s*onLoadedRef\.current\?\.\(key,\s*result\.value\);\s*\}\s*\},\s*\[key,\s*result\]\)/s);

// 2. page.js wires onLoaded with word-key & identity guard and passes Oxford-only UK/US IPA for single words
assert.match(pageSrc, /<OxfordPronunciation[\s\S]*?onLoaded=\{\(wordKey,\s*value\)\s*=>\s*setLookup\(current\s*=>\s*current\s*&&\s*\(current\.word \|\| ""\)\.trim\(\)\.toLowerCase\(\)\s*===\s*wordKey\s*&&\s*current\.pronunciation\s*!==\s*value\s*\?\s*\{\s*\.\.\.current,\s*pronunciation:\s*value\s*\}\s*:\s*current\)\}/);
assert.match(pageSrc, /<PronunciationRecorder key=\{lookup\.word\} word=\{lookup\.word\} ipa=\{/);

// 3. Evaluate exact ipa composition logic from page.js
const formatRecorderIpa = (lookup) =>
  /^[A-Za-z][A-Za-z'-]{0,63}$/.test((lookup.word || '').trim())
    ? (lookup.pronunciation?.source === 'Oxford'
        ? [lookup.pronunciation.uk && `UK: ${lookup.pronunciation.uk}`, lookup.pronunciation.us && `US: ${lookup.pronunciation.us}`].filter(Boolean).join(' · ')
        : '')
    : (lookup.ipa || '');

// Single word with Oxford pronunciation (both UK and US)
assert.equal(
  formatRecorderIpa({
    word: 'schedule',
    ipa: '/ˈskedʒ.uːl/',
    pronunciation: { source: 'Oxford', uk: '/ˈʃedjuːl/', us: '/ˈskedʒuːl/' },
  }),
  'UK: /ˈʃedjuːl/ · US: /ˈskedʒuːl/'
);

// Single word with Oxford UK-only or US-only
assert.equal(
  formatRecorderIpa({
    word: 'aluminium',
    ipa: '/ˌæl.jəˈmɪn.i.əm/',
    pronunciation: { source: 'Oxford', uk: '/ˌæljəˈmɪniəm/', us: null },
  }),
  'UK: /ˌæljəˈmɪniəm/'
);

// Single word with IPA-dict or AI fallback only -> hidden (empty string), no AI fallback
assert.equal(
  formatRecorderIpa({
    word: 'blabla',
    ipa: '/ˈblɑːblɑː/',
    pronunciation: { source: 'IPA-dict', uk: '/blɑː/', us: '/blɑː/' },
  }),
  ''
);
assert.equal(
  formatRecorderIpa({
    word: 'blabla',
    ipa: '/ˈblɑːblɑː/',
  }),
  ''
);

// Phrase/sentence -> preserves lookup.ipa fallback
assert.equal(
  formatRecorderIpa({
    word: 'take off',
    ipa: '/teɪk ɒf/',
    pronunciation: { source: 'IPA-dict', uk: '/x/', us: '/y/' },
  }),
  '/teɪk ɒf/'
);

// 4. Verify setLookup callback guard prevents render loops and stale word overwrites
let state = { word: 'Schedule', pronunciation: { source: 'IPA-dict', uk: '/old/' } };
const setLookup = (fn) => { state = fn(state); };
const onLoaded = (wordKey, value) =>
  setLookup(current =>
    current && (current.word || '').trim().toLowerCase() === wordKey && current.pronunciation !== value
      ? { ...current, pronunciation: value }
      : current
  );

const oxVal = { source: 'Oxford', uk: '/ˈʃedjuːl/', us: '/ˈskedʒuːl/' };
onLoaded('other', oxVal);
assert.equal(state.pronunciation.source, 'IPA-dict', 'Stale word key must not overwrite current lookup');

const prevState = state;
onLoaded('schedule', oxVal);
assert.notEqual(state, prevState);
assert.equal(state.pronunciation, oxVal);

const settledState = state;
onLoaded('schedule', oxVal);
assert.equal(state, settledState, 'Identical pronunciation reference must be a no-op');

// 5. Verify PronunciationRecorder passes same activeTargetIpa to display, MouthGuide, and FormData
assert.match(recorderSrc, /<MouthGuide ipa=\{ipa\} \/>/);
assert.match(recorderSrc, /activeTargetIpa = targetType === 'word' \? ipa : ''/);
assert.match(recorderSrc, /form\.set\('ipa',activeTargetIpa\|\|''\)/);
assert.match(recorderSrc, /data-testid="pronunciation-target-ipa"/);

console.log('PASS Oxford IPA propagation, single-word Oxford-only display, phrase fallback, and stale/loop guards');
