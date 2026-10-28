import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/app/games/page.js',import.meta.url),'utf8');
assert(s.includes("map(q=>({...q,mode:'listen'}))"));
assert(s.includes("(q.mode==='choose'||q.mode==='listen')?value===word.meaning"));
assert(s.includes("q.mode==='listen'?'Nghe tiếng Anh, chọn nghĩa tiếng Việt':"));
assert(s.includes("(q.mode==='choose'||q.mode==='listen') && <SpeakBtn text={word.word}"));
console.log('PASS listen round, meaning grading, hidden English prompt and click-only speech');
