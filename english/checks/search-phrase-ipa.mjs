import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/app/page.js',import.meta.url),'utf8');
const route=readFileSync(new URL('../src/app/api/lookup/route.js',import.meta.url),'utf8');
assert(page.indexOf('data-testid="search-phrase-ipa"')>page.indexOf('clickableText(quickResult.corrected)'));
assert(page.includes('{quickResult.ipa}'));
assert.equal((route.match(/"ipa":/g)||[]).length,2);
assert(route.includes('"ipa-v1"'));
console.log('PASS both translation directions request full phrase IPA; result renders IPA below English; old server cache invalidated');
