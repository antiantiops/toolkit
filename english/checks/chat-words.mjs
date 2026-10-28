import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chat-words-check-'));process.env.WORDS_DB_PATH=path.join(dir,'words.sqlite');
const root=new URL('../src/lib/words/',import.meta.url);
for(const file of ['week.js','store.js','chat-store.js']){let s=fs.readFileSync(new URL(file,root),'utf8').replace("from './store'","from './store.mjs'").replace("from './week.js'","from './week.mjs'");fs.writeFileSync(path.join(dir,file.replace('.js','.mjs')),s);}
const store=await import('file://'+dir+'/chat-store.mjs'),words=await import('file://'+dir+'/store.mjs');
const item={english:'put off',meaning:'trì hoãn',example:'We put off the meeting.',kind:'phrase'};
assert(store.enabled('a'));assert(store.claim('a','one'));assert(!store.claim('a','one'));store.finish('a','one',[item]);assert.equal(words.listWords('a').length,1);assert.equal(words.listWords('b').length,0);assert.equal(store.contexts('a',words.listWords('a'))[0].chat.meaning,item.meaning);
assert(store.claim('a','two'));store.finish('a','two',[item]);assert.equal(words.listWords('a').length,1);assert.equal(words.listWords('a')[0].searches,2);assert.deepEqual(JSON.parse(store.job('a','two').items),[]);
store.setEnabled('b',false);assert(store.claim('b','one'));store.finish('b','one',[item]);assert.equal(words.listWords('b').length,0);store.setEnabled('b',true);store.claim('b','three');store.finish('b','three',[item]);store.undo('a','one');assert.equal(words.listWords('b').length,1);assert.equal(words.listWords('a').length,1);store.undo('b','three');assert.equal(words.listWords('b').length,0);
const route=fs.readFileSync(new URL('../src/app/api/chat/route.js',import.meta.url),'utf8');assert(route.includes('after(()=>extract('));assert(route.includes('currentUser(request)'));
console.log('PASS account isolation, duplicate job claim, word dedupe, contextual meaning, opt-out, safe undo, after-response extraction');
fs.rmSync(dir,{recursive:true,force:true});
