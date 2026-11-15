import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const base=process.env.BASE_URL||'http://127.0.0.1:8283';
const b=await chromium.launch({args:['--no-sandbox']});
try{
 for(const {lang,width,height,tap,reduced} of [
  {lang:'en',width:1366,height:768,tap:false,reduced:false},
  {lang:'vi',width:1366,height:768,tap:false,reduced:false},
  {lang:'en',width:390,height:844,tap:true,reduced:true},
 ]){
  const ctx=await b.newContext({viewport:{width,height},hasTouch:tap,isMobile:tap,reducedMotion:reduced?'reduce':'no-preference'});
  const p=await ctx.newPage();
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${base}/#6`);
  await p.locator('.usage-sequence').waitFor();
  await p.locator('.slide-transition[aria-busy=false]').waitFor();

  const main=p.locator('.usage-sequence');
  const stage=p.locator('.usage-app-stage');
  const appBtn=p.locator('.usage-app-picker button.opening-chatgpt');
  const mouse=p.locator('.demo-mouse');
  const clickOuter=async()=>{
   const box=await p.locator('.presentation').boundingBox();
   assert(box,'presentation box missing');
   const x=Math.round(box.x+8),y=Math.round(box.y+box.height/2);
   const onOuter=await p.evaluate(([cx,cy])=>{
    const el=document.elementFromPoint(cx,cy);
    return Boolean(el&&el.closest('.presentation')&&!el.closest('.usage-sequence'));
   },[x,y]);
   assert.equal(onOuter,true,`${lang}: outer point (${x},${y}) not outside .usage-sequence`);
   if(tap)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);
  };

  await p.waitForTimeout(4200);
  assert.equal(await p.locator('.usage-app-stage.chat-open').count(),0,`${lang}: idle >4s opened`);
  assert.equal(await main.evaluate(el=>el.classList.contains('is-started')),false,`${lang}: idle >4s started`);
  assert.equal(await appBtn.evaluate(el=>getComputedStyle(el).animationName),'none',`${lang}: opening-chatgpt animated before click`);
  assert.equal(await mouse.evaluate(el=>getComputedStyle(el).opacity),'0',`${lang}: demo-mouse visible before click`);

  if(tap)await appBtn.tap();else await appBtn.click();
  const replay=p.locator('.sequence-controls button');
  if(tap)await replay.tap();else await replay.click();
  await p.waitForTimeout(4200);
  assert.equal(await p.locator('.usage-app-stage.chat-open').count(),0,`${lang}: excluded button started sequence`);
  assert.equal(await main.evaluate(el=>el.classList.contains('is-started')),false,`${lang}: excluded button set is-started`);

  await clickOuter();
  await p.locator('.usage-sequence.is-started').waitFor({timeout:2000});
  await p.locator('.usage-app-stage.chat-open').waitFor({timeout:7000});

  await p.locator('.sequence-welcome, .composer-draft').first().waitFor({timeout:4000});
  await clickOuter();
  await p.waitForTimeout(300);
  assert.equal(await stage.evaluate(el=>el.classList.contains('chat-open')),true,`${lang}: repeat click reset sequence`);

  const expected=lang==='en'
   ?'AI helps computers perform tasks that normally require human intelligence, such as understanding questions, writing content, or explaining concepts.\n\nChat to get assistance. Always verify important information.'
   :'AI là công nghệ giúp máy tính thực hiện một số việc thường cần trí tuệ con người, như hiểu câu hỏi, viết nội dung hoặc giải thích kiến thức.\n\nBạn có thể trò chuyện để nhận hỗ trợ. Hãy kiểm tra lại thông tin quan trọng.';
  await p.waitForFunction((exp)=>{
   const el=document.querySelector('.example-ai');
   return el&&el.textContent===exp&&!el.querySelector('.typing-caret');
  },expected,{timeout:30000});

  if(tap)await replay.tap();else await replay.click();
  await p.waitForTimeout(4200);
  assert.equal(await p.locator('.usage-app-stage.chat-open').count(),0,`${lang}: Replay did not wait`);
  assert.equal(await main.evaluate(el=>el.classList.contains('is-started')),false,`${lang}: Replay kept is-started`);
  assert.equal(await mouse.evaluate(el=>getComputedStyle(el).opacity),'0',`${lang}: demo-mouse visible after Replay`);

  await clickOuter();
  await p.locator('.usage-sequence.is-started').waitFor({timeout:2000});
  await p.locator('.usage-app-stage.chat-open').waitFor({timeout:7000});

  await p.close();
  await ctx.close();
 }
}finally{await b.close();}
console.log('PASS usage-click-start: EN/VI desktop + phone tap');
