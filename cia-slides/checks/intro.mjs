import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
for(const lang of ['en','vi'])for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
 await page.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await page.goto(`${process.env.BASE_URL||'http://localhost:8260'}/#1`);
 await page.locator('.nim-intro').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('.nim-intro-monogram').count(),0);
 assert.equal(await page.locator('.nim-chrome-overlap').count(),0);
 assert.equal(await page.locator('.nim-intro-robot').count(),2);
 assert.equal(await page.locator('.nim-chrome').count(),3);
 assert.equal(await page.locator('.nim-intro-column').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 255, 255)');
 assert.equal(await page.locator('.nim-intro h1').evaluate(e=>getComputedStyle(e).fontSize),'174px');
 assert.ok(await page.evaluate(()=>document.fonts.check('400 150px Anton')));
 assert.ok(await page.evaluate(()=>document.fonts.check('400 42px "Bebas Neue"')));
 assert.ok(await page.evaluate(()=>document.fonts.check('300 22px Inter')));
 assert.equal(await page.locator('.nim-intro h1').textContent(),'NIM');
 assert.match(await page.locator('.page-indicator').innerText(),/01\s*\/ 09/);
 await page.screenshot({path:`/root/.openclaw/workspace-nim/media/nim-intro-${width}-${lang}.png`});
 await page.keyboard.press('ArrowRight');await page.locator('.nim-intro').waitFor({state:'detached'});
 await page.waitForTimeout(350);assert.match(await page.locator('.page-indicator').innerText(),/02\s*\/ 09/);
 await page.goto(`${process.env.BASE_URL||'http://localhost:8260'}/#9`);await page.locator('.english-bento').waitFor();
 assert.equal(await page.locator('.slide-nav button').last().isDisabled(),true);
 await page.reload();await page.locator('.english-bento').waitFor();
 await page.close();
}
await browser.close();console.log('PASS intro, both languages, desktop/mobile, preserved last slide and bounds');
