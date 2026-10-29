import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1200,390]){
const p=await b.newPage({viewport:{width,height:width===390?844:750}});await p.goto((process.env.TEST_URL||'http://127.0.0.1:8225')+'/#8');
await p.locator('[data-reading-step="1"]').waitFor();const y=await p.locator('.reading-lens').evaluate(e=>parseFloat(e.style.top));
await p.locator('.example-robot.look-book').waitFor();assert.ok(await p.locator('.reading-lens').evaluate(e=>parseFloat(e.style.top))>y);assert.equal(await p.locator('.book-stack>.textbook-page .example-highlight').count(),1);
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/example-read-${width}.png`});
await p.locator('.example-robot.look-app').waitFor();await p.waitForTimeout(1300);const early=await p.locator('.translate-input').innerText();assert.ok(early.length>0&&early.length<60,early);assert.equal(await p.locator('.translate-output').innerText(),'');
await p.waitForFunction(()=>document.querySelector('.translate-output')?.textContent.includes('Các chỉ số kinh tế'));assert.equal(await p.locator('.translate-input').innerText(),'Current economic indicators show admirable growth in mining.');
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/example-result-${width}.png`});
await p.getByRole('button',{name:'Replay',exact:true}).click();await p.locator('.translate-window').waitFor({state:'detached'});console.log('PASS lens descends, example highlight, robot gaze, typing then Vietnamese and Replay',width);await p.close();
}}finally{await b.close()}
