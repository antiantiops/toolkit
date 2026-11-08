import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/app/PronunciationRecorder.js',import.meta.url),'utf8');
assert.match(s,/rec\.onstop = null; rec\.stop\(\)/);
assert.match(s,/stream\.current\?\.getTracks\(\)\.forEach\(t => t\.stop\(\)\);\s*start\(\)/);
assert.match(s,/aria-label="Ghi âm lại"/);
console.log('PASS discard recording and restart');
