import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
for(const lang of ['en','vi']) for(const viewport of [{width:1366,height:768},{width:390,height:844}]) {
 const page=await browser.newPage({viewport});
 await page.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await page.goto(`${process.env.BASE_URL||'http://localhost:8278'}/#8`);
 await page.locator('.flow-spotlight-btn').first().waitFor();
 await page.waitForTimeout(1600);
 const buttons=page.locator('.flow-spotlight-btn');
 assert.equal(await buttons.count(),2);
 for(let i=0;i<2;i++) {
  for(let stage=1;stage<=3;stage++) {
   await buttons.nth(i).click();
   assert.equal(await buttons.nth(i).getAttribute('aria-pressed'),stage===3?'false':'true');
   assert.equal(await page.locator('.flow-panel').nth(i).locator('.flow-spotlight-overlay').count(),stage===3?0:1);
   assert.equal(await buttons.nth(1-i).getAttribute('aria-pressed'),'false');
   if(stage<3) await page.screenshot({path:`/tmp/spotlight-${lang}-${viewport.width}-${i}-${stage}.png`});
  }
 }
 await page.locator('.flow-replay').click();
 const footer=await page.locator('.slide-footer').boundingBox();
 for(const box of await buttons.all()) {const r=await box.boundingBox(); assert.ok(r.y+r.height<=footer.y,'button above footer');}
 await page.emulateMedia({reducedMotion:'reduce'});
 await buttons.first().focus(); await page.keyboard.press('Enter');
 assert.equal(await buttons.first().getAttribute('aria-pressed'),'true');
 await page.close();
}
console.log('PASS EN/VI desktop/mobile, independent 3-state cycles, keyboard, footer clearance');
} finally {await browser.close();}
