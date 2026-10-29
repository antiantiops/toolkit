import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1200,390]){
const p=await b.newPage({viewport:{width,height:width===390?844:750}});await p.goto((process.env.TEST_URL||'http://127.0.0.1:8226')+'/#8');
await p.locator('[data-reading-step="1"]').waitFor();const y=await p.locator('.reading-lens').evaluate(e=>parseFloat(e.style.top));
await p.locator('[data-reading-step="2"]').waitFor();assert.equal(await p.locator('.example-robot').count(),0);
await p.locator('[data-example-lens="parked"]').waitFor();
const parked=await p.locator('.reading-lens').boundingBox(),example=await p.locator('.book-stack>.textbook-page .indicator-example').boundingBox();assert.ok(parked.y>example.y+example.height);
await p.locator('.example-robot.look-book').waitFor();await p.waitForTimeout(900);const robotStart=await p.locator('.example-robot').boundingBox();
const robotCanvas=await p.locator('.example-robot canvas').boundingBox();assert.ok(robotCanvas.y+robotCanvas.height<example.y,'Robot must stay above example');
assert.equal(await p.locator('.book-stack>.textbook-page .indicator-example').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(253, 230, 138)');
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/example-read-${width}.png`});
await p.locator('.example-robot.look-app').waitFor();await p.waitForTimeout(1700);const robotEnd=await p.locator('.example-robot').boundingBox();assert.ok(robotEnd.x<robotStart.x-30);const appRobot=await p.locator('.example-robot canvas').boundingBox(),app=await p.locator('.translate-columns').boundingBox();assert.ok(appRobot.y+appRobot.height<app.y,'Robot must stay above translation text');const early=await p.locator('.translate-input').innerText();assert.ok(early.length>0&&early.length<60,early);assert.equal(await p.locator('.translate-output').innerText(),'');
await p.waitForFunction(()=>document.querySelector('.translate-output')?.textContent.includes('Các chỉ số kinh tế'));assert.equal(await p.locator('.translate-input').innerText(),'Current economic indicators show admirable growth in mining.');
await p.locator('.example-robot').waitFor({state:'detached'});await p.waitForTimeout(5000);assert.equal(await p.locator('.translate-input').innerText(),'Current economic indicators show admirable growth in mining.');await p.screenshot({path:`/root/.openclaw/workspace-nim/media/example-result-${width}.png`});
await p.getByRole('button',{name:'Replay',exact:true}).click();await p.locator('.translate-window').waitFor({state:'detached'});console.log('PASS lens descends, example highlight, robot gaze, typing then Vietnamese and Replay',width);await p.close();
}}finally{await b.close()}
