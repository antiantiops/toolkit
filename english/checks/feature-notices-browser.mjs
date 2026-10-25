import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 for(const hasLesson of [true,false]){
  const page=await browser.newPage({viewport:{width:390,height:844}});let claimed=false;
  await page.route('**/api/feature-notices',r=>{const show=!claimed;claimed=true;return r.fulfill({json:{show}});});
  await page.route('**/api/writing-preferences',r=>r.fulfill({json:{customPrompt:'Viết dễ hiểu.'}}));
  await page.route('**/api/session?*',r=>{const type=new URL(r.request().url()).searchParams.get('type');return r.fulfill({json:type==='manifest'?{available:{writing:hasLesson}}:type==='writing'?{session:{writing:{kind:'dual',sample:{},title:'Test email',task:{scenario:'Introduce yourself',requirements:[],wordBank:[],suggestedOutline:[]}}}}:{session:{}}});});
  await page.goto('http://192.168.101.36:8085');
  const tour=page.getByRole('dialog',{name:'AI viết theo cách bạn muốn'});await tour.waitFor();
  assert(await tour.evaluate(e=>e.open));
  await page.getByRole('button',{name:'Dẫn tôi tới tính năng'}).click();
  await page.getByRole('button',{name:'Đã hiểu, bắt đầu dùng'}).click();
  if(hasLesson){await page.locator('#writing-prompt-text').waitFor();assert.equal(await page.locator('#writing-prompt-text').inputValue(),'Viết dễ hiểu.');}
  else {assert(await page.locator('#writing-upload-tour').isVisible());}
  await page.reload();await page.waitForTimeout(400);assert.equal(await page.locator('dialog[open]').count(),0);
  await page.close();
 }
 console.log('PASS automatic entry tour before Writing use, navigation and editor open with lesson, upload guidance without lesson, no repeat after reload; controlled API fixtures');
}finally{await browser.close();}
