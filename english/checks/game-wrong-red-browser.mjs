import {mkdirSync} from 'node:fs';
import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const BASE=process.env.TEST_URL||'http://127.0.0.1:3199';
const ARTIFACTS='/root/.openclaw/workspace-nim/artifacts/game-wrong-red';
mkdirSync(ARTIFACTS,{recursive:true});

const words=[
 {word:'mitigate',meaning:'giảm nhẹ',example:'We mitigate the risk.'},
 {word:'diversify',meaning:'đa dạng hóa',example:'We diversify our investments.'},
 {word:'hedge',meaning:'phòng ngừa',example:'Firms hedge currency exposure.'},
];

async function checkState(page,mode,viewportName){
 const title=await page.locator('section h1').innerText();
 const current=mode==='usage'
  ?words.find(w=>w.example.replace(w.word,'_____')===title)
  :words.find(w=>w.word===title)||(mode==='listen'?words[0]:null);
 const btns=page.locator('section .grid button');
 const count=await btns.count();
 assert(count>=3,`${mode}: expected >=3 options, got ${count}`);
 const texts=await btns.allInnerTexts();
 const wrongIdx=texts.findIndex(t=>mode==='usage'?t!==current.word:current?t!==current.meaning:true);
 assert(wrongIdx>=0,`${mode}: no wrong option found`);
 const wrongText=texts[wrongIdx];
 await btns.nth(wrongIdx).click();
 await btns.nth(wrongIdx).hover();
 await page.getByRole('status').waitFor();

 const states=await btns.evaluateAll(els=>els.map(e=>({
  text:e.textContent,
  disabled:e.disabled,
  state:e.dataset.choiceState,
  bg:getComputedStyle(e).backgroundColor,
  border:getComputedStyle(e).borderColor,
  color:getComputedStyle(e).color,
  className:e.className,
 })));
 const wrongBtn=states.find(s=>s.state==='wrong');
 const correctBtn=states.find(s=>s.state==='correct');
 const neutralBtns=states.filter(s=>s.state==='neutral');
 assert(wrongBtn,`${mode}: missing wrong button`);
 assert(correctBtn,`${mode}: missing correct button`);
 assert.equal(neutralBtns.length,count-2,`${mode}: expected ${count-2} neutral buttons`);
 assert(states.every(s=>s.disabled),`${mode}: all options must be disabled after feedback`);
 assert(wrongBtn.text.includes('✕')&&wrongBtn.text.includes('Sai')&&wrongBtn.text.includes(wrongText),`${mode}: wrong indicator`);
 assert(correctBtn.text.includes('✓')&&correctBtn.text.includes('Đúng'),`${mode}: correct indicator`);
 // Red vs teal vs neutral RGB checks (wrong: red > green/blue; correct: teal green/blue > red)
 const rgb=s=>s.match(/\d+/g).slice(0,3).map(Number);
 const [wr,wg,wb]=rgb(wrongBtn.border), [wbgR,wbgG,wbgB]=rgb(wrongBtn.bg);
 assert(wr>wg+40&&wr>wb+40&&wbgR>wbgG+15&&wbgR>wbgB+15,`${mode}: wrong not red (${wrongBtn.border} / ${wrongBtn.bg})`);
 const [cr,cg,cb]=rgb(correctBtn.border), [cbgR,cbgG,cbgB]=rgb(correctBtn.bg);
 assert(cg>cr+40&&cb>cr+30&&cbgG>cbgR&&cbgB>cbgR,`${mode}: correct not teal (${correctBtn.border} / ${correctBtn.bg})`);
 for(const n of neutralBtns){
  assert(!n.className.includes('red')&&!n.className.includes('teal'),`${mode}: neutral should have no red/teal class`);
  assert.notEqual(n.bg,wrongBtn.bg);
  assert.notEqual(n.bg,correctBtn.bg);
 }
 if(viewportName&&mode==='choose'){
  await page.screenshot({path:`${ARTIFACTS}/${viewportName}-wrong-red.png`,fullPage:true});
 }
}

