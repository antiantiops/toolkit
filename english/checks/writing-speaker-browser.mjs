import {chromium} from '/usr/local/lib/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const text='His financial analysis is always accurate, and he is very popular among his colleagues.';
const b=await chromium.launch({args:['--no-sandbox']});
try{for(const width of [1440,390]){
 const p=await b.newPage({viewport:{width,height:900}});let payload;
 await p.route('**/api/**',r=>{const u=new URL(r.request().url());let data={};
 if(u.pathname==='/api/session')data=u.searchParams.get('type')==='manifest'?{available:{writing:true}}:{session:{writing:{kind:'sample',title:'Speaker regression',sections:[{label:'Body',sentences:[{english:text,vietnamese:'Bản dịch',why:'Giải thích'}]}],task:null}}};
 if(u.pathname==='/api/feature-notices')data={show:false};
 if(u.pathname==='/api/tts'){payload=r.request().postDataJSON();return r.fulfill({status:400,json:{error:'Fixture diagnostic',requestId:'fixture-request-id'}});}
 return r.fulfill({json:data});});
 await p.goto(process.env.TEST_URL||'http://192.168.101.36:8085');await p.getByRole('navigation',{name:'Chọn kỹ năng'}).getByRole('button',{name:/Writing/}).click();await p.getByText(text,{exact:true}).first().waitFor();
 const btn=p.locator('button').filter({hasText:'🔊'});await btn.first().click();await p.getByRole('alert').filter({hasText:'fixture-request-id'}).waitFor();assert.equal(payload.text,text);assert.equal(typeof payload.text,'string');assert.equal(payload.lang,'en-US');console.log('PASS Writing speaker plain-text request and visible HTTP/requestId',width);await p.close();
}}finally{await b.close()}
