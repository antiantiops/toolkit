import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,english,reduced] of [[1440,true,false],[390,false,false],[1200,false,true]]){
const page=await browser.newPage({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
await page.clock.install();await page.goto((process.env.TEST_URL||'http://127.0.0.1:8240')+'/#8');
// Native timers accelerated; CSS motion retains real durations for frame inspection.
await page.clock.runFor(2000);if(!english){await page.locator('.deck-language').click();await page.waitForLoadState('load');await page.clock.runFor(2000);}await page.clock.runFor(35000);
await page.locator('.practice-paper').waitFor();
await page.clock.runFor(6500);
await page.locator('.recall-next').waitFor();assert.equal(await page.locator('.recall-test').count(),0);
await new Promise(r=>setTimeout(r,6000));await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-copy-${width}.png`});
await page.locator('.recall-next').click();await page.clock.runFor(100);await page.clock.runFor(1500);
await page.locator('.recall-test').waitFor();
await new Promise(r=>setTimeout(r,6000));await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-enter-${width}.png`});
await page.clock.runFor(4000);await page.locator('[data-recall-phase="forgot"]').waitFor();
assert.equal(await page.locator('.practice-copy p').count(),9);
assert.equal(await page.locator('.recall-attempt').textContent(),'i');
const heading=await page.locator('.reading-heading').boundingBox(),sheet=await page.locator('.recall-test').boundingBox();assert(sheet.y>heading.y+heading.height);
await new Promise(r=>setTimeout(r,6000));await page.screenshot({path:`/root/.openclaw/workspace-nim/media/recall-final-${width}.png`});
await page.getByRole('button',{name:/Replay|Phát lại/}).click();await page.clock.fastForward(20);await page.locator('.recall-test').waitFor({state:'detached'});assert.equal(await page.locator('.practice-paper').count(),0);
console.log('PASS recall sequence and Replay',width,reduced);await page.close();
}}finally{await browser.close();}