const b=await chromium.launch({args:['--no-sandbox']});
try{
 // Desktop + mobile choose/listen/usage + reset on next & repair
 for(const vp of [{name:'desktop',width:1280,height:844},{name:'mobile',width:390,height:844}]){
  const p=await b.newPage({viewport:{width:vp.width,height:vp.height}});
  await p.route('**/api/my-words?*',r=>r.fulfill({json:{words,cacheOnly:true}}));
  await p.route('**/api/game-memory',r=>r.fulfill({json:r.request().method()==='GET'?{memory:{}}:{word:'mitigate',debt:3,mistakes:1}}));
  await p.goto(`${BASE}/games?source=my-words&week=2026-10-26`);
  await p.getByRole('button',{name:'Bắt đầu chuyến đi'}).click();

  // Q1 choose -> wrong selection -> check red/teal/neutral -> enter repair -> verify reset -> finish repair -> next question
  const chooseOrder=[await p.locator('section h1').innerText()];
  await checkState(p,'choose',vp.name);
  await p.getByRole('button',{name:'Luyện lại từ này · 5 lượt'}).click();
  await p.locator('[data-repair-round]').waitFor();
  assert.equal(await p.locator('[data-choice-state]').count(),0,'repair must clear choice states');
  await p.getByRole('button',{name:'Tạm bỏ qua phần luyện'}).click();
  await p.getByRole('button',{name:'Tiếp tục'}).click();

  // Advance through remaining choose, then listen, verify listen wrong red & reset on next, skip repair
  let seenListen=false,seenUsage=false,steps=0;
  while(await p.getByRole('button',{name:'Chơi lại với thứ tự mới'}).count()===0){
   assert(++steps<=25,'exceeded expected deck steps');
   const badge=await p.locator('.quest-card > span').first().innerText();
   if(/KHỞI ĐỘNG/i.test(badge)){
    const w=await p.locator('section h1').innerText();
    if(!chooseOrder.includes(w))chooseOrder.push(w);
   }
   if(/NGHE ĐOÁN NGHĨA/i.test(badge)&&!seenListen){
    seenListen=true;
    const btns=p.locator('section .grid button');
    assert.equal(await btns.locator('[data-choice-state]').count(),0,'next must reset choice state');
    const targetWord=words.find(w=>w.word===chooseOrder[0]);
    const texts=await btns.allInnerTexts();
    const wrongIdx=texts.findIndex(t=>t!==targetWord.meaning);
    assert(wrongIdx>=0,'listen: no wrong option found');
    await btns.nth(wrongIdx).click();
    await btns.nth(wrongIdx).hover();
    await p.getByRole('status').waitFor();
    const states=await btns.evaluateAll(els=>els.map(e=>({text:e.textContent,state:e.dataset.choiceState,bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor,disabled:e.disabled,className:e.className})));
    assert(states.every(s=>s.disabled));
    const wb=states.find(s=>s.state==='wrong'),cb=states.find(s=>s.state==='correct'),ns=states.filter(s=>s.state==='neutral');
    assert(wb&&cb&&ns.length===states.length-2);
    assert(wb.text.includes('✕')&&wb.text.includes('Sai'));
    assert(cb.text.includes('✓')&&cb.text.includes('Đúng'));
    const [wr,wg,wbB]=wb.border.match(/\d+/g).slice(0,3).map(Number);
    assert(wr>wg+40&&wr>wbB+40,`listen wrong not red (${wb.border})`);
    const [cr,cg,cbB]=cb.border.match(/\d+/g).slice(0,3).map(Number);
    assert(cg>cr+40&&cbB>cr+30,`listen correct not teal (${cb.border})`);
    for(const n of ns){assert(!n.className.includes('red')&&!n.className.includes('teal'));}
    await p.getByRole('button',{name:'Luyện lại từ này · 5 lượt'}).click();
    await p.getByRole('button',{name:'Tạm bỏ qua phần luyện'}).click();
    await p.getByRole('button',{name:/^(Tiếp tục|Xem kết quả)$/}).click();
    continue;
   }
   if(/DÙNG TRONG THỰC TẾ/i.test(badge)&&!seenUsage){
    seenUsage=true;
    await checkState(p,'usage',null);
    await p.getByRole('button',{name:'Luyện lại từ này · 5 lượt'}).click();
    await p.getByRole('button',{name:'Tạm bỏ qua phần luyện'}).click();
    await p.getByRole('button',{name:/^(Tiếp tục|Xem kết quả)$/}).click();
    continue;
   }
   if(await p.locator('#game-answer').count()){
    const m=await p.locator('section h1').innerText();
    await p.locator('#game-answer').fill(words.find(w=>w.meaning===m).word);
    await p.getByRole('button',{name:'Kiểm tra',exact:true}).click();
   }else{
    await p.locator('section .grid button').first().click();
    await p.getByRole('status').waitFor();
    if(await p.getByRole('button',{name:'Luyện lại từ này · 5 lượt'}).count()){
     await p.getByRole('button',{name:'Luyện lại từ này · 5 lượt'}).click();
     await p.getByRole('button',{name:'Tạm bỏ qua phần luyện'}).click();
    }
   }
   await p.getByRole('button',{name:/^(Tiếp tục|Xem kết quả)$/}).click();
  }
  assert(seenListen,'did not exercise listen wrong selection');
  assert(seenUsage,'did not exercise usage wrong selection');
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${vp.name}: horizontal overflow`);
  console.log(`PASS ${vp.name}: choose/listen/usage wrong=red, correct=teal, others=neutral, disabled, reset on next/repair, screenshot saved`);
  await p.close();
 }
}finally{await b.close();}
