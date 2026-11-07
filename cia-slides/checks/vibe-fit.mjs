import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height] of [[1366,768],[1280,720],[390,844]])for(const lang of ['en','vi']){
const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
await p.goto(`${process.env.BASE_URL||'http://localhost:8279'}/#10`);
await p.locator('.vibe-explanation button').click();await p.locator('.is-decoded').waitFor();
const fit=await p.locator('.vibe-explanation').evaluate(e=>{const r=e.getBoundingClientRect(),last=e.lastElementChild.getBoundingClientRect(),stage=e.parentElement.getBoundingClientRect();return {scroll:e.scrollHeight<=e.clientHeight+1,bottom:last.bottom<=stage.bottom+1,inside:last.bottom<=r.bottom+1}});
assert.deepEqual(fit,{scroll:true,bottom:true,inside:true},`${width} ${lang}: ${JSON.stringify(fit)}`);
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/vibe-fit-${width}-${lang}.png`});await p.close();
}console.log('PASS reveal fits without scrolling EN/VI desktop, short desktop, phone');}finally{await b.close();}
