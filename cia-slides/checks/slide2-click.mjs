import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.BASE_URL||'http://127.0.0.1:8283';
const shotDir='/root/.openclaw/workspace-nim/artifacts';
await fs.mkdir(shotDir,{recursive:true});

const b=await chromium.launch({args:['--no-sandbox']});
const passed=[];
try{
 const configs=[
  {name:'desktop-en-default',lang:'en',width:1366,height:768,tap:false,reduced:false,shot:true},
  {name:'desktop-vi-default',lang:'vi',width:1366,height:768,tap:false,reduced:false,shot:false},
  {name:'mobile-en-reduced',lang:'en',width:390,height:844,tap:true,reduced:true,shot:false},
  {name:'mobile-vi-default',lang:'vi',width:390,height:844,tap:true,reduced:false,shot:false},
 ];

 for(const cfg of configs){
  const ctx=await b.newContext({
   viewport:{width:cfg.width,height:cfg.height},
   hasTouch:cfg.tap,
   isMobile:cfg.tap,
   reducedMotion:cfg.reduced?'reduce':'no-preference',
  });
  const p=await ctx.newPage();
  const writes=[];
  p.on('request',req=>{
   if(/notes/i.test(req.url())&&!['GET','HEAD','OPTIONS'].includes(req.method())){
    writes.push(`${req.method()} ${req.url()}`);
   }
  });

  const tapOrClick=async(x,y)=>{
   if(cfg.tap)await p.touchscreen.tap(x,y);
   else await p.mouse.click(x,y);
  };
  const actLoc=async(loc)=>{
   const box=await loc.boundingBox();
   assert(box,`${cfg.name}: missing boundingBox`);
   const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
   if(cfg.tap)await p.touchscreen.tap(x,y);
   else await p.mouse.click(x,y);
  };
  const prevBtn=()=>p.locator('button[aria-label="Previous page"], button[aria-label*="trước" i], button[aria-label*="Previous" i]').first();
  const nextBtn=()=>p.locator('button[aria-label="Next page"], button[aria-label*="sau" i], button[aria-label*="tiếp" i], button[aria-label*="Next" i]').first();
  const pressBtn=async(loc)=>{
   await loc.waitFor({state:'visible',timeout:8000});
   if(cfg.tap)await loc.tap();else await loc.click();
  };
  const hash=()=>new URL(p.url()).hash;
  const waitReady=async()=>{
   await p.locator('.slide-transition[aria-busy=false]').waitFor({timeout:8000});
  };
  const nonInteractivePoint=async(selector)=>{
   const pt=await p.evaluate(sel=>{
    const root=document.querySelector(sel);
    if(!root)return null;
    const candidates=[...root.querySelectorAll('h1,h2,h3,p,span,div'),root];
    for(const el of candidates){
     if(el.closest('button,a,[role=button],input,textarea,select'))continue;
     const r=el.getBoundingClientRect();
     if(r.width<20||r.height<12)continue;
     const x=Math.round(r.left+Math.min(r.width/2,40));
     const y=Math.round(r.top+Math.min(r.height/2,20));
     if(x<0||y<0||x>=window.innerWidth||y>=window.innerHeight)continue;
     const hit=document.elementFromPoint(x,y);
     if(hit&&root.contains(hit)&&!hit.closest('button,a,[role=button],input,textarea,select'))return{x,y,tag:hit.tagName};
    }
    return null;
   },selector);
   assert(pt,`${cfg.name}: no clickable noninteractive point in ${selector}`);
   return pt;
  };
  const outerBgPoint=async()=>{
   const pt=await p.evaluate(()=>{
    const pres=document.querySelector('.presentation');
    if(!pres)return null;
    const r=pres.getBoundingClientRect();
    const coords=[
     [Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)],
     [Math.round(r.left+40),Math.round(r.top+120)],
     [Math.round(r.right-40),Math.round(r.top+120)],
     [Math.round(r.left+12),Math.round(r.top+r.height/2)],
     [Math.round(r.right-12),Math.round(r.top+r.height/2)],
     [Math.round(r.left+r.width/2),Math.round(r.bottom-80)],
    ];
    for(const [x,y] of coords){
     const hit=document.elementFromPoint(x,y);
     if(hit&&pres.contains(hit)&&!hit.closest('button,a,[role=button],input,textarea,select'))return{x,y};
    }
    return null;
   });
   assert(pt,`${cfg.name}: no clickable background point`);
   return pt;
  };

  await p.addInitScript(l=>{
   if(!sessionStorage.getItem('__lang_init')){
    localStorage.setItem('deck-language',l);
    sessionStorage.setItem('__lang_init','1');
   }
  },cfg.lang);
  await p.goto(`${base}/#2`);
  await p.locator('.nim-intro').waitFor();
  await waitReady();
  assert.equal(hash(),'#2',`${cfg.name}: expected #2 on load`);

  // 1. Notes popup opens /notes#2, original stays #2, no PUT Notes
  const [popup]=await Promise.all([
   ctx.waitForEvent('page'),
   actLoc(p.locator('a.demo-link')),
  ]);
  await popup.waitForLoadState('domcontentloaded');
  assert(new URL(popup.url()).pathname.endsWith('/notes')&&new URL(popup.url()).hash==='#2',`${cfg.name}: notes popup url ${popup.url()}`);
  await popup.close();
  await p.bringToFront();
  await p.waitForTimeout(150);
  assert.equal(hash(),'#2',`${cfg.name}: original moved from #2 after Notes click`);

  // 2. Language switch stays #2
  const langBtn=p.locator('button.deck-language');
  const beforeAria=await langBtn.getAttribute('aria-label');
  const beforeLang=await p.evaluate(()=>localStorage.getItem('deck-language'));
  const beforeUrl=p.url();
  await actLoc(langBtn);
  await p.waitForTimeout(300);
  await waitReady();
  const afterAria=await langBtn.getAttribute('aria-label');
  const afterLang=await p.evaluate(()=>localStorage.getItem('deck-language'));
  assert(afterLang!==beforeLang||afterAria!==beforeAria||p.url()!==beforeUrl,`${cfg.name}: language did not toggle (lang ${beforeLang}->${afterLang}, aria ${beforeAria}->${afterAria}, url ${beforeUrl}->${p.url()})`);
  assert.equal(hash(),'#2',`${cfg.name}: language switch moved from #2`);
  await actLoc(langBtn);
  await p.waitForTimeout(300);
  await waitReady();
  assert.equal(hash(),'#2',`${cfg.name}: language restore moved from #2`);

  // 3. Previous button goes #1 (not #3)
  await pressBtn(prevBtn());
  await p.waitForFunction(()=>location.hash==='#1',null,{timeout:8000});
  await waitReady();
  assert.equal(hash(),'#1',`${cfg.name}: Previous button did not go #1`);

  // 4. Return #2 via Next button, then click .nim-intro noninteractive text/bg -> #3 + .nim-company + guard double click during morph
  await p.locator('.slide-transition[aria-busy=false]').waitFor({timeout:8000});
  await p.waitForFunction(()=>location.hash==='#1',null,{timeout:4000});
  await pressBtn(nextBtn());
  await p.waitForFunction(()=>location.hash==='#2',null,{timeout:8000});
  await p.locator('.nim-intro').waitFor();
  await waitReady();
  assert.equal(hash(),'#2',`${cfg.name}: Next from #1 did not return #2`);

  const pt=cfg.tap?await outerBgPoint():await nonInteractivePoint('.nim-intro');
  await tapOrClick(pt.x,pt.y);
  // Test transition guard during morph: dispatch second click on root immediately
  await p.evaluate(()=>{
   const root=document.querySelector('.nim-intro')||document.querySelector('.presentation');
   root?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
  });
  await p.waitForFunction(()=>location.hash==='#3',null,{timeout:8000});
  await p.locator('.nim-company').waitFor({timeout:8000});
  await waitReady();
  await p.waitForTimeout(400);
  assert.equal(hash(),'#3',`${cfg.name}: expected #3 (not #4) after advance + guard click`);

  if(cfg.shot){
   await p.screenshot({path:`${shotDir}/slide2-click-desktop.png`});
  }

  // 5. Repeated background click on #3 stays #3
  const bg3=await outerBgPoint();
  await tapOrClick(bg3.x,bg3.y);
  await p.waitForTimeout(250);
  await waitReady();
  assert.equal(hash(),'#3',`${cfg.name}: background click on #3 changed slide`);

  // 6. ArrowLeft -> #2, Next -> #3 preserved
  await p.keyboard.press('ArrowLeft');
  await p.waitForFunction(()=>location.hash==='#2',null,{timeout:8000});
  await p.locator('.nim-intro').waitFor({timeout:8000});
  await waitReady();
  assert.equal(hash(),'#2',`${cfg.name}: ArrowLeft from #3 did not go #2`);

  await pressBtn(nextBtn());
  await p.waitForFunction(()=>location.hash==='#3',null,{timeout:8000});
  await p.locator('.nim-company').waitFor({timeout:8000});
  await waitReady();
  assert.equal(hash(),'#3',`${cfg.name}: Next from #2 did not go #3`);

  assert.equal(writes.length,0,`${cfg.name}: unexpected notes API writes: ${writes.join(', ')}`);
  passed.push(cfg.name);
  await ctx.close();
 }
 console.log(`PASS (${passed.length}): ${passed.join(', ')}`);
}finally{
 await b.close();
}
process.exit(0);
