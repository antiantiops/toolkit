import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8283';
// Boundary steps: [ms, required classes, absent classes]
const steps=[
 [7800,[],['connected']],
 [400,['connected'],['model-picker-open']],
 [3900,['model-picker-open'],['linked']],
 [3000,['linked'],['scene-1']],
 [11000,['scene-1'],['scene-3']],
 [8000,['scene-3'],['scene-2']],
 [1600,['scene-2'],['scene-4']],
 [12500,['scene-4','scene-2'],['branded']],
 [5000,['branded'],['agent-step-1']],
 [17000,['agent-step-1'],['agent-step-2']],
 [4000,['agent-step-2'],['agent-step-3']],
 [8500,['agent-step-3'],['comparison']],
 [7500,['comparison'],[]]
];

const b=await chromium.launch({args:['--no-sandbox']});
try{
 for(const [width,lang,reduced] of [[1440,'en',false],[1440,'vi',false],[390,'en',false],[390,'vi',true]]){
  const p=await b.newPage({viewport:{width,height:width===390?844:900},reducedMotion:reduced?'reduce':'no-preference'});
  await p.clock.install({time:0});
  await p.clock.pauseAt(0);
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${baseUrl}/#7`);
  await p.clock.runFor(50);
  const slide=p.locator('.web-body-slide');
  await slide.waitFor();
  await p.clock.runFor(50);
  for(const [dt,has,lacks] of steps){
   await p.clock.runFor(dt);
   const cls=await slide.getAttribute('class');
   for(const c of has)assert.ok(cls.split(/\s+/).includes(c),`${lang} ${width} reduced=${reduced} missing ${c} in "${cls}"`);
   for(const c of lacks)assert.ok(!cls.split(/\s+/).includes(c),`${lang} ${width} reduced=${reduced} unexpected ${c} in "${cls}"`);
  }
  await p.getByRole('button',{name:lang==='en'?'Replay':'Phát lại',exact:true}).click();
  await p.clock.runFor(50);
  const reset=await slide.getAttribute('class');
  for(const c of ['connected','model-picker-open','linked','branded','comparison','scene-1','scene-2','scene-3','scene-4','agent-step-1','agent-step-2','agent-step-3'])
   assert.ok(!reset.split(/\s+/).includes(c),`${lang} ${width} Replay failed to clear ${c}`);
  await p.close();
 }
}finally{
 await b.close();
}
console.log('PASS WebBodySlide (#7) pacing boundaries, Replay reset, EN/VI, desktop/phone, reduced-motion');
