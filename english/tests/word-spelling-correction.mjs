import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lookupKey } from '../src/lib/lookup/cache.js';

assert.equal(lookupKey('Frige', ''), '["word-v2","frige",""]');
const route = fs.readFileSync(new URL('../src/app/api/word/route.js', import.meta.url), 'utf8');
assert.ok(route.includes('"typoOf"'));
assert.ok(route.includes('result.typoOf = result.word.toLowerCase() !== rawTrim.toLowerCase() ? rawTrim : ""'));
assert.ok(route.includes('cacheLookup(owner, lookupKey(result.word, context)'));
const page = fs.readFileSync(new URL('../src/app/page.js', import.meta.url), 'utf8');
assert.ok(page.includes('data-testid="lookup-spelling-correction"'));
assert.ok(page.includes('rememberEnglish(canonical)'));
assert.ok(page.includes('loadMeta(canonical)'));
console.log('PASS word-spelling-correction');
