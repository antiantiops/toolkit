import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/session?*',r=>{const type=new URL(r.request().url()).searchParams.get('type');return r.fulfill({json:type==='manifest'?{available:{writing:true}}:type==='writing'?{session:{writing:{kind:'dual',sample:{},title:'Test email',task:{scenario:'Introduce yourself to a client',requirements:[],wordBank:['honor','existing'],suggestedOutline:[]}}}}:{session:{}}});});
 let payload;
 await page.route('**/api/writing-model',r=>{payload=r.request().postDataJSON();return r.fulfill({json:{modelDraft:{title:'Test',paragraphs:[{part:'Email',sentences:[{id:'s1',en:'Dear client,',vi:'Kính gửi khách hàng,',phrases:[]}]}]}}});});
 await page.goto('http://192.168.101.36:8085');
 await page.getByRole('button',{name:'✍️ Writing',exact:true}).click();
 await page.getByRole('button',{name:'🧭 3. Dàn ý gợi ý',exact:true}).click();
 await page.getByRole('button',{name:'+ Tùy chỉnh prompt',exact:true}).click();
 const input=page.locator('#writing-prompt-text');assert.doesNotMatch(await input.inputValue(),/\b[ABC][12]\b/);
 await input.fill('Use common collocations.');await page.getByLabel('Trình độ viết (CEFR)').selectOption('B2');
 await page.getByRole('button',{name:'Áp dụng & tạo lại bài mẫu',exact:true}).click();
 await page.getByRole('button',{name:'🇬🇧 English',exact:true}).waitFor();
 assert.equal(payload.level,'B2');assert.equal(payload.customPrompt,'Use common collocations.');
 assert(await page.locator('[data-writing-custom-prompt]').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.getByRole('button',{name:'Khôi phục prompt mặc định',exact:true}).click();assert.doesNotMatch(await input.inputValue(),/\b[ABC][12]\b/);
 await page.screenshot({path:'/root/.openclaw/workspace-nim/media/writing-custom-prompt.png'});
 console.log('PASS live mobile prompt expand/edit/reset, regeneration payload and no overflow; lesson and AI response mocked');
} finally {await browser.close();}
