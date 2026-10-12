import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'words-test-'));
process.env.WORDS_DB_PATH=join(dir,'words.sqlite');
const {saveWord,listWords,listWeeks,moveWord}=await import('./src/lib/words/store.js');
try {
 saveWord('alice',' Engineer ');saveWord('alice','engineer');saveWord('bob','doctor');
 assert.equal(listWords('alice')[0].searches,2);
 const {weekStart}=await import('./src/lib/words/week.js');
 assert.equal(weekStart(Date.parse('2026-10-11T18:00:00Z')),'2026-10-12');
 assert.equal(weekStart(Date.parse('2026-10-11T16:00:00Z')),'2026-10-05');
 assert.equal(listWeeks('alice')[0].searches,2);
 assert.equal(listWords('alice',Number.MAX_SAFE_INTEGER,weekStart())[0].weekSearches,2);
 assert.equal(listWords('alice',Number.MAX_SAFE_INTEGER,'2020-01-06').length,0);
 assert.equal(listWords('alice').length,1);assert.equal(listWords('alice')[0].english,'engineer');
 assert.equal(listWords('bob')[0].english,'doctor');assert.equal(listWords('charlie').length,0);
 for(let i=0;i<70;i++)saveWord('alice','word '+i);
 const first=listWords('alice');assert.equal(first.length,51);
 const second=listWords('alice',first[49].id);assert.equal(second.length,21);
 assert(!second.some(row=>first.slice(0,50).some(x=>x.id===row.id)));
 const week=weekStart(), initial=listWords('alice',Number.MAX_SAFE_INTEGER,week);
 const total=listWeeks('alice')[0].searches;
 moveWord('alice',week,initial[49].id,initial[0].id);
 const ordered=listWords('alice',Number.MAX_SAFE_INTEGER,week);
 assert.equal(ordered[0].id,initial[49].id);
 assert.equal(listWeeks('alice')[0].searches,total);
 const page2=listWords('alice',50,week);
 assert.equal(page2.length,21);
 assert(!page2.some(r=>ordered.slice(0,50).some(x=>x.id===r.id)));
 assert.throws(()=>moveWord('bob',week,initial[49].id,initial[0].id));
 assert.throws(()=>moveWord('alice','2020-01-06',initial[49].id,initial[0].id));
 saveWord('alice',ordered[2].english);
 assert.equal(listWords('alice',Number.MAX_SAFE_INTEGER,week)[0].id,ordered[0].id);
 saveWord('alice','new after custom order');
 const withNew=listWords('alice',Number.MAX_SAFE_INTEGER,week);
 assert.equal(withNew[0].english,'new after custom order');
 assert.equal(withNew[1].id,ordered[0].id);
 assert.deepEqual(withNew.slice(1).map(r=>r.id),ordered.slice(0,50).map(r=>r.id));
 assert.throws(()=>saveWord('alice','a'.repeat(501)));
 console.log('PASS SQLite deduplication, user isolation, cursor pagination, input ceiling');
} finally {rmSync(dir,{recursive:true,force:true});}

// Meaning clicks count; automatic IPA requests remain read-only.
const pageSource = (await import("node:fs")).readFileSync("src/app/page.js", "utf8");
assert(pageSource.includes("onLookup={word => lookupWord(word, \"\", false)}"));
