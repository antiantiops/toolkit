import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'word-tags-'));
process.env.WORDS_DB_PATH=join(dir,'words.sqlite');
try {
 const {saveWord,listWords,tagWord}=await import('../src/lib/words/store.js');
 saveWord('alice','consequence');saveWord('bob','consequence');
 const word=listWords('alice')[0];
 assert.equal(word.needsReview,0);
 tagWord('alice',word.id,true);
 assert.equal(listWords('alice')[0].needsReview,1);
 assert.equal(listWords('bob')[0].needsReview,0);
 assert.throws(()=>tagWord('bob',word.id,false));
 assert.equal(listWords('alice')[0].searches,word.searches);
 tagWord('alice',word.id,false);
 assert.equal(listWords('alice')[0].needsReview,0);
 console.log('word tags: pass (toggle, ownership, counts)');
} finally {rmSync(dir,{recursive:true,force:true});}
