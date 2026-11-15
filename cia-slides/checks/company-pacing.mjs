import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8283';
const b=await chromium.launch({args:['--no-sandbox']});
try{
 for(const [width,lang,reduced] of [[1440,'en',false],[1440,'vi',false],[390,'en',false],[390,'vi',true]]){
  const p=await b.newPage({viewport:{width,height:width===390?844:900},reducedMotion:reduced?'reduce':'no-preference'});
  await p.clock.install({time:0});
  await p.clock.pauseAt(0);
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${baseUrl}/#3`);
  await p.clock.runFor(50);
  await p.locator('.nim-company').waitFor();
  await p.clock.runFor(50);
  if(reduced){
   await p.locator('.company-phase-7').waitFor();
   assert.equal(await p.locator('.infra-protected').count(),5);
   assert.equal(await p.locator('.company-protected.is-protected').count(),1);
  }else{
   for(const [dt,halos] of [[6250,0],[350,1],[2500,2],[2500,3],[2500,4],[2500,5]]){
    await p.clock.runFor(dt);
    await p.waitForFunction(n=>document.querySelectorAll('.infra-protected').length===n,halos,{timeout:2000});
    assert.equal(await p.locator('.company-protected.is-protected').count(),0);
   }
   await p.clock.runFor(2500);
   await p.locator('.company-phase-7').waitFor({timeout:2000});
   assert.equal(await p.locator('.infra-protected').count(),5);
   assert.equal(await p.locator('.company-protected.is-protected').count(),1);
  }
  await p.close();
 }
}finally{
 await b.close();
}
console.log('PASS CompanySlide (#3) pacing boundaries, EN/VI, desktop/phone, reduced-motion');
