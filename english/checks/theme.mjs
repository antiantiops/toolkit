import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try { for(const width of [1440,390]) {
 const p=await b.newPage({viewport:{width,height:950}});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8262');
 const toggle=p.locator('#theme-switch');await toggle.waitFor();
 await toggle.click();await p.waitForTimeout(200);
 assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(245, 245, 247)');
 await p.reload();await toggle.waitFor();await p.waitForTimeout(300);assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 for(const [name,label] of [['vocab','Vocabulary'],['grammar','Grammar'],['writing','Writing'],['listening','Listening'],['words','My Words']]) {
   await p.getByRole('navigation',{name:'Chọn kỹ năng'}).getByRole('button',{name:new RegExp(label)}).click();await p.waitForTimeout(350);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.screenshot({path:`/root/.openclaw/workspace-nim/media/english-light-21570-${width}-${name}.png`,fullPage:false});
 }
 await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await p.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(2, 6, 23)');
 console.log('PASS theme persistence, five tabs, layout, dark restoration',width);await p.close();
} } finally {await b.close();}
