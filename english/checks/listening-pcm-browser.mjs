import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 const page=await browser.newPage();
 const source=fs.readFileSync(new URL('../src/lib/listening/pcm-audio.mjs',import.meta.url),'utf8');
 const clips=['/tmp/listening-probe-first.mp3','/tmp/listening-failed-probe.mp3'].map(p=>fs.readFileSync(p).toString('base64'));
 const result=await page.evaluate(async ({source,clips})=>{
  globalThis.Audio=function(){throw new Error('Detached metadata probe forbidden');};
  const {decodeSpeech,speechWav}=await import(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
  const decoded=await Promise.all(clips.map(s=>decodeSpeech(new Blob([Uint8Array.from(atob(s),c=>c.charCodeAt(0))],{type:'audio/mpeg'}))));
  const wav=speechWav(decoded), joined=await decodeSpeech(wav);
  let rejected=false;try{await decodeSpeech(new Blob(['not audio']));}catch{rejected=true;}
  return {duration:joined.duration,expected:decoded.reduce((n,a)=>n+a.duration,0),rate:joined.sampleRate,rejected,type:wav.type};
 },{source,clips});
 assert.ok(Math.abs(result.duration-result.expected)<1/24000);assert.equal(result.rate,24000);assert.equal(result.type,'audio/wav');assert.equal(result.rejected,true);
 console.log('PASS metadata unavailable; exact MP3 clips decode and join; corrupt audio rejected',result);
} finally {await browser.close();}
