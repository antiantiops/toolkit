import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const words=[{word:'book',meaning:'sách',example:'Read a book.'},{word:'pen',meaning:'bút',example:'Use a pen.'},{word:'desk',meaning:'bàn',example:'A desk.'}];
const browser=await chromium.launch({args:['--no-sandbox']});
try {const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/session?*',r=>r.fulfill({json:{session:{words},next:null}}));
 await page.goto('http://192.168.101.36:8085/games');await page.getByRole('button',{name:'Bắt đầu chuyến đi'}).click();
 let count=0,wrong=false;
 while(await page.getByRole('button',{name:'Chơi lại với thứ tự mới'}).count()===0){
  const title=await page.locator('section h1').innerText();
  if(await page.locator('#game-answer').count()){
   const word=words.find(w=>w.meaning===title).word;
   await page.locator('#game-answer').fill(wrong?word:'wrong');wrong=true;
   await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  }else {await page.getByRole('button',{name:words.find(w=>w.word===title).meaning,exact:true}).click();}
  await page.getByRole('status').waitFor();
  await page.getByRole('button',{name:/^(Tiếp tục|Xem kết quả)$/}).click();
  assert(++count<=9);
 }
 assert.equal(count,7);assert(await page.getByText('Từ từng trả lời sai trong lượt này:',{exact:true}).count());
 assert(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:'/root/.openclaw/workspace-nim/media/vocab-game-results.png'});
 await page.getByRole('button',{name:'Chơi lại với thứ tự mới'}).click();assert(await page.locator('section h1').count());
 console.log('PASS mobile full game: 3 choice + 3 recall + delayed retry, results, restart, no overflow; authenticated lesson API mocked');
}finally{await browser.close();}
