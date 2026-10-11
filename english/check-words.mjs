import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'words-test-'));
process.env.WORDS_DB_PATH=join(dir,'words.sqlite');
const {saveWord,listWords}=await import('./src/lib/words/store.js');
try {
 saveWord('alice',' Engineer ');saveWord('alice','engineer');saveWord('bob','doctor');
 assert.equal(listWords('alice').length,1);assert.equal(listWords('alice')[0].english,'engineer');
 assert.equal(listWords('bob')[0].english,'doctor');assert.equal(listWords('charlie').length,0);
 for(let i=0;i<70;i++)saveWord('alice','word '+i);
 const first=listWords('alice');assert.equal(first.length,51);
 const second=listWords('alice',first[49].id);assert.equal(second.length,21);
 assert(!second.some(row=>first.slice(0,50).some(x=>x.id===row.id)));
 assert.throws(()=>saveWord('alice','a'.repeat(501)));
 console.log('PASS SQLite deduplication, user isolation, cursor pagination, input ceiling');
} finally {rmSync(dir,{recursive:true,force:true});}
