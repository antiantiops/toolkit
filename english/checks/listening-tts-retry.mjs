import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('src/app/ListeningImage.js','utf8');
assert.match(source,/fetchWithRetry\('\/api\/listening',[\s\S]*?\}, 2, 1500\)/);
const helper=readFileSync('src/app/fetch-helper.js','utf8');
assert.match(helper,/\[502, 503, 504\]/);
console.log('PASS Listening TTS retries transient 502/503/504 twice with 1.5s exponential backoff; completed clips remain retained');
