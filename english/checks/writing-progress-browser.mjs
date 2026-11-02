import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {for(const width of [1440,390]){
 const p=await browser.newPage({viewport:{width,height:900}});let reads=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{sessionStorage.setItem('writing-pending-job','fixture');localStorage.setItem('english-theme','light')});
 await p.route('**/api/**',r=>{const path=new URL(r.request().url()).pathname;let data={};
 if(path==='/api/writing'){reads++;data={jobId:'fixture',status:'running',stage:'enrich',progress:{completed:1,total:4},source:{pages:[{sourceText:'Dear Alice,\nThank you for your offer.',topic:'Source example',wordBank:['offer']}]},parts:[{index:0,status:'completed'},{index:1,status:'running'},{index:2,status:'pending'},{index:3,status:'pending'}],writing:{kind:'sample',title:'Sample'}};}
 else if(path==='/api/session')data={available:{},session:{}};else if(path==='/api/feature-notices')data={show:false};else if(path==='/api/chat-words')data={enabled:false};
 return r.fulfill({json:data});});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8271');await p.getByRole('navigation',{name:'Chọn kỹ năng'}).getByRole('button',{name:/Writing/}).click();await p.locator('[data-writing-progress]').waitFor();
 assert.match(await p.locator('[data-writing-progress]').innerText(),/Dear Alice/);assert.match(await p.locator('[data-writing-progress]').innerText(),/Đã xong/);assert.ok(reads>0);assert.deepEqual(errors,[]);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/writing-progress-${width}.png`,fullPage:true});await p.close();console.log('PASS progressive source visible before completion',width);
}}finally{await browser.close()}
