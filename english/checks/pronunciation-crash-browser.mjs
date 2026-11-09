import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
for(const result of [{status:'feedback',score:95,heard:'prove',segments:[{text:'prove',status:'correct'}],summary:'OK',tips:[]},{status:'feedback',score:70,heard:'prove',segments:[{status:'wrong'}],summary:'OK',tips:[]}]){
const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.stack));
await page.addInitScript(()=>sessionStorage.setItem('pronunciation-job:Prove','a'.repeat(64)));
await page.route('**/api/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({json:p==='/api/lookup'?{result:{corrected:'Prove',meaning:'chứng minh',original:'Prove'}}:p==='/api/word'?{word:{word:'Prove',meaning:'chứng minh'}}:p==='/api/pronunciation-assess'?{status:'completed',result}:p==='/api/my-words'?{words:[]}:{}})});
await page.goto(process.env.BASE_URL||'http://127.0.0.1:3097',{waitUntil:'domcontentloaded',timeout:20000});
const input=page.getByPlaceholder('Ví dụ: I goed to school yesterday');await input.fill('Prove');await input.press('Enter');await page.getByRole('button',{name:'Luyện nói',exact:true}).click();await page.waitForTimeout(1500);assert.equal(errors.length,0,errors.join('\n'));assert.equal((await page.textContent('body')).includes('Application error'),false);if(!result.segments[0].text){await page.getByRole('alert').filter({hasText:'Kết quả phát âm không hợp lệ'}).waitFor();await page.getByRole('button',{name:'Thử đánh giá lại'}).waitFor();}console.log('PASS normal/malformed result; app alive; retry visible');await page.close();
}
}finally{await browser.close()}
