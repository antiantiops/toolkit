import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,lang,reduced] of [[1440,'en',false],[1440,'vi',false],[390,'en',false],[390,'vi',true]]){
 const p=await b.newPage({viewport:{width,height:width===390?844:900},reducedMotion:reduced?'reduce':'no-preference'});
 await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);await p.goto(`${process.env.BASE_URL||'http://localhost:8261'}/#2`);await p.evaluate(()=>document.fonts.ready);
 await p.locator('.company-phase-7').waitFor();assert.equal(await p.locator('.infra-protected').count(),5);
 assert.match(await p.locator('.company-description').innerText(),/We protect many infrastructure systems\s+around the world\./);
 assert.ok(await p.locator('.company-systems').evaluate(e=>{const r=e.getBoundingClientRect(),f=document.querySelector('.slide-footer').getBoundingClientRect();return r.left>0&&r.bottom<f.top}));
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/company-protect-${width}-${lang}-${reduced}.png`});
 await p.keyboard.press('ArrowRight');await p.locator('.nim-company').waitFor({state:'detached'});await p.locator('.slide-transition[aria-busy="false"]').waitFor();await p.keyboard.press('ArrowLeft');await p.locator('.nim-company').waitFor();await p.locator('.slide-transition[aria-busy="false"]').waitFor();
 if(!reduced){assert.equal(await p.locator('.infra-protected').count(),0);await p.locator('.company-phase-4').waitFor();assert.equal(await p.locator('.infra-protected').count(),3);await p.screenshot({path:`/root/.openclaw/workspace-nim/media/company-protect-mid-${width}-${lang}.png`});}
 await p.close();
}}finally{await b.close()}console.log('PASS five protected systems, bounds, copy, replay, EN/VI, desktop/mobile and reduced motion');
