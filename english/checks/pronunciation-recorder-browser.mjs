import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
try {
for(const width of [390,1440]){
 const context=await b.newContext({viewport:{width,height:900},permissions:['microphone']});const p=await context.newPage();
 await p.route('**/api/my-words**',r=>r.fulfill({json:{words:[],ok:true}}));
 await p.route('**/api/feature-notices',r=>r.fulfill({json:{show:false}}));
 await p.route('**/api/lookup',r=>r.fulfill({json:{result:{corrected:'Prove',meaning:'chứng minh',original:'Prove'}}}));
 await p.route('**/api/word',r=>r.fulfill({json:{word:{word:'Prove',meaning:'chứng minh',partOfSpeech:'verb',easyReading:'UK: PRU-v · US: PRU-v'}}}));
 await p.route('**/api/quick-word',r=>r.fulfill({json:{meaning:'chứng minh'}}));
 await p.route('**/api/pronunciation-assess',async r=>{assert.match(r.request().headers()['content-type'],/multipart/);assert(r.request().postDataBuffer().includes(Buffer.from('RIFF')));await r.fulfill({json:{result:{status:'feedback',heard:'prove',summary:'Âm cuối cần rõ hơn.',tips:['Răng trên chạm nhẹ môi dưới khi đọc /v/.']}}});});
 await p.goto('http://127.0.0.1:3097');await p.waitForTimeout(2000); const input=p.getByPlaceholder('Ví dụ: I goed to school yesterday');await input.fill('Prove');await input.press('Enter');
 const panel=p.getByTestId('pronunciation-recorder');await panel.waitFor();await panel.getByRole('button',{name:'Ghi âm',exact:true}).click();await panel.getByRole('button',{name:'Dừng ghi âm'}).waitFor();await p.waitForTimeout(700);await panel.getByRole('button',{name:'Dừng ghi âm'}).click();await panel.getByRole('button',{name:'Gửi đánh giá',exact:true}).click();await panel.getByText('Âm cuối cần rõ hơn.').waitFor();assert(await panel.locator('audio').getAttribute('src'));
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`/root/.openclaw/workspace-nim/media/pronunciation-${width}.png`});await panel.getByRole('button',{name:'Thu lại'}).click();await panel.getByRole('button',{name:'Dừng ghi âm'}).waitFor();await p.getByRole('button',{name:'Đóng',exact:true}).click();await p.waitForTimeout(200);assert(await p.evaluate(()=>document.querySelectorAll('audio[src^="blob:"]').length===0));console.log('PASS',width,'record WAV, preview, send, feedback, retry, close cleanup (fake microphone, mocked AI)');await context.close();
}
}finally{await b.close()}
