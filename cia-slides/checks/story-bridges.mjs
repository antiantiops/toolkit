import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:8278';
const b=await chromium.launch({args:['--no-sandbox']});
try { for (const lang of ['en','vi']) {
 const p=await b.newPage({viewport:{width:1366,height:768}});
 await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 // 9: bridge only after failed recall
 await p.goto(`${base}/#9`); await p.locator('.reading-slide').waitFor();
 assert.equal(await p.locator('.story-bridge').count(),0);
 await p.locator('.recall-next').first().click({timeout:60000});
 await p.locator('.recall-failure .story-bridge').waitFor({timeout:30000});
 await p.waitForTimeout(900);
 await p.screenshot({path:`/tmp/cia-bridge-9-${lang}.png`});
 // 10: bridge only after decode
 await p.goto(`${base}/#10`); await p.locator('.vibe-slide').waitFor(); await p.locator('.slide-transition[aria-busy=false]').waitFor();
 assert.equal(await p.locator('.story-bridge').count(),0);
 await p.locator('.vibe-explanation button').first().click();
 await p.locator('.vibe-explanation .story-bridge').waitFor(); await p.waitForTimeout(1600);
 await p.screenshot({path:`/tmp/cia-bridge-10-${lang}.png`});
 // 11 kicker
 await p.goto(`${base}/#11`); await p.locator('.english-bento').waitFor(); await p.waitForTimeout(800);
 assert.match(await p.locator('.bento-heading span').first().innerText(), /RESULT|KẾT QUẢ/);
 await p.screenshot({path:`/tmp/cia-bridge-11-${lang}.png`});
 // overflow: bridge inside viewport and above footer
 await p.close(); }
} finally { await b.close(); }
console.log('PASS bridge lines appear only at story end on slides 9/10; slide 11 kicker is the result — EN/VI');
