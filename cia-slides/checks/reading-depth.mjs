import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
const base=process.env.DECK_URL||'http://127.0.0.1:8220';
try{
 await Promise.all(['vi','en'].map(async lang=>{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await page.goto(base+'/#8');
  await page.locator('.reading-depth [data-book-day="0"]').waitFor();
  assert.equal(await page.locator('.book-left-page').count(),1);
  assert.equal(await page.locator('.page-indicator').innerText(),'08 / 08');
  for(const stage of [1,2,3,4])await page.locator(`[data-translate-stage="${stage}"]`).waitFor({timeout:10000});
  await page.waitForTimeout(1600);
  assert.equal(await page.locator('.translate-input').innerText(),'Indicator');
  assert.equal(await page.locator('.translate-output').innerText(),'Chỉ số');
  assert.equal(await page.locator('.reading-lens-glass>strong').count(),0);
  assert.equal(await page.locator('.lens-page-copy').count(),1);
  const bounds=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   const win=rect('.translate-window'),footer=rect('.slide-footer'),question=rect('.reading-question');
   return {windowClear:win.bottom<footer.top,questionClear:question.bottom<footer.top,sideClear:win.right<question.left,tilted:getComputedStyle(document.querySelector('.reading-world')).transform.startsWith('matrix3d')};
  });assert.deepEqual(bounds,{windowClear:true,questionClear:true,sideClear:true,tilted:true});
  await page.screenshot({path:`/root/.openclaw/workspace-nim/media/reading-depth-${lang}.png`});
  for(const stage of [1,2,3,4])await page.locator(`[data-reading-step="${stage}"]`).waitFor({timeout:10000});
  await page.locator('.reading-replay').click();
  await page.locator('[data-book-day="0"]').waitFor();
  assert.equal(await page.locator('.translate-window').count(),0);
  await page.evaluate(()=>location.hash='7');await page.locator('.reading-slide:not(.reading-depth)').waitFor();
  await page.locator('.slide-transition[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.book-left-page').count(),0);
  await page.locator('body').click({position:{x:20,y:20}});await page.keyboard.press('ArrowRight');await page.locator('.reading-depth').waitFor();
  await page.reload();await page.locator('.reading-depth').waitFor();
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.waitForTimeout(12500);await page.screenshot({path:`/root/.openclaw/workspace-nim/media/reading-depth-mobile-${lang}.png`});
  await page.close();console.log('PASS',lang,'lookup stages, action sequence, replay, 7↔8, hash reload, footer and mobile');
 }));
 const p=await browser.newPage({reducedMotion:'reduce'});await p.goto(base+'/#8');await p.locator('.book-ready').waitFor();assert.equal(await p.locator('.book-hinge').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await p.close();console.log('PASS reduced motion');
}finally{await browser.close();}
