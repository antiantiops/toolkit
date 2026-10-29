import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1200,1440,390]){
 const page=await browser.newPage({viewport:{width,height:width===390?844:750},reducedMotion:'reduce'});
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:8224')+'/#8');
 await page.locator('.book-ready').waitFor();await page.waitForTimeout(500);
 const fit=await page.evaluate(()=>{const row=document.querySelector('.textbook-vocabulary li:last-child'),footer=document.querySelector('.textbook-footer');return {row:row.offsetTop+row.offsetHeight,footer:footer.offsetTop}});
 assert.ok(fit.row<fit.footer,JSON.stringify({width,...fit}));
 assert.equal(await page.locator('.book-writing-lines').count(),1);
 assert.equal(await page.locator('.book-left-page h2,.depth-chart').count(),0);
 await page.screenshot({path:`/root/.openclaw/workspace-nim/media/book-ruled-${width}.png`});await page.close();
 console.log('PASS ruled page and last row above printed footer',width);
}}finally{await browser.close()}
