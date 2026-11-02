import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang] of [[1440,900,'en'],[1440,900,'vi'],[390,844,'vi']]){
const p=await browser.newPage({viewport:{width,height}});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);await p.goto((process.env.TEST_URL||'http://127.0.0.1:8257')+'/#8');await p.locator('.coach-stage-4').waitFor();await p.waitForTimeout(600);
assert.ok(await p.locator('.words-image-frame img').evaluate(e=>e.complete&&e.naturalWidth===518));
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/words-21731-${process.env.TAG||'preview'}-${width}-${lang}.png`});await p.locator('.bento-words').screenshot({path:`/root/.openclaw/workspace-nim/media/words-21731-${process.env.TAG||'preview'}-tile-${width}-${lang}.png`});
assert.equal(await p.locator('.words-image-frame').getAttribute('target'),'_blank');assert.ok(await p.locator('.words-image-frame img').evaluate(e=>e.clientHeight<=e.parentElement.clientHeight+1));console.log('PASS complete translated image and enlarge link',width,lang);await p.close();}
}finally{await browser.close()}
