import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
try {
 const p=await browser.newPage({viewport:{width:390,height:844}});
 await p.route('**/api/lookup',r=>r.fulfill({json:{result:{corrected:'Chemical',meaning:'hóa chất',original:'Chemical'}}}));
 await p.route('**/api/word',async r=>{await new Promise(resolve=>setTimeout(resolve,7000));await r.fulfill({json:{word:{word:'Chemical',meaning:'hóa chất',partOfSpeech:'noun / adjective'}}}).catch(()=>{});});
 await p.route('**/api/quick-word',async r=>{await new Promise(resolve=>setTimeout(resolve,7000));await r.fulfill({json:{meaning:'hóa chất'}}).catch(()=>{});});
 await p.route('**/api/my-words**',r=>r.fulfill({json:{words:[]}}));
 await p.goto('http://192.168.101.36:8085/');
 await p.getByPlaceholder('Ví dụ: I goed to school yesterday').fill('Chemical');
 await p.getByPlaceholder('Ví dụ: I goed to school yesterday').press('Enter');
 await p.getByTestId('lookup-word-class').waitFor({timeout:5000});
 assert.match(await p.getByTestId('lookup-word-class').innerText(),/noun.*adjective/);
 assert(await p.getByText('Đang tra nghĩa tiếng Việt...',{exact:true}).isVisible());
 await p.screenshot({path:'/root/.openclaw/workspace-nim/media/early-word-class-live.png'});
 console.log('PASS live dictionary noun/adjective visible while AI meaning delayed (mobile, mocked AI)');
} finally {await browser.close();}
