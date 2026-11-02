import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,height,lang,reducedMotion] of [[1440,900,'en','no-preference'],[1440,900,'vi','no-preference'],[390,844,'vi','reduce']]){
 const p=await browser.newPage({viewport:{width,height},reducedMotion});await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
 await p.goto((process.env.TEST_URL||'http://127.0.0.1:8257')+'/#8');await p.locator('.bento-chat').waitFor();
 await p.locator('.bento-chat-window').waitFor();await p.waitForTimeout(1300);
 assert.equal(await p.locator('.demo-chat-message').count(),0);
 assert.ok((await p.locator('.demo-chat-draft').innerText()).startsWith('Today'));
 await p.locator('.bento-chat').screenshot({path:`/root/.openclaw/workspace-nim/media/chat-draft-${process.env.TAG||'preview'}-${width}-${lang}.png`});
 await p.waitForTimeout(1700);assert.equal(await p.locator('.demo-chat-message.student').count(),1);
 assert.equal(await p.locator('.demo-chat-draft').innerText(),'Type a message…');
 await p.waitForTimeout(18000);assert.equal(await p.locator('.demo-chat-message').count(),4);assert.equal(await p.locator('.demo-chat-caret').count(),0);assert.match(await p.locator('.demo-chat-message').last().innerText(),/fruit/);
 assert.ok(await p.locator('.bento-chat-window').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.closest('.bento-chat').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom}));
 assert.ok(await p.locator('.bento-chat').evaluate(e=>{const messages=[...e.querySelectorAll('.demo-chat-message')].map(x=>x.getBoundingClientRect()),body=e.querySelector('.demo-chat-body').getBoundingClientRect(),input=e.querySelector('.demo-chat-footer').getBoundingClientRect();return messages.length===4&&messages.every((r,i)=>r.top>=body.top-1&&r.bottom<=body.bottom+1&&r.bottom<input.top&&(!i||r.top>messages[i-1].bottom))}));
 await p.locator('.bento-chat').screenshot({path:`/root/.openclaw/workspace-nim/media/chat-card-${process.env.TAG||'preview'}-${width}-${lang}.png`});
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/chat-demo-${process.env.TAG||'preview'}-${width}-${lang}.png`});
 assert.ok(await p.locator('.bento-chat').evaluate(e=>{const head=e.querySelector('.companion-head').getBoundingClientRect(),input=e.querySelector('.demo-chat-footer').getBoundingClientRect();return head.right<=input.left+1&&getComputedStyle(e.querySelector('.demo-chat-message.assistant'),'::before').content==='none'}));
 await p.locator('.demo-chat-footer button').click();await p.waitForTimeout(150);assert.equal(await p.locator('.demo-chat-message').count(),0);
 assert.equal(await p.locator('.chat-launch').count(),0);
 console.log('PASS automatic conversation, final answer, replay, no chat bubble',width,lang,reducedMotion);await p.close();
}}finally{await browser.close()}
