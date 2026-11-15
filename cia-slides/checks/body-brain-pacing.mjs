import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8283';
// Boundary steps: [ms, required classes, absent classes]
const steps=[
 [6300,[],['connected']],
 [400,['connected'],['model-picker-open']],
 [3000,['model-picker-open'],['linked']],
 [2500,['linked'],['scene-1']],
 [6000,['scene-1'],['scene-3']],
 [2500,['scene-3'],['scene-2']],
 [1300,['scene-2'],['scene-4']],
 [12500,['scene-4','scene-2'],['branded']],
 [5000,['branded'],['agent-step-1']],
 [17000,['agent-step-1'],['agent-step-2']],
 [4000,['agent-step-2'],['agent-step-3']],
 [8500,['agent-step-3'],['comparison']]
];

const hasCls=(cls,c)=>cls.split(/\s+/).includes(c);

async function assertPreComparisonHidden(p,label){
 const state=await p.evaluate(()=>({
  leftVis:getComputedStyle(document.querySelector('.comparison-left')).visibility,
  leftOp:Number(getComputedStyle(document.querySelector('.comparison-left')).opacity),
  rightVis:getComputedStyle(document.querySelector('.comparison-right')).visibility,
  rightOp:Number(getComputedStyle(document.querySelector('.comparison-right')).opacity),
  seatedOp:Number(getComputedStyle(document.querySelector('.seated-ai')).opacity)
 }));
 assert.equal(state.leftVis,'hidden',`${label} left should be hidden`);
 assert.equal(state.leftOp,0,`${label} left opacity should be 0`);
 assert.equal(state.rightVis,'hidden',`${label} right should be hidden`);
 assert.equal(state.rightOp,0,`${label} right opacity should be 0`);
 assert.equal(state.seatedOp,0,`${label} seated-ai opacity should be 0`);
}

async function runSequence(p,slide,width,lang,reduced,checkBuffering){
 const label=`${lang} ${width} reduced=${reduced}`;
 if(checkBuffering){
  const box=await p.locator('.presentation').boundingBox();
  if(width===390)await p.touchscreen.tap(box.x+8,box.y+8);
  else await p.mouse.click(box.x+8,box.y+8);
 }
 for(const [dt,has,lacks] of steps){
  await p.clock.runFor(dt);
  const cls=await slide.getAttribute('class');
  for(const c of has)assert.ok(hasCls(cls,c),`${label} missing ${c} in "${cls}"`);
  for(const c of lacks)assert.ok(!hasCls(cls,c),`${label} unexpected ${c} in "${cls}"`);
 }
 await p.clock.runFor(15000);
 assert.ok(!hasCls(await slide.getAttribute('class'),'comparison'),`${label} comparison appeared without click`);
 await assertPreComparisonHidden(p,label);

 await p.locator('.web-model-chip').dispatchEvent('click');
 await p.clock.runFor(200);
 assert.ok(!hasCls(await slide.getAttribute('class'),'comparison'),`${label} control click revealed comparison`);

 const box=await p.locator('.presentation').boundingBox();
 assert.ok(box,`${label} missing .presentation box`);
 const x=box.x+8,y=box.y+8;
 if(width===390)await p.touchscreen.tap(x,y);
 else await p.mouse.click(x,y);
 await p.clock.runFor(100);
 assert.ok(hasCls(await slide.getAttribute('class'),'comparison'),`${label} background click did not reveal comparison`);

 await p.clock.runFor(15000);
 const done=await p.evaluate(()=>({
  leftVis:getComputedStyle(document.querySelector('.comparison-left')).visibility,
  leftOp:Number(getComputedStyle(document.querySelector('.comparison-left')).opacity),
  rightVis:getComputedStyle(document.querySelector('.comparison-right')).visibility,
  rightOp:Number(getComputedStyle(document.querySelector('.comparison-right')).opacity),
  seatedOp:Number(getComputedStyle(document.querySelector('.seated-ai')).opacity),
  chatText:document.querySelector('.comparison-left')?.textContent||''
 }));
 assert.equal(done.leftVis,'visible',`${label} left not visible`);
 assert.equal(done.rightVis,'visible',`${label} right not visible`);
 assert.ok(done.leftOp>0.9,`${label} left opacity=${done.leftOp}`);
 assert.ok(done.rightOp>0.9,`${label} right opacity=${done.rightOp}`);
 assert.ok(done.seatedOp>0.9,`${label} seated-ai opacity=${done.seatedOp}`);
 assert.ok(!done.chatText.includes('▎'),`${label} chat still typing: ${done.chatText}`);
 assert.ok(done.chatText.includes(lang==='en'?'study plan':'học'),`${label} chat missing complete text: ${done.chatText}`);

 if(width===390)await p.touchscreen.tap(x,y);
 else await p.mouse.click(x,y);
 await p.clock.runFor(100);
 assert.ok(hasCls(await slide.getAttribute('class'),'comparison'),`${label} repeated click cleared comparison`);
 assert.ok(!((await p.locator('.comparison-left').textContent())||'').includes('▎'),`${label} repeated click reset chat typing`);
}

const b=await chromium.launch({args:['--no-sandbox']});
try{
 for(const [width,lang,reduced] of [[1440,'en',false],[1440,'vi',false],[390,'en',false],[390,'vi',true]]){
  const p=await b.newPage({viewport:{width,height:width===390?844:900},hasTouch:width===390,reducedMotion:reduced?'reduce':'no-preference'});
  await p.clock.install({time:0});
  await p.clock.pauseAt(0);
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${baseUrl}/#7`);
  await p.clock.runFor(50);
  const slide=p.locator('.web-body-slide');
  await slide.waitFor();
  await p.clock.runFor(50);
  await runSequence(p,slide,width,lang,reduced,true);

  await p.getByRole('button',{name:lang==='en'?'Replay':'Phát lại',exact:true}).click();
  await p.clock.runFor(50);
  await p.evaluate(()=>document.querySelectorAll('.comparison-left,.comparison-right,.seated-ai').forEach(el=>el.getAnimations().forEach(a=>a.finish())));
  const reset=await slide.getAttribute('class');
  for(const c of ['connected','model-picker-open','linked','branded','comparison','scene-1','scene-2','scene-3','scene-4','agent-step-1','agent-step-2','agent-step-3'])
   assert.ok(!hasCls(reset,c),`${lang} ${width} Replay failed to clear ${c}`);

  await runSequence(p,slide,width,lang,reduced,false);
  await p.close();
 }
}finally{
 await b.close();
}
console.log('PASS WebBodySlide (#7) pacing boundaries, click-gated comparison, Replay + 2nd run, EN/VI, desktop/phone, reduced-motion');
