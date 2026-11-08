import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const [w,h,lang,reduced] of [[1366,768,'en',false],[1366,768,'vi',false],[390,844,'en',false],[1366,768,'en',true]]){
const p=await b.newPage({viewport:{width:w,height:h},reducedMotion:reduced?'reduce':'no-preference'});
await p.addInitScript(l=>localStorage.setItem('deck-language',l),lang);
await p.goto(`${process.env.BASE_URL||'http://localhost:8284'}/#11`);await p.locator('.bento-ready').waitFor();
const st=()=>p.evaluate(()=>{const c=document.querySelector('.listening-model');const cur=c.querySelector('.is-current strong').innerText;const y=getComputedStyle(c.querySelector('.listening-model-track')).transform;const play=c.querySelector('.listening-model-play');return{cur,y,cls:play.className,time:c.querySelector('.listening-model-time span').innerText,hint:c.querySelector('.listening-model-hint').innerText}});
const first=await st();
if(!reduced){assert.match(first.cls,/is-playing/);assert.match(first.cur,/mother/);
await p.waitForTimeout(3200);const mid=await st();assert.notEqual(mid.cur,first.cur);assert.match(mid.cls,/is-playing/);
await p.locator('.bento-listening').screenshot({path:`/root/.openclaw/workspace-nim/media/listen-mid-${w}-${lang}.png`});}
await p.waitForTimeout(reduced?500:5500);const end=await st();
assert.match(end.cls,/is-paused/);assert.match(end.cur,/balance/);assert.equal(end.time,'0:22');
assert.equal(await p.locator('.listening-model-play svg').count(),1);
assert.ok(await p.locator('.bento-listening').evaluate(t=>t.scrollHeight<=t.clientHeight+1&&t.scrollWidth<=t.clientWidth+1));
await p.locator('.bento-listening').screenshot({path:`/root/.openclaw/workspace-nim/media/listen-end-${w}-${lang}.png`});
await p.close();console.log('PASS',w,lang,reduced,JSON.stringify(end));}}finally{await b.close()}
