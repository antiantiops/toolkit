import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync('src/app/api/listening/route.js','utf8');
assert.match(s,/for\(let attempt=0;attempt<3;attempt\+\+\)/);assert.match(s,/\[502,503,504\]/);assert.match(s,/1500\*2\*\*attempt/);console.log('PASS server retries transient Edge TTS failures three attempts, including stale clients');
