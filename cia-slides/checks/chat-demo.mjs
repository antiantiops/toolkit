import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang,reducedMotion] of [[1440,900,'en','no-preference'],[1440,900,'vi','no-preference'],[390,844,'vi','reduce']]){
 const p=await browser.newPage({viewport:{width,height},reducedMotion});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await p.goto((process.env.TEST_URL||'http://127.0.0.1:8257')+'/#8');await p.locator('.bento-chat').waitFor();
 await p.locator('.bento-chat-window').waitFor();await p.waitForTimeout(700);
 assert.equal(await p.locator('.demo-chat-message').count(),1);
 await p.waitForTimeout(1800);const early=await p.locator('.demo-chat-message p').first().innerText();assert.ok(early.length>3);
 await p.waitForTimeout(14000);assert.equal(await p.locator('.demo-chat-message').count(),4);assert.equal(await p.locator('.demo-chat-caret').count(),0);assert.match(await p.locator('.demo-chat-message').last().innerText(),/fruit/);
 assert.ok(await p.locator('.bento-chat-window').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.bento-chat').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom}));
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/chat-demo-${process.env.TAG||'preview'}-${width}-${lang}.png`});
 await p.locator('.demo-chat-footer button').click();await p.waitForTimeout(150);assert.equal(await p.locator('.demo-chat-message').count(),0);
 assert.equal(await p.locator('.chat-launch').count(),0);
 console.log('PASS automatic conversation, final answer, replay, no chat bubble',width,lang,reducedMotion);await p.close();
}}finally{await browser.close()}
