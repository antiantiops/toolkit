import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
for(const name of ['ListeningAudio','ListeningImage']){
 const s=readFileSync(new URL(`../src/app/${name}.js`,import.meta.url),'utf8');
 assert(!s.includes('clickableText(s.en)'),name);
 assert(s.includes('clickableText(transcriptParagraph('),name);
}
const s=readFileSync(new URL('../src/app/ListeningAudio.js',import.meta.url),'utf8');
assert(s.includes('key={i} disabled={!result.timed} aria-label={`Nghe lại câu ${i+1}`} onClick='));
console.log('PASS sentence rows seek only; paragraph word lookup preserved');
