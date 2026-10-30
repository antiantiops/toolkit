import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,lang,reduced] of [[1440,'en',false],[390,'vi',false],[1200,'en',true]]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
 await page.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await page.clock.install();await page.goto((process.env.TEST_URL||'http://127.0.0.1:8243')+'/#8');await page.clock.runFor(36000);
 assert.equal(await page.locator('.reading-notebook').count(),0);
 assert.equal(await page.locator('.reading-action-demo').evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
 await page.clock.runFor(6500);assert.equal(await page.locator('.recall-prompt').count(),1);
 await page.waitForTimeout(1200);await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-prompt-${width}.png`});
 await page.locator('.recall-next').click();await page.clock.runFor(2200);
 assert.equal(await page.locator('.recall-answer svg.recall-pen').count(),1);
 await page.waitForTimeout(1200);await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-tip-${width}.png`});
 await page.clock.runFor(2800);assert.equal(await page.locator('.recall-failure').count(),1);
 await page.waitForTimeout(1200);await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-error-${width}.png`});
 await page.locator('.recall-failure button').click();await page.clock.runFor(100);assert.equal(await page.locator('.recall-failure').count(),0);assert.equal(await page.locator('.recall-test').count(),0);
 console.log('PASS prompt, test pencil, dark error, Replay',width,lang,reduced);await page.close();
}}finally{await browser.close();}
