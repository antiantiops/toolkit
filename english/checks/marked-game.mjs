import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marked-game-'));process.env.WORDS_DB_PATH=path.join(dir,'words.sqlite');
for(const file of ['week.js','store.js'])fs.writeFileSync(path.join(dir,file.replace('.js','.mjs')),fs.readFileSync(new URL('../src/lib/words/'+file,import.meta.url),'utf8').replace("'./week.js'","'./week.mjs'"));
const w=await import('file://'+dir+'/store.mjs'),{weekStart}=await import('file://'+dir+'/week.mjs');
for(let i=0;i<60;i++)w.saveWord('a','word '+i);
const row=w.listWords('a')[0];w.tagWord('a',row.id,true);w.saveWord('a','piece of cake.');const phrase=w.listWords('a')[0];w.tagWord('a',phrase.id,true);
assert.equal(w.markedGameRows('a',weekStart()).length,2);assert.equal(w.markedGameRows('b',weekStart()).length,0);w.tagWord('a',row.id,false);assert.deepEqual(w.markedGameRows('a',weekStart()).map(r=>r.english),['piece of cake.']);
const {usageQuestion}=await import('../src/lib/my-words-game.mjs');assert.equal(usageQuestion({word:'piece of cake.',example:'The exam was a piece of cake.'}),'The exam was a _____.');
console.log('PASS only book-tagged rows, account isolation, untag exclusion, phrase punctuation and cloze');
