import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const words=[{word:'book',meaning:'sách',example:'Read a book.'},{word:'pen',meaning:'bút',example:'Use a pen.'},{word:'desk',meaning:'bàn',example:'A desk.'}];
const browser=await chromium.launch({args:['--no-sandbox']});
try {const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/game-memory',r=>r.fulfill({json:r.request().method()==='GET'?{memory:{}}:{word:'book',debt:3,mistakes:1}}));
 await page.route('**/api/session?*',r=>r.fulfill({json:{session:{words},next:null}}));
 await page.goto('http://192.168.101.36:8085/games');assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'welcome');await page.getByRole('button',{name:'Bắt đầu chuyến đi'}).click();assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'waiting');
 await page.locator('section h1').scrollIntoViewIfNeeded();
 const dock=page.locator('.buddy-docked');
 const box=await dock.boundingBox();assert(box.y>=0 && box.y+box.height<=844);
 assert.equal(await dock.evaluate(e=>getComputedStyle(e).position),'fixed');
 await page.getByRole('button',{name:'Chưa nhớ, xem đáp án'}).scrollIntoViewIfNeeded();
 const actionBox=await page.getByRole('button',{name:'Chưa nhớ, xem đáp án'}).boundingBox();
 assert(actionBox.y+actionBox.height<=box.y);
 await page.screenshot({path:'/root/.openclaw/workspace-nim/media/vocab-game-mobile-dock.png'});
 let count=0,wrong=false;
 while(await page.getByRole('button',{name:'Chơi lại với thứ tự mới'}).count()===0){
  const title=await page.locator('section h1').innerText();
  if(await page.locator('#game-answer').count()){
   const word=words.find(w=>w.meaning===title).word;
   await page.locator('#game-answer').fill(wrong?word:'wrong');wrong=true;
   await page.getByRole('button',{name:'Kiểm tra',exact:true}).click();
  }else {await page.getByRole('button',{name:words.find(w=>w.word===title).meaning,exact:true}).click();}
  await page.getByRole('status').waitFor();
  const repairButton=page.getByRole('button',{name:'Luyện lại từ này · 3 lượt'});
  if(await repairButton.count()){
   assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'encourage');
   const target=words.find(w=>w.meaning===title).word;
   await repairButton.click();assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'coach');
   for(let n=1;n<=3;n++){
    assert(await page.locator('[data-repair-round]').count());
    if(n===2){await page.locator('#repair-answer').fill('still wrong');await page.getByRole('button',{name:'Xác nhận lượt 2/3'}).click();assert(await page.getByText('Chưa đúng. Đáp án:',{exact:false}).count());}
    await page.locator('#repair-answer').fill(target);
    await page.getByRole('button',{name:`Xác nhận lượt ${n}/3`}).click();
   }
   assert.equal(await page.locator('[data-repair-round]').count(),0);
  }
  await page.getByRole('button',{name:/^(Tiếp tục|Xem kết quả)$/}).click();
  assert(++count<=9);
 }
 assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'celebrate');
 assert.equal(count,7);assert(await page.getByText('Từ từng trả lời sai trong lượt này:',{exact:true}).count());
 assert(await page.locator('main').evaluate(e=>e.scrollWidth<=e.clientWidth));
 await page.screenshot({path:'/root/.openclaw/workspace-nim/media/vocab-game-results.png'});
 await page.getByRole('button',{name:'Chơi lại với thứ tự mới'}).click();assert(await page.locator('section h1').count());
 console.log('PASS mobile full game: 3 choice + 3 recall + delayed retry, results, restart, no overflow; authenticated lesson API mocked');
}finally{await browser.close();}
