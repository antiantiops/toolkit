// Run with NODE_PATH pointing to an existing Playwright installation.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}), headless:true,args:['--no-sandbox']});
 const page = await browser.newPage();
 const errors=[]; page.on('pageerror', e=>errors.push(e.message));
 await page.route('**/api/**', async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/pronunciation') return route.continue();
  let body={};
  if(url.pathname==='/api/session') body=url.searchParams.get('type')==='manifest'?{available:{vocab:true}}:{session:{words:[{word:'vulnerable',meaning:'dễ bị tổn thương',ipa:'/wrong/',pronunciation:{uk:'/old/',us:'/old/',source:'IPA-dict'}}]},next:null};
  if(url.pathname==='/api/quick-word') body={word:{word:'vulnerable',meaning:'dễ bị tổn thương'}};
  if(url.pathname==='/api/word') body={word:{word:'vulnerable',meaning:'dễ bị tổn thương',ipa:'/wrong/'}};
  if(url.pathname==='/api/game-memory') body={memory:{}};
  if(url.pathname==='/api/my-words') body={words:[]};
  await route.fulfill({json:body});
 });
 for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);
  await page.goto('http://127.0.0.1:3097/');
  const panel=page.getByTestId('oxford-pronunciation').first();
  await panel.getByRole('button',{name:'Nghe Oxford UK: vulnerable'}).waitFor({timeout:20000});
  assert((await panel.innerText()).includes('/ˈvʌlnərəbl/'));
  assert(!(await panel.innerText()).includes('/old/'));
  for(const region of ['UK','US']){
   await panel.getByRole('button',{name:`Nghe Oxford ${region}: vulnerable`}).click();
   await page.waitForFunction(()=>{const a=document.querySelector('[data-testid="oxford-pronunciation"] audio');return a.readyState>=2 && a.currentTime>0;},{},{timeout:15000});
   const media=await panel.locator('audio').evaluate(a=>({src:a.currentSrc,duration:a.duration,error:a.error?.message}));
   assert(media.src.includes(region==='UK'?'__gb_1.mp3':'__us_1.mp3'));
   assert(media.duration>0 && !media.error);
   console.log(viewport.width,region,media);
  }
  await page.screenshot({path:`/tmp/oxford-${viewport.width}.png`,fullPage:true});
  await panel.screenshot({path:`/tmp/oxford-detail-${viewport.width}.png`});
  await page.getByPlaceholder('Ví dụ: I goed to school yesterday').fill('vulnerable');
  await page.getByPlaceholder('Ví dụ: I goed to school yesterday').press('Enter');
  const popup=page.locator('[data-testid="lookup-word-header"]').locator('..').locator('..');
  await popup.getByRole('button',{name:'Nghe Oxford US: vulnerable'}).waitFor();
  assert((await popup.innerText()).includes('/ˈvʌlnərəbl/'));
  assert(!(await popup.innerText()).includes('/wrong/'));
  await popup.screenshot({path:`/tmp/oxford-popup-${viewport.width}.png`});
 }
 assert.deepEqual(errors,[]);
 await browser.close();console.log('Oxford UI and both real recordings PASS');
})().catch(e=>{console.error(e);process.exit(1)});
