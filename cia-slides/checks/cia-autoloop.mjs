import {chromium} from '/app/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox'],headless:true});
try {
 const p=await b.newPage({viewport:{width:1280,height:800}});
 await p.goto((process.env.CHECK_URL||'http://192.168.101.36:8090')+'/#5');
 await p.locator('.cia-agent-loop').waitFor();
 assert.equal(await p.locator('.cia-agent-loop [role="button"]').count(),0);
 await p.locator('.cia-agent-loop[data-stage="9"]').waitFor({timeout:35000});
 assert.equal(await p.locator('.cia-result-reveal').count(),1);
 await p.locator('.cia-agent-loop[data-stage="0"]').waitFor({timeout:6500});
 assert.equal(await p.locator('.cia-result-reveal').count(),0);
 await p.locator('.cia-agent-loop[data-stage="1"]').waitFor({timeout:4000});
 console.log('PASS live automatic wrap 9→0→1, result reset, no Replay');
} finally {await b.close()}
