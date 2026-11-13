import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lookupMeaning,lookupLacViet,lookupVDict,parseVDictHtml} from '../src/lib/lookup/meaning.mjs';
const db=process.env.LACVIET_DB_PATH || '/tmp/lacviet-compare/lacviet.sqlite';
for(const word of ['blemish','compromise','cover','engineer']) {
 const hit=lookupLacViet(word,db); assert.equal(hit.source,'lacviet');assert(hit.meaning.length);assert(!hit.meaning.includes('<'));assert(!hit.meaning.includes('Thesaurus'));
}
const fixture='<h1>testword</h1><div id="entryDefinition"><section class="unified-senses"><h2 class="word-type">danh từ</h2><div class="meaning-value unified-translation">nghĩa &amp; khác</div></section></div>';
assert.equal(parseVDictHtml(fixture,'testword')[0].senses[0],'nghĩa & khác');
assert.equal(parseVDictHtml(fixture,'wrong'),null);
let online=0,ai=0;
const aiLookup=async input=>{ai++;assert.equal(input.definition,'book sense');return {meaning:'nghĩa AI'};};
let result=await lookupMeaning({word:'blemish',context:'other sense',lacvietDbPath:db,onlineLookup:async()=>{online++;},aiLookup});
assert.equal(result.source,'lacviet');assert.equal(online,0);assert.equal(ai,0);
result=await lookupMeaning({word:'notlocal',localLookup:()=>null,onlineLookup:async()=>({meaning:'web',source:'vdict'}),aiLookup});assert.equal(result.source,'vdict');assert.equal(ai,0);
for(const status of [403,429,500]){
 const hit=await lookupVDict('missing'+status,async()=>new Response('',{status}));assert.equal(hit,null);
}
assert.equal(await lookupVDict('timeout',async()=>{throw new Error('timeout')}),null);
assert.equal(await lookupVDict('../bad',async()=>{throw Error('must not fetch')}),null);
assert.equal(await lookupVDict('mismatch',async()=>new Response(fixture)),null);
result=await lookupMeaning({word:'notlocal',definition:'book sense',localLookup:()=>null,onlineLookup:async()=>null,aiLookup});assert.equal(result.source,'ai');assert.equal(ai,1);
const page=fs.readFileSync(new URL('../src/app/page.js',import.meta.url),'utf8');
assert(page.includes('fetch("/api/quick-word"'));
assert(page.includes('fetchWithRetry("/api/word"'));
assert(page.includes('definition: words.find'));
assert(!page.includes('lookup-source'));
assert(!page.includes('if (isDictionary)'));
console.log('PASS local4, POS, no HTML, priority, VDict parse/mismatch/errors/timeout, AI definition, independent quick and detail lookups, original markup');
