import {chromium} from '/app/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox'],headless:true});
try {
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto((process.env.CHECK_URL||'http://127.0.0.1:8097')+'/#5');
 await p.locator('.cia-agent-loop[data-stage="1"]').waitFor({timeout:10000});
 assert.equal(await p.locator('[data-testid="cia-app-links"] path').count(),0);
 await p.locator('.cia-brain-processing').waitFor();
 assert.equal(await p.locator('.cia-agent-loop').getAttribute('data-stage'),'1');
 assert.equal(await p.locator('.cia-brain-processing').evaluate(e=>getComputedStyle(e).animationIterationCount),'2');
 assert.equal(await p.locator('.cia-story-packet').evaluate(e=>getComputedStyle(e).visibility),'hidden');
 await p.waitForTimeout(900);
 assert.equal(await p.locator('.cia-agent-loop').getAttribute('data-stage'),'1');
 await p.locator('.cia-agent-loop[data-stage="2"]').waitFor();
 assert.equal(await p.locator('.cia-brain-processing').count(),0);
 await p.locator('.cia-agent-loop[data-stage="3"]').waitFor();
 assert.equal(await p.locator('[data-testid="cia-app-links"] path').count(),1);
 assert.equal(await p.locator('[data-testid="cia-app-links"] path').getAttribute('d'),'M85 213V263H100V335');
 await p.waitForTimeout(150);
 const pos=()=>p.locator('.cia-story-packet').evaluate(e=>({x:e.getCTM().e,y:e.getCTM().f}));
 const a=await pos();await p.waitForTimeout(750);const c=await pos();assert.ok(Math.hypot(a.x-c.x,a.y-c.y)>20);
 console.log('PASS arrival, two pulses before reply, only active app connector, packet movement');
} finally {await b.close()}
