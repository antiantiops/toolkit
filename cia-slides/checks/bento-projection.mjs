import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{
 for(const [width,height] of [[1366,768],[390,844]])for(const lang of ['en','vi']){
  const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
  await p.goto(`${process.env.BASE_URL||'http://localhost:8282'}/#11`);
  await p.locator('.bento-ready').waitFor();
  await p.waitForTimeout(2300);
  const style=await p.evaluate(()=>{
   const pres=getComputedStyle(document.querySelector('.presentation'));
   const tile=getComputedStyle(document.querySelector('.bento-tile'));
   const h1=getComputedStyle(document.querySelector('.bento-heading h1'));
   const h2=getComputedStyle(document.querySelector('.bento-tile h2'));
   const lm=document.querySelector('.listening-model');
   const t=lm.querySelector('.listening-model-transcript');
   const pl=lm.querySelector('.listening-model-player');
   return {
    bg:pres.backgroundColor,
    radius:tile.borderRadius,
    overflow:tile.overflow,
    border:tile.borderTopColor,
    shadow:tile.boxShadow,
    h1Color:h1.color,
    h2Color:h2.color,
    unifiedGap:Math.abs(pl.offsetTop-(t.offsetTop+t.offsetHeight)),
    matrix:getComputedStyle(lm).transform.startsWith('matrix3d')
   };
  });
  assert.equal(style.bg,'rgb(15, 23, 42)');
  assert.equal(style.radius,'28px');
  assert.equal(style.overflow,'hidden');
  assert.equal(style.h1Color,'rgb(255, 255, 255)');
  assert.equal(await p.locator('.bento-heading em').evaluate(e=>getComputedStyle(e).color),'rgb(192, 132, 252)');
  assert.match(style.shadow,/rgb\(203, 213, 225\) 0px 4px/);
  for(const sel of ['.listening-model','.coach-scene','.grammar-board','.bento-real-home','.words-image-frame']){const c=await p.locator(sel).evaluate(e=>getComputedStyle(e));assert.equal(c.borderTopColor,'rgb(226, 232, 240)');assert.match(c.boxShadow,/rgba\(0, 0, 0, 0.25\) 0px 12px 24px/);}
  assert.equal(style.h2Color,'rgb(29, 29, 31)');
  assert.ok(style.unifiedGap<2,`unifiedGap ${style.unifiedGap}`);
  assert.ok(style.matrix);
  await p.screenshot({path:`/root/.openclaw/workspace-nim/media/bento-projection-${width}-${lang}.png`});
  await p.locator('.bento-listening').screenshot({path:`/root/.openclaw/workspace-nim/media/bento-projection-detail-${width}-${lang}.png`});
  await p.close();
 }
 console.log('PASS Bento auditorium contrast checks EN/VI desktop/phone');
}finally{await b.close();}
