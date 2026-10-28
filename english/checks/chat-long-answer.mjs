import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const file of ['route.js','generate.js']){
 const source=readFileSync(new URL('../src/app/api/chat/'+file,import.meta.url),'utf8');
 const limit=source.match(/m\.content\.length\s*>\s*\(m\.role\s*===\s*['"]assistant['"]\s*\?\s*16000\s*:\s*4000\)/)?.[0];
 assert(limit,file);const tooLong=Function('m','return '+limit);
 assert.equal(tooLong({role:'assistant',content:'x'.repeat(4774)}),false);
 assert.equal(tooLong({role:'assistant',content:'x'.repeat(16001)}),true);
 assert.equal(tooLong({role:'user',content:'x'.repeat(4001)}),true);
 assert(source.includes('250000'));
}
console.log('PASS both chat validators accept prior 4774-character answer, retain user and total payload bounds');
