import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('./src/app/MyWords.js', import.meta.url), 'utf8');
assert.equal((source.match(/flex h-96/g) || []).length, 2, 'Both animation layers keep same fixed height');
assert(source.includes('overflowAnchor:"none"'), 'Changing card content must not move document scroll anchor');
assert(source.includes('relative overflow-hidden px-1'), 'Swipe animation stays inside deck');
assert(source.includes('overflow-y-auto overscroll-contain'), 'Long phrases remain readable inside card');
console.log('PASS fixed review height, scroll anchor, animation clipping, long text overflow');
