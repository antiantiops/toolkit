import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ui=fs.readFileSync('src/app/PronunciationRecorder.js','utf8');
const api=fs.readFileSync('src/app/api/pronunciation-assess/route.js','utf8');
const page=fs.readFileSync('src/app/page.js','utf8');
assert.match(page, /<PronunciationRecorder key=\{lookup.word\} word=\{lookup.word\}/);
for(const marker of ['getUserMedia','30000','URL.revokeObjectURL','controller.current?.abort()','media.getTracks().forEach','Gửi đánh giá','Nghe lại bản ghi']) assert(ui.includes(marker),marker);
assert(api.includes("model: 'ag/gemini-3.8-flash-high'"));
assert(api.includes("type: 'input_audio'"));
assert(api.includes('cacheOwner(request)'));
assert(api.includes('active.delete(owner)'));
const samples=Float32Array.from([-1,-.5,0,.5,1]);let closed=false;
class AudioContext {async decodeAudioData(){return {duration:1,sampleRate:16000,getChannelData:()=>samples};}async close(){closed=true;}}
const encode=vm.runInNewContext(ui.slice(ui.indexOf('async function wav('),ui.indexOf('\nexport default'))+'; wav',{AudioContext,Blob,ArrayBuffer,DataView,Math,Error});
const blob=await encode(new Blob(['test'])), view=new DataView(await blob.arrayBuffer());
assert.equal(blob.type,'audio/wav');assert.equal(view.getUint32(24,true),16000);assert.equal(view.getUint32(40,true),10);assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(52,true),32767);assert(closed);
console.log('PASS WAV PCM encoding, model/audio contract, auth, cleanup and popup placement');
