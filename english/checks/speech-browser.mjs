import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {joinSpeech} from '../src/lib/join-speech.mjs';
const samples=new Float32Array(2400);samples.fill(0.1,500,1900);
const audio=Buffer.from(await joinSpeech([samples],24000).arrayBuffer());
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const text='Chủ ngữ he đi với is.';
 let calls=0;const spoken=[];
 await page.addInitScript(()=>{window.played=[];window.Audio=class {pause(){} play(){window.played.push(this.src);setTimeout(()=>this.onended?.(),30);return Promise.resolve();}};});
 await page.route('**/api/session?*',r=>{const type=new URL(r.request().url()).searchParams.get('type');return r.fulfill({json:type==='manifest'?{available:{grammar:true}}:type==='grammar'?{session:{grammar:{title:'Passive voice',titleVietnamese:'Câu bị động',keyIdea:text,rules:[]}}}:{session:{}}});});
 await page.route('**/api/speech-segments',async r=>{calls++;await new Promise(resolve=>setTimeout(resolve,150));return r.fulfill({json:{segments:[{text:'Chủ ngữ ',lang:'vi-VN'},{text:'he',lang:'en-US'},{text:' đi với ',lang:'vi-VN'},{text:'is.',lang:'en-US'}]}});});
 await page.route('**/api/tts',r=>{spoken.push(r.request().postDataJSON());return r.fulfill({body:audio,contentType:'audio/wav'});});
 await page.goto('http://192.168.101.36:8085/');
 const buttons=await page.getByRole('button').allTextContents();
 const tab=page.getByRole('button').filter({hasText:/Grammar|Ngữ pháp/}).first();await tab.click();
 const speaker=page.getByRole('button',{name:'Đọc tiếng Việt',exact:true}).first();await speaker.click();assert.equal(await speaker.getAttribute('aria-busy'),'true');
 await page.waitForFunction(()=>window.played.length===1);await page.waitForTimeout(150);
 assert.deepEqual(spoken.map(s=>s.lang),['vi-VN','en-US','vi-VN','en-US']);assert.equal(spoken.map(s=>s.text).join(''),text);
 await speaker.click();await page.waitForFunction(()=>window.played.length===2);assert.equal(calls,1);assert.equal(spoken.length,4);
 console.log('PASS mobile speaker: spinner, VI/EN/VI/EN downloaded then single joined playback, exact text, replay cache; audio mocked, phone sound unverified');
}finally{await browser.close();}
