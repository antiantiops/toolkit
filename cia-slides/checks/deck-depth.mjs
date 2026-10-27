import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const language of ['vi','en']){
 const p=await browser.newPage({viewport:{width:1280,height:800}});await p.addInitScript(l=>localStorage.setItem('deck-language',l),language);await p.goto('http://127.0.0.1:8214/#1');
 for(const target of [2,3,4,5,6,7,6,5,4,3,2,1]){
  await p.evaluate(n=>location.hash=String(n),target);await p.waitForTimeout(100);
  assert.equal(await p.locator('.slide-transition').getAttribute('aria-busy'),'true');
  assert.equal(await p.locator('.deck-foreground').count(),0);
  if(language==='vi'&&target===3)await p.screenshot({path:'/root/.openclaw/workspace-nim/media/deck-depth-mid.png'});
  await p.waitForFunction(()=>document.querySelector('.slide-transition')?.getAttribute('aria-busy')==='false');
 }
 await p.evaluate(()=>{location.hash='3';setTimeout(()=>location.hash='5',80);setTimeout(()=>location.hash='2',160)});await p.waitForTimeout(2000);assert.equal(await p.locator('.usage-sequence').count(),1);assert.equal(await p.locator('.slide-transition').getAttribute('aria-busy'),'false');
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:`/root/.openclaw/workspace-nim/media/deck-depth-mobile-${language}.png`});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.close();console.log('PASS',language,'all forward/reverse transitions, no covering overlay, rapid navigation, mobile');
 }
 const p=await browser.newPage({reducedMotion:'reduce'});await p.goto('http://127.0.0.1:8214/#1');await p.evaluate(()=>location.hash='2');await p.locator('.usage-sequence').waitFor();await p.waitForFunction(()=>document.querySelector('.slide-transition')?.getAttribute('aria-busy')==='false');assert.equal(await p.locator('.deck-foreground').count(),0);console.log('PASS reduced motion');
}finally{await browser.close()}
