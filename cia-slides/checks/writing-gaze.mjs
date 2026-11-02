import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,lang] of [[1440,'vi'],[1440,'en'],[390,'vi']]){
 const p=await b.newPage({viewport:{width,height:900}});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);await p.clock.install();await p.clock.pauseAt(new Date());await p.goto((process.env.TEST_URL||'http://127.0.0.1:8255')+'/#8');const scene=p.locator('.coach-scene');await scene.waitFor();
 const line=()=>p.locator('.coach-email p span').evaluate(e=>new DOMMatrix(getComputedStyle(e,'::after').transform).a);
 for(const stage of [0,1,2,3,4]){
  await p.clock.runFor(stage===0?100:stage===1?1100:stage===2?850:stage===3?1400:1800);await p.locator(`.coach-stage-${stage}`).waitFor();
  assert.equal(await line(),stage===0?0:1);
  assert.equal(await p.locator('.coach-suggestion').evaluate(e=>getComputedStyle(e).visibility),stage===4?'visible':'hidden');
  if(stage===3){assert.equal(await p.locator('.coach-gaze-beam').evaluate(e=>getComputedStyle(e).opacity),'1');const geometry=await scene.evaluate(e=>{const span=e.querySelector('.coach-email p span'),points=e.querySelector('polygon').points;return {beamWidth:points[2].x-points[1].x,textWidth:span.offsetWidth};});assert.ok(Math.abs(geometry.beamWidth-geometry.textWidth)<1);}
  await scene.screenshot({path:`/root/.openclaw/workspace-nim/media/writing-21718-${process.env.CAPTURE_TAG||'preview'}-${width}-${lang}-stage${stage}.png`});
 }
 const gap=await scene.evaluate(e=>e.querySelector('.coach-suggestion').offsetTop-e.querySelector('.coach-email').offsetTop-e.querySelector('.coach-email').offsetHeight);assert.ok(gap>4&&gap<24,`gap ${gap}`);assert.equal(await scene.evaluate(e=>getComputedStyle(e).transformStyle),'flat');await p.screenshot({path:`/root/.openclaw/workspace-nim/media/writing-21718-${process.env.CAPTURE_TAG||'preview'}-${width}-${lang}-full.png`});console.log('PASS underline → gaze → full-span beam → suggestion; gap',width,lang,gap);await p.close();
}}finally{await b.close()}
