import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1200,390]){
const p=await b.newPage({viewport:{width,height:width===390?844:750}});await p.goto((process.env.TEST_URL||'http://127.0.0.1:8225')+'/#8');
await p.locator('.lens-page-copy').waitFor();await p.waitForTimeout(3300);const first=await p.locator('.lens-page-copy').evaluate(e=>e.style.transform);await p.waitForTimeout(800);assert.notEqual(await p.locator('.lens-page-copy').evaluate(e=>e.style.transform),first);
await p.locator('[data-translate-stage="1"]').waitFor();await p.waitForTimeout(650);
const geometry=await p.evaluate(()=>{const icon=document.querySelector('.translate-launcher').getBoundingClientRect(),lens=document.querySelector('.reading-lens').getBoundingClientRect();return {gap:lens.left-icon.right}});assert.ok(geometry.gap>=0&&geometry.gap<110,JSON.stringify(geometry));
assert.equal(await p.locator('.reading-lens-glass .textbook-word mark').count(),10);
await p.screenshot({path:`/root/.openclaw/workspace-nim/media/lens-launcher-${width}.png`});await p.close();console.log('PASS launcher near lens, original 2x moving page sampling',width);
}}finally{await b.close()}
