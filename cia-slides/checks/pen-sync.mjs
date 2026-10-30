import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.clock.install();await page.goto((process.env.TEST_URL||'http://127.0.0.1:8241')+'/#8');
 await page.clock.runFor(2000);await page.clock.runFor(32000);
 for(const delta of [150,200,350,700,1100]){
  await page.clock.runFor(delta);
  const result=await page.locator('.practice-paper').evaluate(p=>{
   const pen=p.querySelector('.practice-pen');const rows=[...p.querySelectorAll('.practice-copy p')];
   const row=rows.find(r=>{const v=parseFloat(getComputedStyle(r).clipPath.split(' ')[1]);return v>0&&v<100;});
   if(!row)return null;
   const hidden=parseFloat(getComputedStyle(row).clipPath.split(' ')[1]);
   return {x:parseFloat(pen.style.left),expectedX:row.offsetLeft+row.firstElementChild.offsetWidth*(1-hidden/100),y:parseFloat(pen.style.top),expectedY:row.offsetTop+23};
  });
  if(result){assert(Math.abs(result.x-result.expectedX)<1);assert.equal(result.y,result.expectedY);}
 }
 await page.screenshot({path:`/root/.openclaw/workspace-nim/media/pen-sync-${width}.png`});
 console.log('PASS pen tip follows ink',width);await page.close();
}}finally{await browser.close();}
