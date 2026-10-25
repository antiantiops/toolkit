import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_WRITING_PROMPT, writingPreferences } from '../src/lib/writing-prompt.mjs';
assert.doesNotMatch(DEFAULT_WRITING_PROMPT,/\b[ABC][12]\b/);
assert.match(writingPreferences(),/CEFR A2/);
assert.match(writingPreferences('Write at B2','A1'),/explicitly requested.*overrides/);
assert.match(writingPreferences('Use common collocations','A2'),/If no level.*CEFR A2/);
assert.match(writingPreferences('', 'B1'),/not a checklist/);
assert.throws(()=>writingPreferences('x'.repeat(4001)),/4000/);
assert.throws(()=>writingPreferences({},'B1'),/4000/);
assert.throws(()=>writingPreferences('', 'D1'),/CEFR/);
for(const route of ['writing-model','writing-review']){const s=readFileSync(new URL(`../src/app/api/${route}/route.js`,import.meta.url),'utf8');assert.match(s,/writingPreferences\(customPrompt, level\)/);}
const ui=readFileSync(new URL('../src/app/Writing.js',import.meta.url),'utf8');assert.match(ui,/aria-controls="writing-custom-prompt"/);assert.match(ui,/draft, level, customPrompt/);assert.match(ui,/title: w.title, level, customPrompt/);
console.log('PASS prompt defaults, level precedence instructions, validation, both APIs and UI payloads');
