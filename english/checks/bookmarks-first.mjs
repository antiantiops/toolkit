import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--no-sandbox']});
const base=process.env.BASE_URL||'http://127.0.0.1:3097';
try{
 for(const [width,reduced] of [[390,false],[1280,false],[390,true]]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference'});
  let patches=0,fail=false;
  const words=Array.from({length:6},(_,i)=>({id:i+1,english:['delulu','touch grass','no cap','mitigate','prioritize','recall'][i],needsReview:[2,4,6].includes(i+1),searches:2,weekSearches:1,chat:{meaning:'Từ học trong tuần',example:'Practice this word every day.'}}));
  await page.route('**/api/my-words**',r=>{
   if(r.request().method()==='PATCH'){patches++;return r.fulfill({json:{ok:true}});}
   const more=new URL(r.request().url()).searchParams.has('before');
   if(more&&fail)return r.fulfill({status:503,json:{error:'Thử lại sau'}});
   return r.fulfill({json:{words:more?words.slice(4):words.slice(0,4),next:more?null:4,weeks:[]}});
  });
  await page.goto(base);await page.getByRole('button',{name:/My Words/}).click();
  const toggle=page.locator('[data-bookmarks-first]'),ids=()=>page.locator('[data-word-id]').evaluateAll(els=>els.map(e=>+e.dataset.wordId));
  await toggle.scrollIntoViewIfNeeded();await page.waitForTimeout(200);
  assert.equal(await toggle.locator('svg').getAttribute('data-book-icon'),'closed');
  const heading=await page.getByRole('heading',{name:'Từ trong tuần',exact:true}).boundingBox(),button=await toggle.boundingBox();
  assert(button.width<190);assert(Math.abs(heading.y+heading.height/2-button.y-button.height/2)<3);
  await page.screenshot({path:`/root/.openclaw/workspace-nim/media/bookmarks-${width}-off.png`});
  const y=await page.evaluate(()=>scrollY);
  if(!reduced){fail=true;await toggle.click();await page.locator('p[role="alert"]').waitFor();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.deepEqual(await ids(),[1,2,3,4]);fail=false;}
  await toggle.click();await page.waitForFunction(()=>document.querySelector('[data-bookmarks-first]')?.getAttribute('aria-pressed')==='true');
  assert.deepEqual(await ids(),[2,4,6,1,3,5]);assert.equal(await toggle.locator('svg').getAttribute('data-book-icon'),'open');
  const active=await page.locator('[data-word-id="2"]').evaluate(e=>e.getAnimations().length);
  assert.equal(active>0,!reduced);
  if(!reduced){
   await page.locator('[data-word-id]').evaluateAll(els=>els.forEach(e=>e.getAnimations().forEach(a=>{a.pause();a.currentTime=0;})));
   await page.screenshot({path:`/root/.openclaw/workspace-nim/media/bookmarks-${width}-start.png`});
   await page.locator('[data-word-id]').evaluateAll(els=>els.forEach(e=>e.getAnimations().forEach(a=>a.currentTime=310)));
   await page.screenshot({path:`/root/.openclaw/workspace-nim/media/bookmarks-${width}-mid.png`});
   await page.locator('[data-word-id]').evaluateAll(els=>els.forEach(e=>e.getAnimations().forEach(a=>a.finish())));
  }
  await page.waitForTimeout(700);assert(Math.abs(await page.evaluate(()=>scrollY)-y)<3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/root/.openclaw/workspace-nim/media/bookmarks-${width}-end.png`});
  await toggle.click();await page.waitForTimeout(700);assert.deepEqual(await ids(),[1,2,3,4,5,6]);assert.equal(patches,0);
  await toggle.click();await toggle.click();await page.waitForTimeout(700);assert.deepEqual(await ids(),[1,2,3,4,5,6]);
  await page.close();
 }
 console.log('PASS bookmark grouping, all pages, exact restore, no order writes, failure recovery, rapid toggles, animation, stable scroll, reduced motion, desktop/mobile');
}finally{await browser.close();}
