import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const b=await chromium.launch({args:['--no-sandbox']});
try {for(const width of [1440,390]) {
 const p=await b.newPage({viewport:{width,height:950}});
 await p.addInitScript(()=>localStorage.setItem('english-theme','light'));
 // Browser-only fixtures. No production data read or changed, no AI calls.
 await p.route('**/api/session?*',r=>r.fulfill({json:{session:{listening:{title:'Listening contrast review',sentences:[{en:"I’m here to report on our experiment at the festival last month.",vi:'Tôi ở đây để báo cáo thử nghiệm tại lễ hội tháng trước.'},{en:'The next sentence must remain readable.',vi:'Câu tiếp theo vẫn cần đọc rõ.'}]}}}}));
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:8262');await p.locator('#theme-switch').waitFor();
 await p.getByRole('navigation',{name:'Chọn kỹ năng'}).getByRole('button',{name:/Listening/}).click();
 const line=p.locator('[data-testid="listening-lyrics"] button').first();await line.waitFor();await p.waitForTimeout(800);
 // Simulate the exact active class emitted after audio is ready, without generating audio.
 await line.evaluate(e=>{e.classList.remove('text-slate-500');e.classList.add('text-white');e.setAttribute('aria-current','true');e.style.transition='none'});
 assert.equal(await line.evaluate(e=>getComputedStyle(e).color),'rgb(28, 28, 30)');
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/english-contrast-21576-${width}-transcript.png`,fullPage:true});
 await p.locator('#lesson-chat-toggle').click();await p.waitForTimeout(500);
 const input=p.locator('#lesson-chat-panel textarea');await input.fill('Review contrast');assert.equal(await input.evaluate(e=>getComputedStyle(e).color),'rgb(28, 28, 30)');
 await p.screenshot({path:`/root/.openclaw/workspace-nim/media/english-contrast-21576-${width}-chat.png`});
 // Audit every emitted Tailwind foreground/background pair, including latent content.
 const failures=await p.evaluate(()=>{
 const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number), lum=c=>c.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
 const host=document.createElement('div');document.body.append(host);const failures=[];
 for(const bg of ['bg-slate-950','bg-slate-900','bg-slate-800','bg-blue-900/60','bg-teal-950/50','bg-red-950','bg-emerald-950/40'])for(const fg of ['text-white','text-slate-100','text-slate-200','text-slate-300','text-slate-400','text-slate-500','text-slate-600']){host.className=bg+' '+fg;const s=getComputedStyle(host),c=rgb(s.color),back=rgb(s.backgroundColor);const alpha=Number(s.backgroundColor.match(/[\d.]+/g)[3]??1),base=[245,245,247];const effective=back.map((v,i)=>v*alpha+base[i]*(1-alpha));const ratio=(Math.max(lum(c),lum(effective))+.05)/(Math.min(lum(c),lum(effective))+.05);if(ratio<4.5)failures.push({bg,fg,ratio});}
 host.remove();return failures;
 });assert.deepEqual(failures,[]);
 console.log('PASS populated transcript, chat input, 49 light color pairs',width);await p.close();
}} finally{await b.close()}
