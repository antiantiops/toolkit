const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = file => readFileSync(join(__dirname, 'src/app', file), 'utf8');
for (const file of ['../lib/vocabulary/prompts.js', 'api/word/route.js']) assert.ok(read(file).includes('contrastTip'), file);
const page = read('page.js');
for (const marker of ['vocab-contrast-tip', 'lookup-contrast-tip', 'whitespace-pre-line']) assert.ok(page.includes(marker), marker);
assert.ok(page.startsWith('"use client";'));
console.log('PASS: contrast tip prompt/UI contract');
for (const file of ['../lib/vocabulary/prompts.js', 'api/word/route.js']) {
  assert.ok(read(file).includes('NEVER introduce extra comparison words'));
  assert.ok(read(file).includes('EVERY word already listed'));
}

for (const file of ['../lib/vocabulary/prompts.js', 'api/word/route.js']) assert.ok(read(file).includes('contrastExamples'), file);
assert.ok(page.includes('data-testid="contrast-example"'));
assert.ok(page.includes('renderContrastTip(w.contrastTip, w.contrastExamples)'));
assert.ok(page.includes('renderContrastTip(lookup.contrastTip, lookup.contrastExamples)'));
console.log('PASS: bilingual comparison examples in cards and lookup');

assert.ok(page.includes('<details data-testid="contrast-example"'));
assert.ok(page.includes('<span>Ví dụ</span>'));
assert.ok(!page.includes('<details open data-testid="contrast-example"'));
console.log('PASS: comparison examples collapsed by default with native details');

assert.ok(page.includes('data-testid="contrast-example-body"'));
assert.ok(page.includes("absolute right-0 top-0"));

const css = read('globals.css');
assert.ok(page.includes('className="example-chevron"'));
assert.ok(css.includes('details:not([open]) > summary .example-chevron'));
assert.ok(css.includes('example-nudge 4.5s'));
assert.ok(css.includes('translateY(2px)'));
assert.ok(css.includes('.example-chevron { animation: none !important; }'));
console.log('PASS: closed-only chevron hint with reduced-motion support');

const modal = page.slice(page.indexOf('{/* Lookup modal */}'));
assert.ok(modal.includes('data-testid="lookup-word-header"'));
assert.ok(modal.indexOf('{lookup.partOfSpeech}') < modal.indexOf('{lookup.ipa}'));
assert.ok(modal.indexOf('{lookup.ipa}') < modal.indexOf('{lookup.easyReading}'));
assert.ok(modal.indexOf('{lookup.easyReading}') < modal.indexOf('{lookup.meaning}'));
assert.ok(!modal.includes('🔊 Nghe từ'));
console.log('PASS: lookup order word/speaker, part of speech, IPA, easy reading, meaning');
