import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8283';
const wallClock=process.env.WALL_CLOCK==='1';
const mediaDir='/root/.openclaw/workspace-nim/media';

async function safeClick(locator){
 try{
  await locator.click({timeout:1500});
 }catch{
  await locator.click({force:true});
 }
}

const b=await chromium.launch({args:['--no-sandbox']});
try{
 if(wallClock){
  const p=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  await p.addInitScript(()=>localStorage.setItem('deck-language','en'));
  await p.goto(`${baseUrl}/#10`);
  await p.locator('.reading-slide').waitFor({timeout:15000});
  const t0=Date.now();
  await p.locator('.translate-launcher').waitFor({timeout:80000});
  const launcherMs=Date.now()-t0;
  await p.locator('.speaker-playing').waitFor({timeout:80000});
  const speakerMs=Date.now()-t0;
  await p.locator('.translate-example').waitFor({timeout:80000});
  const exampleMs=Date.now()-t0;
  await p.locator('.practice-paper').waitFor({timeout:80000});
  const writingMs=Date.now()-t0;
  await p.locator('.recall-prompt').waitFor({timeout:80000});
  const promptMs=Date.now()-t0;
  console.log(`WALL_CLOCK elapsed ms: launcher=${launcherMs} speaker=${speakerMs} example=${exampleMs} writing=${writingMs} prompt=${promptMs}`);
  await p.waitForTimeout(1100);
  await p.screenshot({path:`${mediaDir}/s10-new-wall-prompt.png`});
  const tClick=Date.now();
  await p.locator('.recall-next').click();
  await p.locator('.daily-test').waitFor({timeout:5000});
  await p.waitForFunction(
   ()=>[...document.querySelectorAll('.teacher-right')].length===3&&
       [...document.querySelectorAll('.teacher-right')].every(e=>e.style.clipPath==='inset(0px 0% 0px 0px)'||e.style.clipPath==='inset(0 0% 0 0)'),
   null,
   {timeout:15000}
  );
  const correctedMs=Date.now()-tClick;
  assert.ok(correctedMs>=8000&&correctedMs<12000,`correctedMs=${correctedMs}`);
  await p.locator('.recall-failure').waitFor({timeout:25000});
  const failureMs=Date.now()-tClick;
  assert.ok(failureMs>=18000&&failureMs<21000,`failureMs=${failureMs}`);
  console.log(`WALL_CLOCK test ms: corrected=${correctedMs} failure=${failureMs}`);
  await p.waitForTimeout(1100);
  await p.screenshot({path:`${mediaDir}/s10-new-wall-failure.png`});
  console.log('PASS WALL_CLOCK EN 1440');
  await p.close();
 }else{
  const branches=[
   [1440,'en','normal'],
   [1440,'vi','normal'],
   [390,'en','normal'],
   [390,'vi','reduce'],
  ];
  for(const [width,lang,motion] of branches){
   const reduced=motion==='reduce';
   const p=await b.newPage({
    viewport:{width,height:width===390?844:900},
    reducedMotion:motion==='reduce'?'reduce':'no-preference',
   });
   await p.clock.install({time:0});
   await p.clock.pauseAt(0);
   await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
   await p.goto(`${baseUrl}/#10`);

   await p.clock.runFor(50);
   await p.locator('.reading-slide').waitFor({timeout:2000});
   await p.locator('[data-book-day="0"]').waitFor({timeout:2000});

   await p.clock.runFor(1550); // t=1600
   await p.locator('[data-book-day="15"]').waitFor({timeout:2000});

   await p.clock.runFor(18300); // t=19900
   const tCount=await p.locator('.reading-translate').count();
   const rStep=await p.locator('.reading-slide').getAttribute('data-reading-step');
   const tStage=tCount?await p.locator('.reading-translate').getAttribute('data-translate-stage'):null;
   assert.equal(tCount,0,`expected no translate at 19900ms, got count=${tCount} step=${rStep} stage=${tStage}`);

   await p.clock.runFor(200); // t=20100
   await p.locator('.translate-launcher').waitFor({timeout:2000});

   await p.clock.runFor(2950); // t=23050 -> stage 4 setInterval mounts
   await p.locator('[data-translate-stage="4"]').waitFor({timeout:2000});
   await p.clock.runFor(1450); // t=24500
   assert.equal((await p.locator('.translate-input').textContent()??'').trim(),'Indicator');
   assert.ok((await p.locator('.translate-output').textContent()??'').trim().length>0);

   await p.clock.runFor(3600); // t=28100
   await p.locator('.speaker-playing').waitFor({timeout:2000});

   await p.clock.runFor(6000); // t=34100
   await p.locator('.translate-example').waitFor({timeout:2000});

   await p.clock.runFor(7100); // t=41200 -> examplePhase 3 (7100ms into step 2) mounts setInterval
   await p.clock.runFor(3800); // t=45000
   assert.equal(
    (await p.locator('.translate-input').textContent()??'').trim(),
    'Current economic indicators show admirable growth in mining.'
   );
   assert.match(await p.locator('.translate-output').textContent()??'',/Các chỉ số kinh tế/);
   if(width===1440&&lang==='en'&&!reduced){
    await p.screenshot({path:`${mediaDir}/s10-new-example.png`,animations:'disabled'});
   }

   await p.clock.runFor(10100); // t=55100
   await p.locator('.practice-paper').waitFor({timeout:2000});

   await p.clock.runFor(10900); // t=66000
   const rows=p.locator('.practice-copy p');
   assert.equal(await rows.count(),9);
   for(const row of await rows.all()){
    const cp=await row.evaluate(e=>e.style.clipPath);
    assert.equal(cp,'inset(0px 0% 0px 0px)',`unexpected row clipPath: ${cp}`);
   }
   if(width===1440&&lang==='en'&&!reduced){
    await p.screenshot({path:`${mediaDir}/s10-new-writing.png`,animations:'disabled'});
   }

   await p.clock.runFor(3100); // t=69100
   await p.locator('.recall-prompt').waitFor({timeout:2000});

   await p.clock.runFor(5000); // t=74100 (gate hold)
   assert.equal(await p.locator('.daily-test').count(),0);

   await safeClick(p.locator('.recall-next'));
   await p.clock.runFor(100);
   await p.locator('.daily-test').waitFor({timeout:2000});

   await p.clock.runFor(9000); // +9100 from click
   const right=p.locator('.teacher-right');
   assert.equal(await right.count(),3);
   for(const el of await right.all()){
    const cp=await el.evaluate(e=>e.style.clipPath);
    assert.equal(cp,'inset(0px 0% 0px 0px)',`unexpected teacher-right clipPath: ${cp}`);
   }
   if(width===1440&&lang==='en'&&!reduced){
    await p.screenshot({path:`${mediaDir}/s10-new-corrected.png`,animations:'disabled'});
   }

   await p.clock.runFor(8800); // +17900 from click (<18000)
   assert.equal(await p.locator('.recall-failure').count(),0);

   await p.clock.runFor(300); // +18200 from click (>18100)
   await p.locator('.recall-failure').waitFor({timeout:2000});
   if(width===1440&&lang==='en'&&!reduced){
    await p.screenshot({path:`${mediaDir}/s10-new-failure.png`,animations:'disabled'});
   }
   if(width===390&&lang==='vi'&&reduced){
    await p.screenshot({path:`${mediaDir}/s10-new-390-reduced-final.png`,animations:'disabled'});
   }

   await safeClick(p.locator('.recall-failure button'));
   await p.clock.runFor(50);
   await p.locator('[data-book-day="0"]').waitFor({timeout:2000});
   assert.equal(await p.locator('.reading-translate').count(),0);
   assert.equal(await p.locator('.recall-prompt').count(),0);
   assert.equal(await p.locator('.daily-test').count(),0);
   assert.equal(await p.locator('.recall-failure').count(),0);

   console.log(`PASS ReadingSlide (#10) pacing [${width},${lang},${motion}]`);
   await p.close();
  }
 }
}finally{
 await b.close();
}
