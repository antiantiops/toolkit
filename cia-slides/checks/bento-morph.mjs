import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang,reduced] of [[1366,768,'en',false],[1366,768,'vi',false],[390,844,'en',false],[390,844,'vi',true]]){
const p=await b.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
await p.goto(`${process.env.BASE_URL||'http://localhost:8283'}/#10`);await p.locator('.vibe-slide').waitFor();
await p.locator('.vibe-explanation button').click();await p.locator('[data-vibe-stage="result"]').waitFor({timeout:30000});await p.waitForTimeout(900);
for(const dest of [11,10]){
await p.evaluate(n=>location.hash=String(n),dest);
if(!reduced){await p.waitForFunction(()=>document.documentElement.classList.contains('deck-bento-morph'));await p.waitForFunction(()=>document.getAnimations().some(a=>a.effect?.pseudoElement?.includes('english-app-preview')));const groups=await p.evaluate(()=>document.getAnimations().map(a=>a.effect?.pseudoElement).filter(Boolean));for(const name of ['bento-heading','english-app-preview'])assert.ok(groups.some(g=>g.includes(name)),JSON.stringify(groups));if(dest===11){assert.equal(await p.locator('.bento-ready').count(),0);await p.screenshot({path:`/root/.openclaw/workspace-nim/media/bento-morph-mid-${width}-${lang}.png`});}}
await p.locator(dest===11?'.bento-ready':'.vibe-slide').waitFor();await p.waitForFunction(()=>!document.documentElement.classList.contains('deck-bento-morph'));await p.locator('.slide-transition[aria-busy="false"]').waitFor();
}
await p.evaluate(()=>location.hash="11");await p.locator(".bento-ready").waitFor();await p.waitForTimeout(4500);await p.screenshot({path:`/root/.openclaw/workspace-nim/media/bento-morph-end-${width}-${lang}.png`});assert.equal(await p.locator('.coach-stage-4').count(),1);await p.close();console.log('PASS morph forward/reverse, delayed demo',width,lang,reduced);
}}finally{await b.close()}
