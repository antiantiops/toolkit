import assert from 'node:assert/strict';
import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
const browser=await chromium.launch({args:['--no-sandbox']});
for(const width of [390,1366]){
 const page=await browser.newPage({viewport:{width,height:844}});
 let release; const gate=new Promise(r=>release=r);
 await page.route('**/api/word',async route=>{await gate;await route.fulfill({json:{word:{word:'Speech',meaning:'lời nói',ipa:'/spiːtʃ/',partOfSpeech:'noun'}}});});
 await page.route('**/api/quick-word',r=>r.fulfill({json:{meaning:'lời nói'}}));
 await page.route('**/api/my-words**',r=>r.fulfill({json:{ok:true,words:[],weeks:[],next:null}}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:3097/',{waitUntil:'domcontentloaded'});
 const input=page.getByRole('combobox',{name:'Từ hoặc câu cần tra'});
 await input.fill('speech');await input.press('Enter');
 await page.getByRole('button',{name:'Luyện nói',exact:true}).click();
 const panel=page.locator('#word-pronunciation-practice');await panel.waitFor();
 await panel.evaluate(el=>el.dataset.identity='original');
 release();await page.waitForFunction(()=>document.querySelector('[data-testid="lookup-word-header"]')?.textContent.includes('Speech'));
 assert.equal(await panel.getAttribute('data-identity'),'original');
 assert.equal(await page.getByRole('button',{name:'Thu gọn luyện nói'}).getAttribute('aria-expanded'),'true');
 await page.screenshot({path:`/root/.openclaw/workspace-nim/media/practice-retained-${width}.png`});
 await page.getByRole('button',{name:'Thu gọn luyện nói'}).click();assert.equal(await panel.count(),0);
 console.log('PASS delayed enrichment retains recorder DOM and explicit collapse',width);await page.close();
}
await browser.close();
