import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const mp3=readFileSync(process.env.AUDIO_FIXTURE||'/tmp/listening-text-fixture.mp3');const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [390,1440]){for(const source of ['image','audio','text']){
const page=await browser.newPage({viewport:{width,height:950}});const sentences=[{en:'We are making progress.',vi:'Chúng ta đang tiến bộ.'},{en:'We are making progress.',vi:'Chúng ta đang tiến bộ.'}];
await page.route('**/api/feature-notices',r=>r.fulfill({json:{show:false}}));
await page.route('**/api/session?*',r=>r.fulfill({json:{session:source==='image'?{listening:{title:'Test lesson',sentences}}:source==='audio'?{listening:{audio:{name:'test.mp3'},result:{timed:true,segments:sentences.map((s,i)=>({...s,start:i*.8,end:(i+1)*.8}))}}}:{}}}));
await page.route('**/api/listening-audio/file',r=>{const range=r.request().headers()['range'];const start=Number(range?.match(/bytes=(\d+)/)?.[1]||0);return r.fulfill({status:range?206:200,headers:{'Content-Type':'audio/mpeg','Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${mp3.length-1}/${mp3.length}`}:{})},body:mp3.subarray(start)});});await page.route('**/api/listening',r=>r.fulfill({contentType:'audio/mpeg',body:mp3}));
await page.goto(process.env.TEST_URL||'http://127.0.0.1:3104');await page.waitForTimeout(1200);await page.getByRole('button',{name:/Listening/}).first().click();
if(source==='text'){await page.getByRole('button',{name:'Văn bản',exact:true}).click();await page.getByTestId('listening-text').locator('textarea').fill('We are making progress. We are making progress.');await page.getByRole('button',{name:'Tạo audio',exact:true}).click();}
if(source==='image')await page.getByRole('button',{name:'Tạo audio Listening',exact:true}).click();
if(source==='audio')await page.getByRole('button',{name:'File audio',exact:true}).click();
const section=source==='text'?page.getByTestId('listening-text'):source==='image'?page.locator('#image-listening').first():page.locator('section').filter({has:page.getByText('Thêm file nghe',{exact:true})}).last();
const player=section.getByTestId('listening-player');await player.waitFor();const lines=section.locator('[data-transcript-line]');assert.equal(await lines.count(),2);
await page.waitForFunction(()=>[...document.querySelectorAll('audio')].some(a=>a.readyState>=1&&a.duration>0));await lines.nth(1).click();await page.waitForTimeout(150);assert.equal(await lines.nth(1).getAttribute('aria-current'),'true');assert((await section.locator('audio').evaluate(a=>a.currentTime))>0);
await player.getByRole('button',{name:'Câu trước',exact:true}).click();assert.equal(await lines.first().getAttribute('aria-current'),'true');
await player.getByRole('combobox').selectOption('0.8');assert.equal(await section.locator('audio').evaluate(a=>a.playbackRate),.8);
await player.getByRole('button',{name:'Lặp lại toàn bài'}).click();assert(await section.locator('audio').evaluate(a=>a.loop));
await section.getByRole('switch').click();await section.locator('[data-transcript-paragraph]').waitFor();await section.getByRole('switch').click();await lines.first().waitFor();
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await section.getByTestId('listening-lyrics').scrollIntoViewIfNeeded();await page.screenshot({path:`/root/.openclaw/workspace-nim/media/listening-unified-${source}-${width}.png`});console.log('PASS',source,width,'measured audio, seek, previous, speed, repeat, paragraph, no overflow');await page.close();
}}}finally{await browser.close();}
