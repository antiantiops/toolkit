const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const read = file => readFileSync(join(__dirname, 'src/app', file), 'utf8');
for (const file of ['api/analyze/route.js', 'api/word/route.js']) assert.ok(read(file).includes('contrastTip'), file);
const page = read('page.js');
for (const marker of ['vocab-contrast-tip', 'lookup-contrast-tip', 'whitespace-pre-line']) assert.ok(page.includes(marker), marker);
assert.ok(page.startsWith('"use client";'));
console.log('PASS: contrast tip prompt/UI contract');
for (const file of ['api/analyze/route.js', 'api/word/route.js']) {
  assert.ok(read(file).includes('NEVER introduce extra comparison words'));
  assert.ok(read(file).includes('EVERY word already listed'));
}
