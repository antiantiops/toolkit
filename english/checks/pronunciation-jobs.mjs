import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {createHash} from 'node:crypto';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pron-jobs-'));let pending=[],calls=0,fail=false;
let src=fs.readFileSync('src/app/api/pronunciation-assess/route.js','utf8').replace(/^import .*;$/mg,'').replace(/export /g,'');
const context=vm.createContext({fs,path,os,createHash,Buffer,File,FormData,URL,process:{env:{CACHE_DIR:dir}},console,globalThis:{},setTimeout:f=>setTimeout(f,1),NextResponse:{json:(body,{status=200}={})=>({status,body})},cacheOwner:r=>r.headers.get('owner'),after:f=>pending.push(f),callJson:async()=>{calls++;if(fail)throw Error('test timeout');return {status:'feedback',heard:'test',summary:'test',tips:[]};}});
vm.runInContext(src+';globalThis.api={POST,GET};',context);const {POST,GET}=context.globalThis.api;
function request(owner='a',audio=true){const b=Buffer.alloc(32044);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);if(audio)for(let i=44;i<b.length;i+=2)b.writeInt16LE(1000,i);const f=new FormData();f.set('word','test');f.set('file',new File([b],'test.wav'));return {headers:new Headers({'owner':owner}),formData:async()=>f};}
const get=(id,owner='a')=>GET({url:'http://test?jobId='+id,headers:new Headers({owner})});
try{
assert.equal((await POST(request(''))).status,401);
assert.equal((await POST(request('silent',false))).body.result.status,'retry');assert.equal(calls,0);
let r=await POST(request());assert.equal(r.status,202);const id=r.body.jobId;assert.equal((await POST(request())).body.jobId,id);assert.equal(pending.length,1);assert.equal((await get(id,'b')).status,404);
await pending.shift()();assert.equal(calls,1);assert.equal((await get(id)).body.status,'completed');assert.equal((await POST(request())).status,200);
fail=true;r=await POST(request('fail'));await pending.shift()();assert.equal(calls,3);assert.equal((await get(r.body.jobId,'fail')).body.status,'failed');
fail=false;const retry={headers:new Headers({owner:'fail','content-type':'application/json'}),json:async()=>({jobId:r.body.jobId,retry:true})};assert.equal((await POST(retry)).status,202);await pending.shift()();assert.equal((await get(r.body.jobId,'fail')).body.status,'completed');
r=await POST(request('restart'));context.globalThis.pronunciationRuns.clear();assert.equal((await get(r.body.jobId,'restart')).body.status,'failed');assert(fs.existsSync(path.join(dir,'pronunciation-jobs',r.body.jobId+'.wav')));
console.log('PASS 202, dedupe, silence, owner isolation, 2-attempt failure, retry saved WAV, interrupted-job detection');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
