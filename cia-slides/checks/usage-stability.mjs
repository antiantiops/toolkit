import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try {
 for(const [lang,width,height,reduced] of [['en',1366,768,false],['vi',1366,768,false],['en',390,844,true]]) {
  const p=await b.newPage({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference'});
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${process.env.BASE_URL||'http://localhost:8278'}/#5`);
  await p.locator('.usage-sequence').waitFor();
  await p.locator('.slide-transition[aria-busy=false]').waitFor();
  const heading=p.locator('.sequence-intro h1');
  const initial=await heading.boundingBox();
  await p.screenshot({path:`/tmp/cia-usage-${lang}-${width}-start.png`});
  for(const ms of [400,700,1600,2500,3500]) {
   await p.waitForTimeout(ms);
   const now=await heading.boundingBox();
   assert(Math.abs(initial.y-now.y)<1,`heading moved ${now.y-initial.y}`);
   assert(Math.abs(initial.x-now.x)<1,'heading shifted horizontally');
  }
  await p.screenshot({path:`/tmp/cia-usage-${lang}-${width}-chat.png`});
  await p.locator('.sequence-controls button').click();
  assert(Math.abs(initial.y-(await heading.boundingBox()).y)<1,'Replay shifted heading');
  await p.close();
 }
}finally{await b.close()}
console.log('PASS heading stable through picker/chat/answer/Replay: EN/VI desktop, phone reduced motion');
