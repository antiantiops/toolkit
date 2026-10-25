import {chromium} from '/app/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox'],headless:true});
try{
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto((process.env.CHECK_URL||'http://127.0.0.1:8097')+'/#5');
 await p.locator('.cia-agent-loop[data-stage="12"]').waitFor({timeout:45000});
 const width=()=>p.locator('.cia-terminal-typing').evaluate(e=>parseFloat(getComputedStyle(e).width));
 const a=await width();await p.waitForTimeout(800);console.log('typing widths',a,await width());assert.ok(await width()>a);
 await p.waitForTimeout(5100);
 assert.equal(await p.locator('.cia-agent-loop').getAttribute('data-stage'),'12');
 assert.ok(await p.locator('.cia-terminal-scroll').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42)<-150);
 assert.equal(await p.locator('.cia-terminal-line').last().evaluate(e=>getComputedStyle(e).opacity),'1');
 await p.screenshot({path:'/root/.openclaw/workspace-nim/artifacts/page3-review/cia-terminal-logs.png'});
 await p.locator('.cia-agent-loop[data-stage="13"]').waitFor();
 await p.locator('.cia-agent-loop[data-stage="14"]').waitFor();
 assert.equal(await p.locator('[data-app-window="Terminal"]').count(),0);
 console.log('PASS typed command, scrolling logs, completed output before close');
}finally{await b.close()}
