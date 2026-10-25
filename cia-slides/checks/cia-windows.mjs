import {chromium} from '/app/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox'],headless:true});
try {
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto((process.env.CHECK_URL||'http://127.0.0.1:8097')+'/#5');
 const stage=n=>p.locator(`.cia-agent-loop[data-stage="${n}"]`).waitFor({timeout:20000});
 await stage(3);assert.equal(await p.locator('[data-app-window]').count(),0);
 await stage(4);assert.equal(await p.locator('[data-app-window="Chrome"]').count(),1);
 await stage(6);assert.match(await p.locator('[data-app-window]').textContent(),/Speaking/);
 await p.screenshot({path:'/root/.openclaw/workspace-nim/artifacts/page3-review/cia-window-reading.png'});
 await stage(7);await p.waitForTimeout(2100);assert.equal(await p.locator('[data-app-window]').evaluate(e=>getComputedStyle(e).opacity),'0');
 await stage(8);assert.equal(await p.locator('[data-app-window]').count(),0);
 assert.equal(await p.locator('.cia-story-packet animateMotion').getAttribute('path'),'M100 335V263H85V213');
 await stage(9);assert.equal(await p.locator('.cia-story-packet animateMotion').getAttribute('path'),'M265 165H336');
 await p.locator('.cia-brain-processing').waitFor();
 await stage(12);assert.match(await p.locator('[data-app-window="Terminal"]').textContent(),/Conflicts: 0/);
 await stage(16);assert.match(await p.locator('[data-app-window="Calculator"]').textContent(),/90 min/);
 await stage(20);assert.equal(await p.locator('.cia-result-reveal').count(),1);
 await stage(0);console.log('PASS app opens after arrival, CIA reading, closes, app→Agent→model, Terminal, Calculator, auto-loop');
} finally {await b.close()}
