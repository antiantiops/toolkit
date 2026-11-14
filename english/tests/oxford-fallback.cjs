// NODE_PATH=/app/node_modules node tests/oxford-fallback.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/root/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',args:['--no-sandbox']});
 const page=await browser.newPage();let requests=0,release;let gate;
 // Deterministic audio lifecycle: no provider call or real synthesis.
 await page.addInitScript(()=>{window.Audio=class{constructor(){window.testAudio=this;} play(){return Promise.resolve();} pause(){}};});
 await page.route('**/api/**',async r=>{
  const u=new URL(r.request().url());let data={};
  if(u.pathname==='/api/session')data=u.searchParams.get('type')==='manifest'?{available:{vocab:true}}:{session:{words:[{word:'Blemish',partOfSpeech:'noun',ipa:'/ˈblemɪʃ/',pronunciation:{uk:'/ˈblemɪʃ/',us:'/ˈblemɪʃ/',source:'AI'},meaning:'tì vết'}]},next:null};
  if(u.pathname==='/api/pronunciation')data={pronunciation:null};
  if(u.pathname==='/api/game-memory')data={memory:{}};
  if(u.pathname==='/api/my-words')data={words:[]};
  if(u.pathname==='/api/tts'){requests++;await gate;return r.fulfill({body:Buffer.from('test audio'),contentType:'audio/mpeg'});}
  await r.fulfill({json:data});
 });
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:3097/');
  const panel=page.getByTestId('oxford-pronunciation').first();const button=panel.getByRole('button',{name:'Nghe đọc: Blemish',exact:true});await button.waitFor();
  assert((await panel.innerText()).includes('UK: /ˈblemɪʃ/'));assert((await panel.innerText()).includes('Giọng tổng hợp'));assert.equal(await panel.getByRole('link',{name:'Nguồn: Oxford'}).count(),0);
  const badge=page.getByText('noun',{exact:true}).first();const b=await badge.boundingBox(),p=await panel.boundingBox();assert(b.y+b.height<=p.y+1);
  if(width===390){gate=new Promise(r=>release=r);await button.click();assert(await button.isDisabled());assert.equal(await button.getAttribute('aria-busy'),'true');await button.evaluate(b=>b.click());assert.equal(requests,1);release();await page.waitForFunction(()=>window.testAudio?.onended&&document.querySelector('button[aria-label="Nghe đọc: Blemish"]').getAttribute('aria-busy')==='false');assert(await button.isDisabled());await page.evaluate(()=>window.testAudio.onended());await page.waitForFunction(()=>!document.querySelector('button[aria-label="Nghe đọc: Blemish"]').disabled);}
  await panel.locator('..').locator('..').screenshot({path:`/root/.openclaw/workspace-nim/artifacts/fallback-${width}.png`});console.log(width,'fallback IPA, label, heading PASS');
 }
 await browser.close();console.log('Fallback loading/playback lock PASS (mock audio lifecycle)');
})().catch(e=>{console.error(e);process.exit(1)});
