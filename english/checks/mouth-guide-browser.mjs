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
 await p.goto('http://127.0.0.1:3098');await p.waitForTimeout(2000); const input=p.getByPlaceholder('Ví dụ: I goed to school yesterday');await input.fill('Prove');await input.press('Enter');
 const panel=p.getByTestId('pronunciation-recorder');assert.equal(await panel.count(),0);await p.getByRole('button',{name:'Luyện nói',exact:true}).click();await panel.waitFor();assert.equal(await p.locator('#mouth-guide iframe').count(),0);await panel.getByRole('button',{name:'Xem khẩu hình',exact:true}).click();await p.locator('#mouth-guide iframe').waitFor();assert.match(await p.locator('#mouth-guide iframe').getAttribute('src'),/nR-K3mrHFv0/);await p.getByRole('button',{name:'/uː/',exact:true}).click();assert.match(await p.locator('#mouth-guide iframe').getAttribute('src'),/IwahymIkGJ0/);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:`/root/.openclaw/workspace-nim/media/mouth-guide-${width}.png`});await panel.getByRole('button',{name:'Ẩn khẩu hình'}).click();assert.equal(await p.locator('#mouth-guide iframe').count(),0);console.log('PASS mouth guide',width,'lazy player, IPA selection, hide, no overflow');await context.close();
}
}finally{await b.close()}
