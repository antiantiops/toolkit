import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang] of [[1440,900,'en'],[1440,900,'vi'],[390,844,'vi']]){
 const p=await browser.newPage({viewport:{width,height}});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await p.goto((process.env.TEST_URL||'http://127.0.0.1:8257')+'/#8');await p.locator('.grammar-board').waitFor();await p.waitForTimeout(3000);
 assert.equal(await p.locator('.grammar-formula').innerText(),'S\n+\nV\n+\nO');assert.match(await p.locator('.grammar-example').innerText(),/English/);
 assert.equal(await p.locator('.grammar-teacher canvas').count(),1);
 assert.ok(await p.locator('.bento-vocabulary').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('.grammar-board,.grammar-caption,.grammar-teacher')].every(c=>{const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom+1&&b.left>=r.left&&b.right<=r.right+1})}));
 await p.locator('.bento-vocabulary').screenshot({path:`/root/.openclaw/workspace-nim/media/grammar-${process.env.TAG||'preview'}-${width}-${lang}.png`});console.log('PASS Grammar board and teacher',width,lang);await p.close();
}}finally{await browser.close()}
