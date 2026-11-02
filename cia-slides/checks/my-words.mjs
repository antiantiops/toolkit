import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang] of [[1440,900,'en'],[1440,900,'vi'],[390,844,'vi']]){
const p=await browser.newPage({viewport:{width,height}});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);await p.goto((process.env.TEST_URL||'http://127.0.0.1:8257')+'/#8');await p.locator('.coach-stage-4').waitFor();await p.waitForTimeout(600);
assert.ok(await p.locator('.words-image-frame img').evaluate(e=>e.complete&&e.naturalWidth===660));
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/words-21741-${process.env.TAG||'preview'}-${width}-${lang}.png`});await p.locator('.bento-words').screenshot({path:`/root/.openclaw/workspace-nim/media/words-21741-${process.env.TAG||'preview'}-tile-${width}-${lang}.png`});
assert.equal(await p.locator('.words-image-frame').getAttribute('target'),'_blank');assert.ok(await p.locator('.words-image-frame img').evaluate(e=>e.clientHeight<=e.parentElement.clientHeight+1));await p.waitForTimeout(1500);assert.ok(await p.locator('.words-focused').isVisible());assert.match(await p.locator('.words-focused .words-image-frame').evaluate(e=>getComputedStyle(e).transform),/matrix3d/);assert.equal(await p.locator('.words-zoom').count(),0);assert.equal(await p.locator('.bento-words').evaluate(e=>getComputedStyle(e).overflow),'hidden');await p.screenshot({path:`/tmp/words-contained-${width}-${lang}.png`});console.log('PASS My Words zoom clipped inside card',width,lang);await p.close();}
}finally{await browser.close()}
