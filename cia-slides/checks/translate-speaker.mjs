import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1200,390]){
 const p=await b.newPage({viewport:{width,height:width===390?844:750}});await p.goto((process.env.TEST_URL||'http://127.0.0.1:8224')+'/#8');
 await p.locator('.speaker-approach').waitFor();assert.equal(await p.locator('.translate-speaking').count(),0);
 await p.locator('.translate-speaking').waitFor();await p.waitForTimeout(350);
 assert.equal(await p.locator('[aria-current="step"]').innerText(),'02\nFind pronunciations');
 const result=await p.evaluate(()=>{const s=document.querySelector('.indicator-speaker').getBoundingClientRect(),c=document.querySelector('.speaker-playing .translate-pointer').getBoundingClientRect(),w=document.querySelector('.translate-window').getBoundingClientRect(),book=document.querySelector('.textbook-page').getBoundingClientRect();return {dx:Math.abs(c.x-s.x-s.width/2),dy:Math.abs(c.y-s.y-s.height/2),left:w.x<book.x}});
 assert.ok(result.dx<8&&result.dy<8&&result.left,JSON.stringify(result));assert.equal(await p.locator('.speaker-wave i').count(),13);
 assert.equal(await p.getByRole('img',{name:'Speaking robot'}).count(),1);
 assert.ok(await p.locator('.speaker-robot canvas').evaluate(c=>c.width>0&&c.height>0));
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/translate-speaker-${width}.png`});
 await p.locator('[data-reading-step="2"]').waitFor();assert.equal(await p.locator('.translate-speaking').count(),0);
 await p.getByRole('button',{name:'Replay',exact:true}).click();await p.locator('.translate-window').waitFor({state:'detached'});
 console.log('PASS left overlay, cursor speaker target, pronunciation sync, face/wave and Replay',width);await p.close();
}}finally{await b.close()}
