const assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('src/app/page.js','utf8');
assert.equal((s.match(/mode="vocab" words=\{words\}/g)||[]).length,1);
assert(s.includes('!loading && !practice && words.length >= 4 && words.every(w => !w.pending)'));
for(const [loading,practice,pending,expected] of [[true,false,false,false],[false,true,false,false],[false,false,true,false],[false,false,false,true]])assert.equal(!loading&&!practice&&Array(4).fill({pending}).every(w=>!w.pending),expected);
console.log('PASS one vocabulary exercise block, hidden during analysis, pending enrichment and old practice');
