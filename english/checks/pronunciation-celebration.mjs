import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try{for(const [width,reduced] of [[390,false],[1280,false],[390,true]]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
 let score=95,status='feedback';
 await page.addInitScript(()=>sessionStorage.setItem('pronunciation-job:Prove','a'.repeat(64)));
 for(const endpoint of ['my-words','feature-notices','quick-word'])await page.route(`**/api/${endpoint}**`,r=>r.fulfill({json:endpoint==='my-words'?{words:[]}:endpoint==='feature-notices'?{show:false}:{meaning:'chứng minh'}}));
 await page.route('**/api/lookup',r=>r.fulfill({json:{result:{corrected:'Prove',meaning:'chứng minh',original:'Prove'}}}));
 await page.route('**/api/word',r=>r.fulfill({json:{word:{word:'Prove',meaning:'chứng minh',partOfSpeech:'verb'}}}));
 await page.route('**/api/pronunciation-assess**',r=>r.fulfill({json:{status:'completed',result:{status,score,heard:'prove',segments:[{text:'prove',status:'correct'}],summary:'Phát âm tốt.',tips:[]}}}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:3099');
 const input=page.getByPlaceholder('Ví dụ: I goed to school yesterday');await input.fill('Prove');await input.press('Enter');
 const open=()=>page.getByRole('button',{name:'Luyện nói',exact:true}).click();
 await open();const party=page.locator('[data-pronunciation-celebration]');await party.waitFor();
 await party.scrollIntoViewIfNeeded();assert.equal(await party.locator('canvas').count(),1);
 assert.equal(await party.locator('.fireworks i').count(),reduced?0:36);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const phase of ['start','mid','end']){await page.waitForTimeout(phase==='start'?20:phase==='mid'?350:800);await page.screenshot({path:`/root/.openclaw/workspace-nim/media/celebration-${width}-${reduced?'reduced':phase}.png`});}
 await page.getByRole('button',{name:'Đóng lời chúc mừng'}).click();assert.equal(await party.count(),0);
 const close=()=>page.getByRole('button',{name:'Thu gọn luyện nói'}).click();
 for(const [next,kind,expected] of [[90,'feedback',false],[91,'feedback',true],[100,'feedback',true],[null,'retry',false],[95,'retry',false]]){
  await close();score=next;status=kind;await open();await page.getByText('Phát âm tốt.',{exact:true}).waitFor();await page.waitForTimeout(100);assert.equal(await party.count()>0,expected,`${next}/${kind}`);
 }
 await page.close();console.log('PASS celebration',width,reduced,'threshold, retry, robot, fireworks, dismissal, layout');
}}finally{await browser.close();}
