import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const baseUrl=process.env.TEST_URL||'http://127.0.0.1:3000';
const words=[{word:'book',meaning:'sách',example:'Read a book.'},{word:'pen',meaning:'bút',example:'Use a pen.'},{word:'desk',meaning:'bàn',example:'A desk.'}];
const oxford={
 book:{source:'Oxford',uk:'/bʊk/',us:'/bʊk/',audioUk:'https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/b/boo/book_/book__gb_1.mp3',audioUs:'https://www.oxfordlearnersdictionaries.com/media/english/us_pron/b/boo/book_/book__us_1.mp3',sourceUrl:'https://www.oxfordlearnersdictionaries.com/definition/english/book_1'},
 pen:{source:'Oxford',uk:'/pen/',us:'/pen/',audioUk:'https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/p/pen/pen__/pen__gb_1.mp3',audioUs:'https://www.oxfordlearnersdictionaries.com/media/english/us_pron/p/pen/pen__/pen__us_1.mp3',sourceUrl:'https://www.oxfordlearnersdictionaries.com/definition/english/pen_1'},
 desk:{source:'Oxford',uk:'/desk/',us:'/desk/',audioUk:'https://www.oxfordlearnersdictionaries.com/media/english/uk_pron/d/des/desk_/desk__gb_1.mp3',audioUs:'https://www.oxfordlearnersdictionaries.com/media/english/us_pron/d/des/desk_/desk__us_1.mp3',sourceUrl:'https://www.oxfordlearnersdictionaries.com/definition/english/desk_1'},
};
const browser=await chromium.launch({args:['--no-sandbox']});
try {const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/pronunciation?*',r=>{const w=new URL(r.request().url()).searchParams.get('word')?.trim().toLowerCase();return r.fulfill({json:{pronunciation:oxford[w]||null}});});
 await page.route('**/api/game-memory',r=>r.fulfill({json:r.request().method()==='GET'?{memory:{}}:{word:'book',debt:3,mistakes:1}}));
 await page.route('**/api/session?*',r=>r.fulfill({json:{session:{words},next:null}}));
 await page.goto(`${baseUrl}/games`);assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'welcome');await page.getByRole('button',{name:'Bắt đầu chuyến đi'}).click();assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'waiting');
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
  assert.equal(await page.getByRole('status').count(),1);
  const repairButton=page.getByRole('button',{name:'Luyện lại từ này · 5 lượt'});
  if(await repairButton.count()){
   assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'encourage');
   const target=words.find(w=>w.meaning===title).word;
   await repairButton.click();assert.equal(await page.locator('[data-buddy-mood]').getAttribute('data-buddy-mood'),'coach');
   for(let n=1;n<=5;n++){
    assert(await page.locator('[data-repair-round]').count());
    if(n===2){await page.locator('#repair-answer').fill('still wrong');await page.getByRole('button',{name:'Xác nhận lượt 2/5'}).click();assert(await page.getByText('Chưa đúng. Đáp án:',{exact:false}).count());}
    const expected=n%2===1?target:title;
    assert.equal(await page.locator('.repair-ghost').innerText(),expected);
    await page.locator('#repair-answer').fill(expected);
    assert(await page.locator('.repair-ghost').isVisible());
    await page.getByRole('button',{name:`Xác nhận lượt ${n}/5`}).click();
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
