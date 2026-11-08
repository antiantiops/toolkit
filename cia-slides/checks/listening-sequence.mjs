import assert from 'node:assert/strict';import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
const base=process.env.BASE_URL||'http://localhost:8285',b=await chromium.launch({args:['--no-sandbox']});
for(const [w,h,lang,rm] of [[1366,768,'en',false],[1366,768,'vi',false],[390,844,'en',false],[1366,768,'en',true]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},reducedMotion:rm?'reduce':'no-preference'}),p=await ctx.newPage();
 await p.goto(`${base}/#11`,{waitUntil:'networkidle'});
 if(lang==='vi'){const btn=p.locator('.slide-header .demo-link').first();if(((await btn.textContent())||'').includes('VI'))await btn.click();}
 await p.locator('.english-bento.bento-ready').waitFor();
 const read=()=>p.locator('.bento-listening .listening-model').evaluate(c=>({cur:c.querySelectorAll('.listening-model-focus strong')[c.querySelector('.listening-model-track').style.getPropertyValue('--lm-step')||0]?.innerText,y:getComputedStyle(c.querySelector('.listening-model-track')).transform,cls:c.querySelector('.listening-model-play').className,lbl:c.querySelector('.listening-model-play').getAttribute('aria-label'),prog:c.querySelector('.listening-model-progress i').style.width,time:c.querySelector('.listening-model-time span').innerText,controls:c.querySelectorAll('.listening-model-controls>*').length,dl:!!c.querySelector('.listening-model-download')}));
 if(!rm){
  await p.waitForTimeout(200);const s0=await read();assert.equal(s0.lbl,'Playing');assert.equal(s0.time,'0:03');assert.equal(s0.controls,5);assert.ok(s0.dl);
  await p.waitForTimeout(3500);const s1=await read();assert.equal(s1.lbl,'Playing');assert.notEqual(s1.y,s0.y);assert.notEqual(s1.cur,s0.cur);
  await p.locator('.bento-listening').screenshot({path:`/root/.openclaw/workspace-nim/media/listen-mid-${w}-${lang}.png`});
  await p.waitForTimeout(4500);
 }
 const s2=await read();assert.equal(s2.lbl,'Paused');assert.ok(s2.cls.includes('is-paused'));assert.equal(s2.time,'0:21');assert.equal(s2.controls,5);assert.ok(s2.dl);
 assert.ok(await p.locator('.bento-listening').evaluate(t=>t.scrollHeight<=t.clientHeight+1&&t.scrollWidth<=t.clientWidth+1));
 await p.locator('.bento-listening').screenshot({path:`/root/.openclaw/workspace-nim/media/listen-end-${w}-${lang}${rm?'-rm':''}.png`});
 console.log('PASS',w,lang,rm,JSON.stringify(s2));await ctx.close();
}
await b.close();
